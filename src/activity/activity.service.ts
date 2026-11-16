import { Injectable } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import { ClsService } from "nestjs-cls";
import { DataSource, EntityManager } from "typeorm";
import { ActivityLog, type ActorType, type FieldChange } from "./entities/activity-log.entity";

/** Who is acting in this request, set by ActorInterceptor from the signed-in user. */
export interface Actor {
    type: ActorType;
    id: string | null;
    /** admin, advertiser or agency, as the user's role says. */
    role?: string;
}

export const ACTOR_KEY = 'actor';
export const SYSTEM_ACTOR: Actor = { type: 'system', id: null };

export interface ActivityEntry {
    action: string;
    entityType: string;
    entityId: string;
    campaignId?: string | null;
    advertiserId?: string | null;
    summary: string;
    changes?: Record<string, FieldChange> | null;
    meta?: Record<string, unknown> | null;
    /** Only when no one is signed in yet, e.g. a self-registration. */
    actor?: Actor;
}

export interface ActivityFilters {
    campaignId?: string;
    advertiserId?: string;
    entityType?: string;
    entityId?: string;
    /** "ad" matches ad.approved, ad.rejected…; a full action matches only itself. */
    action?: string;
    actorType?: string;
    from?: string;
    to?: string;
}

const MAX_PAGE = 100;
const MAX_EXPORT = 5000;

@Injectable()
export class ActivityService {
    constructor(
        private readonly cls: ClsService,
        @InjectDataSource()
        private readonly dataSource: DataSource,
    ) {}

    /** The signed-in user for this request, or System for scheduled jobs and anything outside a request. */
    currentActor(): Actor {
        return (this.cls.isActive() && this.cls.get<Actor>(ACTOR_KEY)) || SYSTEM_ACTOR;
    }

    /** Adds one history row through the caller's transaction, so it's saved only if the change is. */
    async record(manager: EntityManager, entry: ActivityEntry): Promise<void> {
        const actor = entry.actor ?? this.currentActor();
        await manager.save(manager.create(ActivityLog, {
            actorType: actor.type,
            actorId: actor.id,
            actorName: await this.nameOf(manager, actor),
            action: entry.action,
            entityType: entry.entityType,
            entityId: entry.entityId,
            campaignId: entry.campaignId ?? null,
            advertiserId: entry.advertiserId ?? null,
            summary: entry.summary.slice(0, 300),
            changes: entry.changes && Object.keys(entry.changes).length ? entry.changes : null,
            meta: entry.meta && Object.keys(entry.meta).length ? entry.meta : null,
        }));
    }

    /** Runs a change and its history row in one transaction, for code that wasn't in one already. */
    async withHistory<T>(work: (manager: EntityManager) => Promise<T>, entry: (result: T) => ActivityEntry | ActivityEntry[] | null): Promise<T> {
        return this.dataSource.transaction(async (manager) => {
            const result = await work(manager);
            const entries = entry(result);
            for (const e of Array.isArray(entries) ? entries : entries ? [entries] : []) {
                await this.record(manager, e);
            }
            return result;
        });
    }

    /** Field → { from, to } for the listed fields whose value changed. Dates compare by day. */
    diff(before: object, after: object, fields: string[]): Record<string, FieldChange> {
        const value = (v: unknown) => (v instanceof Date ? v.toISOString().slice(0, 10) : typeof v === 'number' || typeof v === 'string' && /^-?\d+(\.\d+)?$/.test(v) ? Number(v) : v ?? null);
        const changes: Record<string, FieldChange> = {};
        for (const field of fields) {
            const from = value((before as Record<string, unknown>)[field]);
            const to = value((after as Record<string, unknown>)[field]);
            if (JSON.stringify(from) !== JSON.stringify(to)) changes[field] = { from, to };
        }
        return changes;
    }

    private async nameOf(manager: EntityManager, actor: Actor): Promise<string | null> {
        if (!actor.id) return null;
        const table = actor.type === 'admin' ? '"admin-users"' : actor.type === 'advertiser' ? 'advertisers' : null;
        if (!table) return null;
        const rows: { name: string }[] = await manager.query(`SELECT name FROM ${table} WHERE id = $1`, [actor.id]);
        return rows[0]?.name ?? null;
    }

    /** Admin view: every matching row, newest first, a page at a time (or up to MAX_EXPORT for a download). */
    async find(filters: ActivityFilters, page = 1, limit = 25, all = false): Promise<{ items: ActivityLog[]; total: number }> {
        const qb = this.dataSource.getRepository(ActivityLog).createQueryBuilder('log');
        if (filters.campaignId) qb.andWhere('log.campaignId = :campaignId', { campaignId: filters.campaignId });
        if (filters.advertiserId) {
            // An agency's activity includes everything about its clients.
            qb.andWhere('log.advertiserId IN (SELECT id FROM advertisers WHERE id = :advertiserId OR agency_id = :advertiserId)', { advertiserId: filters.advertiserId });
        }
        if (filters.entityType) qb.andWhere('log.entityType = :entityType', { entityType: filters.entityType });
        if (filters.entityId) qb.andWhere('log.entityId = :entityId', { entityId: filters.entityId });
        if (filters.action) qb.andWhere('(log.action = :action OR log.action LIKE :prefix)', { action: filters.action, prefix: `${filters.action}.%` });
        if (filters.actorType) qb.andWhere('log.actorType = :actorType', { actorType: filters.actorType });
        // Dates are whole days in Myanmar time; "to" includes that whole day.
        if (filters.from) qb.andWhere('log.createdAt >= :from', { from: new Date(`${filters.from.slice(0, 10)}T00:00:00+06:30`) });
        if (filters.to) qb.andWhere('log.createdAt < :to', { to: new Date(new Date(`${filters.to.slice(0, 10)}T00:00:00+06:30`).getTime() + 86_400_000) });

        const size = all ? MAX_EXPORT : Math.min(Math.max(limit, 1), MAX_PAGE);
        const [items, total] = await qb
            .orderBy('log.createdAt', 'DESC')
            .skip(all ? 0 : (Math.max(page, 1) - 1) * size)
            .take(size)
            .getManyAndCount();
        return { items, total };
    }

    /** Customer view of one ad: what happened, without who on the Amuze side did it. */
    async findForCampaignWithoutActors(campaignId: string): Promise<Omit<ActivityLog, 'actorId' | 'actorName'>[]> {
        const rows = await this.dataSource.getRepository(ActivityLog).find({
            where: { campaignId },
            order: { createdAt: 'DESC' },
            take: 200,
        });
        return rows.map(({ actorId: _id, actorName: _name, ...rest }) => rest);
    }
}
