// 1 point = 1 MMK.
export const POINT_LEDGER_TYPES = ['purchase', 'admin_paid', 'admin_bonus', 'spend', 'refund'] as const;
export type PointLedgerType = typeof POINT_LEDGER_TYPES[number];

export const MIN_PURCHASE_POINTS = 1000;
