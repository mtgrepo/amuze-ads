export const ADVERTISER_TYPES = ['agency', 'advertiser'] as const;
export type AdvertiserType = typeof ADVERTISER_TYPES[number];
