// Until a real gateway is integrated, every online payment is recorded as KBZPay.
export const DEFAULT_PAYMENT_METHOD = 'KBZPay';
// The customer paid an admin directly (cash, bank transfer, ...).
export const OFFLINE_PAYMENT_METHOD = 'Offline';

/** What a transactions row paid for. Each row is real money in; its ledger entry is the referenceId. */
export const TRANSACTION_REFERENCE = {
    pointPurchase: 'point_purchase',
    adminTopUp: 'admin_top_up',
} as const;
