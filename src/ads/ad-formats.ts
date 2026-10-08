/**
 * Which placements each ad type can run in, and which asset types each placement takes.
 * Keep in sync with ad_formats.ts in both portals. The AMUZE app requests ads by these placement keys.
 * A placement key can appear under several ad types (e.g. home_feed is a banner slot and an interstitial).
 */
export const AD_FORMATS = {
    banner: {
        home_feed: ['image'],
        explore_feed: ['image'],
        content_session: ['image'],
    },
    interstitial: {
        home_feed: ['image', 'video'],
        explore_feed: ['image', 'video'],
        free_content_episodes: ['video'],
    },
    reward_video: {
        muzebox: ['video'],
        free_content_episodes: ['video'],
    },
    native: {
        sponsored_placement: ['image', 'video'],
    },
    pop_ups: {
        app_open: ['image'],
    },
} as const satisfies Record<string, Record<string, readonly ('image' | 'video')[]>>;

export type AdType = keyof typeof AD_FORMATS;

export const AD_TYPES = Object.keys(AD_FORMATS) as AdType[];

export const PLACEMENT_KEYS = [...new Set(Object.values(AD_FORMATS).flatMap((placements) => Object.keys(placements)))];

/** Whether this ad type can run in this placement with this kind of asset. */
export function isAllowedFormat(adType: string, placementKey: string, assetType: string): boolean {
    const placements = AD_FORMATS[adType as AdType] as Record<string, readonly string[]> | undefined;
    return placements?.[placementKey]?.includes(assetType) ?? false;
}
