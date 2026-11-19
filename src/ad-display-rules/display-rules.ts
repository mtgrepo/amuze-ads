import { AD_FORMATS, type AdType } from "src/ads/ad-formats";

/**
 * When the AMUZE app shows each ad slot, and how often. The app applies these; the backend only stores them.
 * Defaults come from "Ad Type Selection and Placement Strategy" (Amuze Product Team, Nov 2026).
 *
 * The trigger of each slot is fixed: it is an event the app has to detect, so a new kind of trigger needs an app
 * release. Admins can only change the numbers that belong to the trigger, and turn a slot off.
 */
export const TRIGGERS = [
    'page_open',        // the page opens
    'app_open',         // the user reaches the home page after opening the app
    'after_items',      // after the user goes past N items (videos or posts) in a feed; the count restarts after the ad
    'content_open',     // every time the user opens a piece of content
    'content_complete', // when the user finishes a piece of content
    'video_play',       // when a video plays, every N videos, at its start or middle
    'download_all',     // when the user downloads all free episodes
    'module_switch',    // when the user switches to one of the listed modules
] as const;
export type Trigger = (typeof TRIGGERS)[number];

export const VIDEO_POSITIONS = ['start', 'middle', 'either'] as const;
export type VideoPosition = (typeof VIDEO_POSITIONS)[number];

/** The values an admin can change, depending on the trigger. */
export type EditableField = 'every' | 'cooldownMinutes' | 'videoPosition' | 'modules';

export const EDITABLE: Record<Trigger, readonly EditableField[]> = {
    page_open: ['cooldownMinutes'],
    app_open: [],
    after_items: ['every'],
    content_open: [],
    content_complete: ['cooldownMinutes'],
    video_play: ['every', 'videoPosition'],
    download_all: [],
    module_switch: ['modules'],
};

export interface SlotDefault {
    type: AdType;
    placement: string;
    trigger: Trigger;
    /** What `every` counts, for the triggers that count. */
    unit?: 'videos' | 'posts';
    every?: { min: number; max: number };
    cooldownMinutes?: number;
    videoPosition?: VideoPosition;
    modules?: string[];
}

export const SLOT_DEFAULTS: SlotDefault[] = [
    { type: 'banner', placement: 'home_feed', trigger: 'page_open', cooldownMinutes: 10 },
    { type: 'banner', placement: 'explore_feed', trigger: 'page_open', cooldownMinutes: 7 },
    { type: 'banner', placement: 'content_session', trigger: 'page_open', cooldownMinutes: 10 },
    // Muze: after 7 newsfeed videos, then again 7 videos after the ad is closed.
    { type: 'interstitial', placement: 'home_feed', trigger: 'after_items', unit: 'videos', every: { min: 7, max: 7 } },
    // Museum: on every change of content.
    { type: 'interstitial', placement: 'explore_feed', trigger: 'content_open' },
    { type: 'interstitial', placement: 'free_content_episodes', trigger: 'content_complete', cooldownMinutes: 10 },
    { type: 'reward_video', placement: 'muzebox', trigger: 'video_play', unit: 'videos', every: { min: 5, max: 8 }, videoPosition: 'either' },
    // Comic, novel and storytelling.
    { type: 'reward_video', placement: 'free_content_episodes', trigger: 'download_all' },
    { type: 'pop_ups', placement: 'app_open', trigger: 'app_open' },
    // The strategy doesn't name the modules yet; with none listed, this pop-up never shows.
    { type: 'pop_ups', placement: 'page_navigation', trigger: 'module_switch', modules: [] },
    { type: 'native', placement: 'home_feed', trigger: 'after_items', unit: 'posts', every: { min: 3, max: 5 } },
    { type: 'native', placement: 'explore_feed', trigger: 'after_items', unit: 'posts', every: { min: 8, max: 12 } },
];

export const slotKey = (type: string, placement: string) => `${type}:${placement}`;

// Every slot the create-ad form offers needs a rule, or the app won't know when to show it.
const missing = Object.entries(AD_FORMATS)
    .flatMap(([type, placements]) => Object.keys(placements).map((placement) => slotKey(type, placement)))
    .filter((key) => !SLOT_DEFAULTS.some((s) => slotKey(s.type, s.placement) === key));
if (missing.length) {
    throw new Error(`Ad slots without a display rule: ${missing.join(', ')}`);
}
