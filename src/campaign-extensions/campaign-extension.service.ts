import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectDataSource, InjectRepository } from "@nestjs/typeorm";
import { DataSource, EntityManager, In, Repository } from "typeorm";
import { Campaign } from "src/campaigns/entities/campaign.entity";
import { Ad } from "src/ads/entities/ad.entity";
import { AdvertiserService } from "src/advertisers/advertiser.service";
import { PointsService } from "src/points/points.service";
import { NotificationService } from "src/notifications/notification.service";
import type { CurrentUserPayload } from "src/auth/current-user.decorator";
import { CampaignExtension, EXTENSION_STATUSES, type ExtensionStatus } from "./entities/campaign-extension.entity";
import { MAX_RUN_DAYS, addDays, assertQuantity, dateOnly, daysInclusive } from "src/ad-packages/package-pricing";

/** Campaigns that can be extended. Expired ones restart on approval; there's no time limit. */
const EXTENDABLE_STATUSES = ['active', 'paused', 'expired'];
/** Ledger referenceType for an extension's spend and refund, so they never mix with the campaign's own payment. */
export const EXTENSION_LEDGER_REFERENCE = 'campaign_extension';

export interface ExtensionQuote {
    campaignId: string;
    previousEndDate: string;
    startDate: string;
    newEndDate: string;
    days: number;
    /** Units of the campaign's package being bought. */
    quantity: number;
    packageName: string;
    /** Days and points per unit, from the campaign's own copy of its package. */
    unitDays: number;
    unitPrice: number;
    amount: number;
    payerName: string;
    balance: number;
}

@Injectable()
export class CampaignExtensionService {
    constructor(
        @InjectRepository(CampaignExtension)
        private readonly extensionRepository: Repository<CampaignExtension>,
        private readonly advertiserService: AdvertiserService,
        private readonly pointsService: PointsService,
        private readonly notificationService: NotificationService,
        @InjectDataSource()
        private readonly dataSource: DataSource,
    ) {}

    /** The campaign, if this user may see and extend it: its owner, their agency, or an admin. */
    private async accessibleCampaign(manager: EntityManager, campaignId: string, user: CurrentUserPayload, lock = false): Promise<Campaign> {
        const campaign = await manager.findOne(Campaign, {
            where: { id: campaignId },
            ...(lock ? { lock: { mode: 'pessimistic_write' as const } } : {}),
        });
        if (!campaign) throw new NotFoundException('Campaign not found');
        if (!(await this.advertiserService.canAccessAdvertiser(user, campaign.advertiserId))) {
            throw new ForbiddenException('You do not have permission to access this campaign');
        }
        return campaign;
    }

    /**
     * Validates an extension and prices it: more units of the campaign's own package, at the price it
     * was bought for. Used for the preview, and again under a row lock when requesting.
     */
    private async price(manager: EntityManager, campaign: Campaign, quantity: number) {
        if (!EXTENDABLE_STATUSES.includes(campaign.status)) {
            throw new BadRequestException('Only active, paused or expired campaigns can be extended');
        }
        assertQuantity(quantity);
        const pending = await manager.exists(CampaignExtension, { where: { campaignId: campaign.id, status: 'pending' } });
        if (pending) {
            throw new BadRequestException('This campaign already has an extension waiting for review');
        }

        const previousEndDate = dateOnly(campaign.endDate);
        const today = dateOnly(new Date());
        const dayAfterEnd = addDays(previousEndDate, 1);
        // Expired campaigns restart today, so the days they sat expired aren't charged.
        const startDate = dayAfterEnd > today ? dayAfterEnd : today;

        const unitDays = Number(campaign.packageDays);
        const unitPrice = Number(campaign.packagePrice);
        const days = unitDays * quantity;
        const newEndDate = addDays(startDate, days - 1);
        if (daysInclusive(dateOnly(campaign.startDate), newEndDate) > MAX_RUN_DAYS) {
            throw new BadRequestException(`A campaign can run for at most ${MAX_RUN_DAYS} days`);
        }
        return {
            previousEndDate, startDate, newEndDate, days, quantity,
            packageName: campaign.packageName, unitDays, unitPrice, amount: unitPrice * quantity,
        };
    }

    async quote(campaignId: string, quantity: number, user: CurrentUserPayload): Promise<ExtensionQuote> {
        const manager = this.dataSource.manager;
        const campaign = await this.accessibleCampaign(manager, campaignId, user);
        const priced = await this.price(manager, campaign, quantity);
        // The agency pays for its clients.
        const payer = await this.pointsService.assertWalletOwner(await this.advertiserService.resolvePayerId(campaign.advertiserId));
        return { campaignId, ...priced, payerName: payer.name, balance: payer.pointsBalance };
    }

    /** Charges the extension and holds it for review. An admin's own request is approved at once. */
    async request(campaignId: string, quantity: number, user: CurrentUserPayload): Promise<CampaignExtension> {
        const { extension, campaign } = await this.dataSource.transaction(async (manager) => {
            // Row lock: two quick requests can't both pass the "one pending extension" check.
            const locked = await this.accessibleCampaign(manager, campaignId, user, true);
            const priced = await this.price(manager, locked, quantity);

            const created = await manager.save(manager.create(CampaignExtension, {
                campaignId,
                startDate: priced.startDate,
                previousEndDate: priced.previousEndDate,
                newEndDate: priced.newEndDate,
                quantity: priced.quantity,
                days: priced.days,
                amount: priced.amount,
                status: 'pending',
                requestedById: user.id,
                requestedByRole: user.role,
            }));

            const payerId = await this.advertiserService.resolvePayerId(locked.advertiserId);
            await this.pointsService.debit(manager, payerId, priced.amount, 'spend', {
                referenceType: EXTENSION_LEDGER_REFERENCE,
                referenceId: created.id,
                note: `Extension: ${locked.name} to ${priced.newEndDate}`,
            });

            if (user.role === 'admin') {
                await this.applyApproval(manager, created, locked, user.id);
            }
            return { extension: created, campaign: locked };
        });

        await this.notificationService.createNotification({
            advertiserId: campaign.advertiserId,
            title: extension.status === 'approved' ? 'Campaign extended' : 'Extension submitted',
            message: extension.status === 'approved'
                ? `${campaign.name} now runs until ${extension.newEndDate}.`
                : `Your extension of ${campaign.name} to ${extension.newEndDate} is under review.`,
        });
        return extension;
    }

    /**
     * Moves the end date, adds the units and amount to the package and total, and restarts an expired campaign.
     * Objectives are untouched: their targets stay, their deadline moves with the end date.
     */
    private async applyApproval(manager: EntityManager, extension: CampaignExtension, campaign: Campaign, adminId: string) {
        campaign.endDate = new Date(`${extension.newEndDate}T00:00:00`);
        campaign.packageQuantity = Number(campaign.packageQuantity) + extension.quantity;
        campaign.planCost = Number(campaign.planCost) + extension.amount;
        campaign.totalBudget = Number(campaign.totalBudget) + extension.amount;
        // It may also have expired while the extension waited; it was requested in time, so it runs again.
        if (campaign.status === 'expired' && extension.newEndDate >= dateOnly(new Date())) {
            campaign.status = 'active';
            await manager
                .createQueryBuilder()
                .update(Ad)
                .set({ status: 'active' })
                .where('status = :expired', { expired: 'expired' })
                .andWhere('ad_set_id IN (SELECT id FROM ad_sets WHERE campaign_id = :campaignId)', { campaignId: campaign.id })
                .execute();
        }
        await manager.save(campaign);

        extension.status = 'approved';
        extension.reviewedByAdminId = adminId;
        extension.reviewedAt = new Date();
        await manager.save(extension);
    }

    private async lockPending(manager: EntityManager, extensionId: string) {
        const extension = await manager.findOne(CampaignExtension, { where: { id: extensionId }, lock: { mode: 'pessimistic_write' } });
        if (!extension) throw new NotFoundException('Extension not found');
        if (extension.status !== 'pending') {
            throw new BadRequestException(`This extension was already ${extension.status}`);
        }
        const campaign = await manager.findOne(Campaign, { where: { id: extension.campaignId }, lock: { mode: 'pessimistic_write' } });
        if (!campaign) throw new NotFoundException('Campaign not found');
        return { extension, campaign };
    }

    async approve(extensionId: string, adminId: string): Promise<CampaignExtension> {
        const { extension, campaign } = await this.dataSource.transaction(async (manager) => {
            const locked = await this.lockPending(manager, extensionId);
            await this.applyApproval(manager, locked.extension, locked.campaign, adminId);
            return locked;
        });
        await this.notificationService.createNotification({
            advertiserId: campaign.advertiserId,
            title: 'Extension approved',
            message: `${campaign.name} now runs until ${extension.newEndDate}.`,
        });
        return extension;
    }

    /** Refunds exactly this extension's points. The campaign and its first payment are untouched. */
    async reject(extensionId: string, adminId: string): Promise<CampaignExtension> {
        const { extension, campaign } = await this.dataSource.transaction(async (manager) => {
            const locked = await this.lockPending(manager, extensionId);
            const payerId = await this.advertiserService.resolvePayerId(locked.campaign.advertiserId);
            await this.pointsService.credit(manager, payerId, locked.extension.amount, 'refund', {
                referenceType: EXTENSION_LEDGER_REFERENCE,
                referenceId: locked.extension.id,
                note: `Extension rejected: ${locked.campaign.name}`,
                createdByAdminId: adminId,
            });
            locked.extension.status = 'rejected';
            locked.extension.reviewedByAdminId = adminId;
            locked.extension.reviewedAt = new Date();
            await manager.save(locked.extension);
            return locked;
        });
        await this.notificationService.createNotification({
            advertiserId: campaign.advertiserId,
            title: 'Extension rejected',
            message: `The extension of ${campaign.name} was rejected and ${extension.amount.toLocaleString()} points were refunded.`,
        });
        return extension;
    }

    /** One campaign's extensions, newest first. */
    async findForCampaign(campaignId: string, user: CurrentUserPayload): Promise<CampaignExtension[]> {
        await this.accessibleCampaign(this.dataSource.manager, campaignId, user);
        return this.extensionRepository.find({ where: { campaignId }, order: { createdAt: 'DESC' } });
    }

    /** Extensions across every campaign the user can see, optionally by status. */
    async findScoped(user: CurrentUserPayload, status?: string): Promise<CampaignExtension[]> {
        if (status && !EXTENSION_STATUSES.includes(status as ExtensionStatus)) {
            throw new BadRequestException(`Status must be one of: ${EXTENSION_STATUSES.join(', ')}`);
        }
        const advertiserIds = await this.advertiserService.getScopedAdvertiserIds(user);
        if (advertiserIds && advertiserIds.length === 0) return [];
        return this.extensionRepository.find({
            where: {
                ...(status ? { status: status as ExtensionStatus } : {}),
                ...(advertiserIds ? { campaign: { advertiserId: In(advertiserIds) } } : {}),
            },
            relations: { campaign: { advertiser: true } },
            select: { campaign: { id: true, name: true, status: true, advertiserId: true, advertiser: { id: true, name: true } } },
            order: { createdAt: 'DESC' },
        });
    }
}
