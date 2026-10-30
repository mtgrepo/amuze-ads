import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import { DataSource, EntityManager } from "typeorm";
import { Campaign } from "src/campaigns/entities/campaign.entity";
import { Ad } from "src/ads/entities/ad.entity";
import { AdvertiserService } from "src/advertisers/advertiser.service";
import { SystemConfigsService } from "src/system-configs/system-configs.service";
import type { CurrentUserPayload } from "src/auth/current-user.decorator";
import { CampaignObjective, MAX_OBJECTIVE_TARGET, OBJECTIVE_TYPES, type ObjectiveType } from "./entities/campaign-objective.entity";

/** system_configs category holding one price row per objective type. */
export const OBJECTIVE_PRICING_CATEGORY = 'objective_pricing';

/** Keeps a single cost inside the integer columns it's stored in. */
const MAX_POINTS_AMOUNT = 1_000_000_000;

export interface ObjectivePrice {
    objectiveType: ObjectiveType;
    price: number;
    pricePer: number;
    label: string;
}

export interface ObjectiveInput {
    objectiveType: string;
    targetCount: number;
}

export interface ObjectiveProgress {
    objectiveType: ObjectiveType;
    selected: boolean;
    targetCount: number;
    delivered: number;
    price: number | null;
    pricePer: number | null;
    cost: number;
}

export type PricedObjective = Pick<CampaignObjective, 'objectiveType' | 'targetCount' | 'price' | 'pricePer' | 'cost'>;

const isPositiveInt = (value: unknown): value is number => Number.isInteger(value) && (value as number) >= 1;

@Injectable()
export class CampaignObjectiveService {
    constructor(
        private readonly systemConfigsService: SystemConfigsService,
        private readonly advertiserService: AdvertiserService,
        @InjectDataSource()
        private readonly dataSource: DataSource,
    ) {}

    /** Current prices, set by the business team in system configs. A type without a valid active row can't be bought. */
    async getPrices(): Promise<ObjectivePrice[]> {
        const rows = await this.systemConfigsService.getByCategory(OBJECTIVE_PRICING_CATEGORY);
        const prices: ObjectivePrice[] = [];
        for (const type of OBJECTIVE_TYPES) {
            const row = rows.find((r) => r.configKey === type && r.isActive);
            const value = row?.configValue ?? {};
            if (!isPositiveInt(value.price) || !isPositiveInt(value.pricePer)) continue;
            prices.push({ objectiveType: type, price: value.price, pricePer: value.pricePer, label: String(value.label ?? type) });
        }
        return prices;
    }

    /** Validates and prices objectives at today's prices. Saves nothing; an empty list is valid. */
    async priceObjectives(inputs: ObjectiveInput[], assetType: string): Promise<PricedObjective[]> {
        const prices = await this.getPrices();
        const seen = new Set<string>();
        return inputs.map((input) => {
            if (!input || typeof input !== 'object') {
                throw new BadRequestException('Each objective needs a type and a target');
            }
            if (!OBJECTIVE_TYPES.includes(input.objectiveType as ObjectiveType)) {
                throw new BadRequestException(`Objective type must be one of: ${OBJECTIVE_TYPES.join(', ')}`);
            }
            if (seen.has(input.objectiveType)) {
                throw new BadRequestException('Each objective type can be added once');
            }
            seen.add(input.objectiveType);
            if (!isPositiveInt(Number(input.targetCount))) {
                throw new BadRequestException('Each objective needs a target of at least 1');
            }
            if (Number(input.targetCount) > MAX_OBJECTIVE_TARGET) {
                throw new BadRequestException(`An objective target can be at most ${MAX_OBJECTIVE_TARGET.toLocaleString('en-US')}`);
            }
            if (input.objectiveType === 'watch' && assetType !== 'video') {
                throw new BadRequestException('Watch objectives need a video ad');
            }
            const price = prices.find((p) => p.objectiveType === input.objectiveType);
            if (!price) {
                throw new BadRequestException(`${input.objectiveType} objectives aren't available right now`);
            }
            const targetCount = Number(input.targetCount);
            const cost = Math.ceil(targetCount / price.pricePer) * price.price;
            if (cost > MAX_POINTS_AMOUNT) {
                throw new BadRequestException(`That ${input.objectiveType} target costs more than one ad can take; lower it`);
            }
            return {
                objectiveType: input.objectiveType as ObjectiveType,
                targetCount,
                price: price.price,
                pricePer: price.pricePer,
                cost,
            };
        });
    }

    /** Replaces a campaign's objectives and re-totals it (package + objectives). Runs in the caller's transaction. */
    async replaceForCampaign(manager: EntityManager, campaign: Campaign, priced: PricedObjective[]): Promise<CampaignObjective[]> {
        await manager.delete(CampaignObjective, { campaignId: campaign.id });
        const saved = priced.length
            ? await manager.save(priced.map((p) => manager.create(CampaignObjective, { ...p, campaignId: campaign.id })))
            : [];
        campaign.objectiveCost = priced.reduce((sum, p) => sum + p.cost, 0);
        campaign.totalBudget = Number(campaign.planCost) + campaign.objectiveCost;
        await manager.save(campaign);
        return saved;
    }

    /** The campaign, if this user may see it: its owner, their agency, or an admin. */
    async accessibleCampaign(manager: EntityManager, campaignId: string, user: CurrentUserPayload, lock = false): Promise<Campaign> {
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
     * All three objective types for a campaign, in a fixed order. Picked ones carry their saved target and
     * price; unpicked ones come back as zero with no price. Delivered is counted from the daily stats of the
     * campaign's ads within its run, for every type.
     */
    async getProgress(campaignId: string): Promise<ObjectiveProgress[]> {
        const [saved, totals] = await Promise.all([
            this.dataSource.manager.find(CampaignObjective, { where: { campaignId } }),
            this.dataSource.query(
                `SELECT COALESCE(SUM(s.impressions), 0)::int AS impression,
                        COALESCE(SUM(s.clicks), 0)::int AS click,
                        COALESCE(SUM(s.watches), 0)::int AS watch
                   FROM advertiser_ad_stats s
                   JOIN ads a ON a.id = s.ad_id
                   JOIN ad_sets st ON st.id = a.ad_set_id
                   JOIN campaigns c ON c.id = st.campaign_id
                  WHERE c.id = $1 AND s.stat_date BETWEEN c.start_date AND c.end_date`,
                [campaignId],
            ),
        ]);
        const delivered = totals[0] ?? {};
        return OBJECTIVE_TYPES.map((type) => {
            const row = saved.find((o) => o.objectiveType === type);
            return {
                objectiveType: type,
                selected: !!row,
                targetCount: row?.targetCount ?? 0,
                delivered: Number(delivered[type] ?? 0),
                price: row?.price ?? null,
                pricePer: row?.pricePer ?? null,
                cost: row?.cost ?? 0,
            };
        });
    }

    /** Progress for a campaign this user may see. */
    async getProgressFor(campaignId: string, user: CurrentUserPayload): Promise<ObjectiveProgress[]> {
        await this.accessibleCampaign(this.dataSource.manager, campaignId, user);
        return this.getProgress(campaignId);
    }

    /** Sets a draft campaign's objectives (replacing any it had) and returns the new totals. */
    async saveForCampaign(campaignId: string, inputs: ObjectiveInput[], user: CurrentUserPayload) {
        return this.dataSource.transaction(async (manager) => {
            // Same row lock as payment and package edits: objectives can't change while it's being paid.
            const campaign = await this.accessibleCampaign(manager, campaignId, user, true);
            if (campaign.status !== 'draft') {
                throw new BadRequestException('Objectives can only be changed while the ad is a draft');
            }
            const ad = await manager
                .createQueryBuilder(Ad, 'ad')
                .innerJoin('ad.adSet', 'adSet')
                .innerJoinAndSelect('ad.adCreative', 'adCreative')
                .where('adSet.campaignId = :campaignId', { campaignId })
                .getOne();
            const priced = await this.priceObjectives(inputs, ad?.adCreative?.assetType ?? '');
            const objectives = await this.replaceForCampaign(manager, campaign, priced);
            return {
                objectives,
                planCost: Number(campaign.planCost),
                objectiveCost: campaign.objectiveCost,
                totalBudget: campaign.totalBudget,
            };
        });
    }
}
