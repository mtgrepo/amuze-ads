import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ActivityService } from "src/activity/activity.service";
import { AdDisplayRule } from "./entities/ad-display-rule.entity";
import { UpdateAdDisplayRuleDto } from "./dto/update-ad-display-rule.dto";
import { EDITABLE, SLOT_DEFAULTS, slotKey, type EditableField, type SlotDefault, type Trigger, type VideoPosition } from "./display-rules";

/** One slot's rule as the app and the admin portal see it. Fields that don't apply to the trigger are null. */
export interface DisplayRule {
    type: string;
    placement: string;
    trigger: Trigger;
    unit: 'videos' | 'posts' | null;
    enabled: boolean;
    /** Show after a random count in this range; the count restarts after each ad. */
    every: { min: number; max: number } | null;
    /** Wait this long after the ad is closed before showing this slot again. */
    cooldownMinutes: number | null;
    videoPosition: VideoPosition | null;
    modules: string[] | null;
    /** Changed by an admin; null while the slot uses the defaults. */
    updatedAt: Date | null;
}

/** What admins may change on each slot. */
export interface AdminDisplayRule extends DisplayRule {
    editable: readonly EditableField[];
}

const DTO_FIELD: Record<keyof UpdateAdDisplayRuleDto, EditableField | null> = {
    enabled: null,
    everyMin: 'every',
    everyMax: 'every',
    cooldownMinutes: 'cooldownMinutes',
    videoPosition: 'videoPosition',
    modules: 'modules',
};

const TYPE_LABEL: Record<string, string> = {
    banner: 'Banner', interstitial: 'Interstitial', reward_video: 'Reward video', native: 'Native', pop_ups: 'Pop-up',
};

@Injectable()
export class AdDisplayRulesService {
    constructor(
        @InjectRepository(AdDisplayRule)
        private readonly repo: Repository<AdDisplayRule>,
        private readonly activity: ActivityService,
    ) {}

    /** Every slot, with admin changes laid over the defaults. */
    async list(): Promise<AdminDisplayRule[]> {
        const rows = await this.repo.find();
        const byKey = new Map(rows.map((r) => [slotKey(r.adType, r.placementKey), r]));
        return SLOT_DEFAULTS.map((slot) => this.toRule(slot, byKey.get(slotKey(slot.type, slot.placement))));
    }

    /** The rules the AMUZE app applies. Slots turned off are left out, so the app never asks for them. */
    async forApp(): Promise<DisplayRule[]> {
        return (await this.list())
            .filter((r) => r.enabled)
            .map((rule): DisplayRule => {
                const { editable, ...forApp } = rule;
                void editable;
                return forApp;
            });
    }

    async update(type: string, placement: string, dto: UpdateAdDisplayRuleDto): Promise<AdminDisplayRule> {
        const slot = SLOT_DEFAULTS.find((s) => s.type === type && s.placement === placement);
        if (!slot) throw new NotFoundException(`There's no ${type} slot in ${placement}`);

        const editable = EDITABLE[slot.trigger];
        for (const [field, value] of Object.entries(dto)) {
            const needs = DTO_FIELD[field as keyof UpdateAdDisplayRuleDto];
            if (value !== undefined && needs && !editable.includes(needs)) {
                throw new BadRequestException(`${field} doesn't apply to this slot`);
            }
        }

        const existing = await this.repo.findOne({ where: { adType: type, placementKey: placement } });
        const current = this.toRule(slot, existing ?? undefined);
        const row = existing ?? this.repo.create({ adType: type, placementKey: placement });
        const before = { ...this.snapshot(current) };

        row.enabled = dto.enabled ?? current.enabled;
        row.everyMin = editable.includes('every') ? dto.everyMin ?? current.every?.min ?? null : null;
        row.everyMax = editable.includes('every') ? dto.everyMax ?? current.every?.max ?? null : null;
        row.cooldownMinutes = editable.includes('cooldownMinutes') ? dto.cooldownMinutes ?? current.cooldownMinutes : null;
        row.videoPosition = editable.includes('videoPosition') ? dto.videoPosition ?? current.videoPosition : null;
        row.modules = editable.includes('modules')
            ? dto.modules ? [...new Set(dto.modules.map((m) => m.trim()).filter(Boolean))] : current.modules
            : null;
        if (row.everyMin !== null && row.everyMax !== null && row.everyMin > row.everyMax) {
            throw new BadRequestException('The lower count must not be more than the higher one');
        }

        const saved = await this.activity.withHistory((manager) => manager.save(row), (r) => {
            const changes = this.activity.diff(before, this.snapshot(this.toRule(slot, r)), ['enabled', 'everyMin', 'everyMax', 'cooldownMinutes', 'videoPosition', 'modules']);
            return Object.keys(changes).length ? {
                action: 'display_rule.updated', entityType: 'ad_display_rule', entityId: slotKey(type, placement),
                summary: `Changed when ${TYPE_LABEL[type] ?? type} ads show in ${placement.replace(/_/g, ' ')}`,
                changes,
            } : null;
        });
        return this.toRule(slot, saved);
    }

    private toRule(slot: SlotDefault, row?: AdDisplayRule): AdminDisplayRule {
        const editable = EDITABLE[slot.trigger];
        const every = row?.everyMin != null && row.everyMax != null ? { min: row.everyMin, max: row.everyMax } : slot.every ?? null;
        return {
            type: slot.type,
            placement: slot.placement,
            trigger: slot.trigger,
            unit: slot.unit ?? null,
            enabled: row?.enabled ?? true,
            every: editable.includes('every') ? every : null,
            cooldownMinutes: editable.includes('cooldownMinutes') ? row?.cooldownMinutes ?? slot.cooldownMinutes ?? 0 : null,
            videoPosition: editable.includes('videoPosition') ? (row?.videoPosition as VideoPosition) ?? slot.videoPosition ?? 'either' : null,
            modules: editable.includes('modules') ? row?.modules ?? slot.modules ?? [] : null,
            updatedAt: row?.updatedAt ?? null,
            editable,
        };
    }

    /** Flat values for the activity diff. */
    private snapshot(rule: DisplayRule) {
        return {
            enabled: rule.enabled,
            everyMin: rule.every?.min ?? null,
            everyMax: rule.every?.max ?? null,
            cooldownMinutes: rule.cooldownMinutes,
            videoPosition: rule.videoPosition,
            modules: rule.modules,
        };
    }
}
