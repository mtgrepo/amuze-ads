import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import { DataSource, EntityManager } from "typeorm";
import { Campaign } from "src/campaigns/entities/campaign.entity";
import { Ad } from "src/ads/entities/ad.entity";
import { AdvertiserService } from "src/advertisers/advertiser.service";
import { SystemConfigsService } from "src/system-configs/system-configs.service";
import type { CurrentUserPayload } from "src/auth/current-user.decorator";
import { CampaignObjective, OBJECTIVE_TYPES, type ObjectiveType } from "./entities/campaign-objective.entity";

/** system_configs category holding one price row per objective type. */
export const OBJECTIVE_PRICING_CATEGORY = 'objective_pricing';

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
            if (input.objectiveType === 'watch' && assetType !== 'video') {
                throw new BadRequestException('Watch objectives need a video ad');
            }
            const price = prices.find((p) => p.objectiveType === input.objectiveType);
            if (!price) {
                throw new BadRequestException(`${input.objectiveType} objectives aren't available right now`);
            }
            const targetCount = Number(input.targetCount);
            return {
                objectiveType: input.objectiveType as ObjectiveType,
                targetCount,
                price: price.price,
                pricePer: price.pricePer,
                cost: Math.ceil(targetCount / price.pricePer) * price.price,
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
