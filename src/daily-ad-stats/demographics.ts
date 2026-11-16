/** Age groups the audience breakdown is counted in. Only the group is stored, never a user's age. */
export const AGE_GROUPS = ['13-17', '18-24', '25-34', '35-44', '45-54', '55-64', '65+', 'unknown'] as const;
export const GENDER_GROUPS = ['male', 'female', 'unknown'] as const;

export type AgeGroup = typeof AGE_GROUPS[number];
export type GenderGroup = typeof GENDER_GROUPS[number];

/** "25", 25 or 25.0 → "25-34"; nothing, null or nonsense → "unknown". */
export function ageGroupOf(value: unknown): AgeGroup {
    const age = typeof value === 'string' && value.trim() ? Number(value) : value;
    if (typeof age !== 'number' || !Number.isFinite(age) || age < 13 || age > 120) return 'unknown';
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
