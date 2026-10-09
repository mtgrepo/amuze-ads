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

/** Campaigns that can be extended. Expired ones restart on approval; there's no time limit. */
const EXTENDABLE_STATUSES = ['active', 'paused', 'expired'];
/** Ledger referenceType for an extension's spend and refund, so they never mix with the campaign's own payment. */
export const EXTENSION_LEDGER_REFERENCE = 'campaign_extension';

const DAY_MS = 86_400_000;

/** YYYY-MM-DD for a date column value (string) or a Date, in server-local time like the expiry job. */
function dateOnly(value: Date | string): string {
    if (typeof value === 'string') return value.slice(0, 10);
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${value.getFullYear()}-${month}-${day}`;
}

function toUtc(date: string): number {
    const [y, m, d] = date.split('-').map(Number);
    return Date.UTC(y, m - 1, d);
}

function addDays(date: string, days: number): string {
    return new Date(toUtc(date) + days * DAY_MS).toISOString().slice(0, 10);
}

/** Days from `from` to `to`, both included. */
function daysInclusive(from: string, to: string): number {
    return Math.round((toUtc(to) - toUtc(from)) / DAY_MS) + 1;
}

export interface ExtensionQuote {
    campaignId: string;
    previousEndDate: string;
    startDate: string;
    newEndDate: string;
    days: number;
    /** Points per day: the daily budget, or the campaign's average for a total-budget plan. */
    dailyRate: number;
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

    /** Validates an extension and prices it. Used for the preview, and again under a row lock when requesting. */
    private async price(manager: EntityManager, campaign: Campaign, newEndDate: string) {
        if (!EXTENDABLE_STATUSES.includes(campaign.status)) {
            throw new BadRequestException('Only active, paused or expired campaigns can be extended');
        }
        if (!/^\d{4}-\d{2}-\d{2}$/.test(newEndDate ?? '')) {
            throw new BadRequestException('New end date must look like 2026-10-31');
        }
        const pending = await manager.exists(CampaignExtension, { where: { campaignId: campaign.id, status: 'pending' } });
        if (pending) {
            throw new BadRequestException('This campaign already has an extension waiting for review');
        }

        const previousEndDate = dateOnly(campaign.endDate);
        const today = dateOnly(new Date());
        const dayAfterEnd = addDays(previousEndDate, 1);
        // Expired campaigns restart today, so the days they sat expired aren't charged.
        const startDate = dayAfterEnd > today ? dayAfterEnd : today;
        if (newEndDate < startDate) {
            throw new BadRequestException(`The new end date must be on or after ${startDate}`);
        }

        const days = daysInclusive(startDate, newEndDate);
        const campaignDays = daysInclusive(dateOnly(campaign.startDate), previousEndDate);
        const dailyRate = campaign.budgetPlan === 'daily'
            ? Number(campaign.dailyBudget)
            : Math.ceil(Number(campaign.totalBudget) / Math.max(campaignDays, 1));
        if (!(dailyRate >= 1)) {
            throw new BadRequestException('This campaign has no daily rate to price an extension');
        }
        return { previousEndDate, startDate, newEndDate, days, dailyRate, amount: dailyRate * days };
    }

    async quote(campaignId: string, newEndDate: string, user: CurrentUserPayload): Promise<ExtensionQuote> {
        const manager = this.dataSource.manager;
        const campaign = await this.accessibleCampaign(manager, campaignId, user);
        const priced = await this.price(manager, campaign, newEndDate);
        // The agency pays for its clients.
        const payer = await this.pointsService.assertWalletOwner(await this.advertiserService.resolvePayerId(campaign.advertiserId));
        return { campaignId, ...priced, payerName: payer.name, balance: payer.pointsBalance };
    }

    /** Charges the extension and holds it for review. An admin's own request is approved at once. */
    async request(campaignId: string, newEndDate: string, user: CurrentUserPayload): Promise<CampaignExtension> {
        const { extension, campaign } = await this.dataSource.transaction(async (manager) => {
            // Row lock: two quick requests can't both pass the "one pending extension" check.
            const locked = await this.accessibleCampaign(manager, campaignId, user, true);
            const priced = await this.price(manager, locked, newEndDate);

            const created = await manager.save(manager.create(CampaignExtension, {
                campaignId,
                startDate: priced.startDate,
                previousEndDate: priced.previousEndDate,
                newEndDate: priced.newEndDate,
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

    /** Moves the end date, adds the amount to the total budget, and restarts an expired campaign. */
    private async applyApproval(manager: EntityManager, extension: CampaignExtension, campaign: Campaign, adminId: string) {
        campaign.endDate = new Date(`${extension.newEndDate}T00:00:00`);
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
