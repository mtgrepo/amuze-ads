/**
 * Age groups shown in the audience breakdown. The exact age is stored and grouped when reading,
 * so these can change at any time and past data is regrouped with them.
 */
export const AGE_GROUPS = ['13-17', '18-24', '25-34', '35-44', '45-54', '55-64', '65+', 'unknown'] as const;
export const GENDER_GROUPS = ['male', 'female', 'unknown'] as const;

export type AgeGroup = typeof AGE_GROUPS[number];
export type GenderGroup = typeof GENDER_GROUPS[number];

/** Stored when the app sends no age or one that can't be real. */
export const UNKNOWN_AGE = 0;

/** 18, "18" or 18.0 → 18; nothing, null or nonsense (under 13, over 120) → UNKNOWN_AGE. */
export function ageOf(value: unknown): number {
    const age = typeof value === 'string' && value.trim() ? Number(value) : value;
    if (typeof age !== 'number' || !Number.isFinite(age) || age < 13 || age > 120) return UNKNOWN_AGE;
    return Math.floor(age);
}

/** The group a stored age falls in. */
export function ageGroupOf(age: number): AgeGroup {
    if (age === UNKNOWN_AGE) return 'unknown';
    if (age < 18) return '13-17';
    if (age < 25) return '18-24';
    if (age < 35) return '25-34';
    if (age < 45) return '35-44';
    if (age < 55) return '45-54';
    if (age < 65) return '55-64';
    return '65+';
}

/** male/female in any case (M/F too); anything else is counted as unknown. */
export function genderGroupOf(value: unknown): GenderGroup {
    const gender = typeof value === 'string' ? value.trim().toLowerCase() : '';
    if (gender === 'male' || gender === 'm') return 'male';
    if (gender === 'female' || gender === 'f') return 'female';
    return 'unknown';
}
