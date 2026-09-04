export const CAMPAIGN_SELF_SERVICE_TRANSITIONS: Record<string, string[]> = {
  draft: ['pending'],
  active: ['paused'],
  paused: ['active'],
};
