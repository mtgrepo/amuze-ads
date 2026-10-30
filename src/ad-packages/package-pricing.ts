import { BadRequestException } from "@nestjs/common";
import type { Campaign } from "src/campaigns/entities/campaign.entity";
import type { AdPackage } from "./entities/ad-package.entity";

/** Longest a campaign may run, extensions included. */
export const MAX_RUN_DAYS = 366;

const DAY_MS = 86_400_000;

/** YYYY-MM-DD for a date column value (string) or a Date, in server-local time like the expiry job. */
export function dateOnly(value: Date | string): string {
    if (typeof value === 'string') return value.slice(0, 10);
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${value.getFullYear()}-${month}-${day}`;
}

function toUtc(date: string): number {
    const [y, m, d] = date.split('-').map(Number);
    return Date.UTC(y, m - 1, d);
}

export function addDays(date: string, days: number): string {
    return new Date(toUtc(date) + days * DAY_MS).toISOString().slice(0, 10);
}

/** Days from `from` to `to`, both included. */
export function daysInclusive(from: string, to: string): number {
    return Math.round((toUtc(to) - toUtc(from)) / DAY_MS) + 1;
}

/** The parts of a package a campaign is priced from: a live package, or the campaign's own copy. */
export type PackageTerms = Pick<AdPackage, 'id' | 'name' | 'durationDays' | 'price'>;

export function assertQuantity(quantity: number): void {
    if (!Number.isInteger(quantity) || quantity < 1) {
        throw new BadRequestException('Quantity must be at least 1');
    }
}

/**
 * Prices and schedules a campaign from a package bought in whole units: copies the package,
 * sets the end date (start + days × quantity − 1), the plan cost and the total (plan + objectives).
 */
export function applyPackage(campaign: Campaign, terms: PackageTerms, quantity: number, startDate: string): void {
    if (!/^\d{4}-\d{2}-\d{2}/.test(startDate ?? '')) {
        throw new BadRequestException('Start date is required');
    }
    assertQuantity(quantity);
    const runDays = terms.durationDays * quantity;
    if (runDays > MAX_RUN_DAYS) {
        throw new BadRequestException(`A campaign can run for at most ${MAX_RUN_DAYS} days`);
    }
    const start = startDate.slice(0, 10);

    campaign.packageId = terms.id;
    campaign.packageName = terms.name;
    campaign.packageDays = terms.durationDays;
    campaign.packagePrice = terms.price;
    campaign.packageQuantity = quantity;
    campaign.startDate = start as unknown as Date;
    campaign.endDate = addDays(start, runDays - 1) as unknown as Date;
    campaign.planCost = terms.price * quantity;
    campaign.totalBudget = campaign.planCost + Number(campaign.objectiveCost ?? 0);
}
