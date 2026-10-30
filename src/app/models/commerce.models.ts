/**
 * Phase 2 (Plans, checkout & entitlements) — real contract, NB-Ecomm-API
 * UI_INTEGRATION_GUIDE.md §8. Plan allocations, validity and inclusion copy are the API's
 * own provisional placeholders (not final blueprint §5 numbers) — the UI says so on screen.
 */

export type PaymentMode = 'ONE_TIME' | 'INSTALLMENT';
export type OrderStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED' | 'PARTIALLY_REFUNDED' | 'DISPUTED';

export interface PlanAllocation {
  professionalType: string;
  sessionCount: number;
}

export interface Plan {
  id: number;
  code: string;
  name: string;
  oneTimePrice: number;
  installmentTotalPrice: number;
  installmentCount: number;
  totalSessions: number;
  validityDays: number;
  inclusions: string[];
  exclusions: string[];
  allocations: PlanAllocation[];
  /** Months this price covers (API 70296dd). 9 on the public list; prorated to the due date in a quote. */
  months?: number;
  /** Listed 9-month price / 9. */
  monthlyPrice?: number;
  /** The full 9-month one-time price, for showing what was prorated. */
  fullOneTimePrice?: number;
}

/**
 * GET /me/plans/quote — plans priced for the whole months left until her due date (1-9, rounded up),
 * sessions shrunk in proportion. FULL_PLAN = no due date to go by (no journey/EDD, or postpartum).
 */
export interface PlanQuote {
  months: number;
  basis: 'DUE_DATE' | 'FULL_PLAN';
  plans: Plan[];
}

export interface InstallmentScheduleItem {
  installmentNumber: number;
  amount: number;
  dueDate: string;
}

export interface Order {
  id: number;
  planVersionId: number;
  planCode: string;
  status: OrderStatus;
  paymentMode: PaymentMode;
  price: number;
  /** Months the order was priced for. */
  months?: number;
  installmentSchedule: InstallmentScheduleItem[];
  refunds: unknown[];
  createdAt: string;
}

export interface Payment {
  id: number;
  orderId: number;
  status: string;
  amount: number;
  provider: string;
  mockSucceedPath: string;
  mockFailPath: string;
}

export interface Entitlement {
  id: number;
  orderId: number;
  professionalType: string;
  totalSessions: number;
  usedSessions: number;
  remainingSessions: number;
  expiresAt: string;
  planCode: string;
}

/**
 * Presentation-only copy keyed by plan code (taglines/badges aren't part of the API's plan
 * model — they're marketing framing, so they live in the UI). Unknown codes just render
 * without a tagline/badge.
 */
export const PLAN_PRESENTATION: Record<string, { tagline: string; badge?: string }> = {
  STANDARD: { tagline: 'Essential care coordination for a straightforward pregnancy.' },
  CARE: { tagline: 'Broader coverage through delivery and early postpartum.', badge: 'Most Popular' },
  PREMIUM: { tagline: 'Complete coverage from pregnancy through early childcare.', badge: 'Complete Care' }
};

export function planDisplayName(code: string): string {
  return code ? code.charAt(0) + code.slice(1).toLowerCase() : code;
}
