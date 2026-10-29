/**
 * Phase 2 (Plans, checkout & entitlements) — implemented client-side against a
 * self-authored mock contract since the API hasn't shipped Plan/Order/Payment endpoints
 * yet (see API_Integration.md §13/14). Prices and session counts match the roadmap's
 * blueprint §5 figures; inclusions/exclusions/validity are illustrative placeholders,
 * same spirit as the consent documents' DRAFT text pending legal/product review.
 * Swap this whole file and CommerceService for real HTTP calls once GET /plans etc. ship.
 */

export interface Plan {
  id: number;
  name: string;
  tagline: string;
  priceOneTime: number;
  totalSessions: number;
  validityMonths: number;
  badge?: string;
  inclusions: string[];
  exclusions: string[];
}

export type OrderStatus = 'PENDING' | 'PAID' | 'FAILED';

export interface Order {
  id: string;
  planId: number;
  planName: string;
  amount: number;
  installment: boolean;
  status: OrderStatus;
  createdAt: string;
  paidAt?: string;
}

export interface Entitlement {
  id: string;
  planId: number;
  planName: string;
  totalSessions: number;
  usedSessions: number;
  purchasedAt: string;
  expiresAt: string;
}

/** Installment total = one-time price + 20%, per the roadmap. */
export function installmentTotal(plan: Plan): number {
  return Math.round(plan.priceOneTime * 1.2);
}

export const MOCK_PLANS: Plan[] = [
  {
    id: 1,
    name: 'Standard',
    tagline: 'Essential care coordination for a straightforward pregnancy.',
    priceOneTime: 9999,
    totalSessions: 9,
    validityMonths: 12,
    inclusions: [
      '9 sessions across your assigned care team',
      'WhatsApp support during business hours',
      'Full access to your Journey timeline & next actions'
    ],
    exclusions: [
      'No priority scheduling',
      'No lactation consultant or postpartum physiotherapy sessions',
      'No 24/7 helpline'
    ]
  },
  {
    id: 2,
    name: 'Care',
    tagline: 'Our most popular plan — broader coverage through delivery and early postpartum.',
    priceOneTime: 14999,
    totalSessions: 12,
    validityMonths: 12,
    badge: 'Most Popular',
    inclusions: [
      '12 sessions across your assigned care team',
      'Includes lactation consultant & postpartum physiotherapist sessions',
      'Priority scheduling',
      'WhatsApp support during business hours'
    ],
    exclusions: [
      'No 24/7 care-coordinator helpline',
      'No dedicated care coordinator'
    ]
  },
  {
    id: 3,
    name: 'Premium',
    tagline: 'Complete, white-glove coverage from pregnancy through early childcare.',
    priceOneTime: 24999,
    totalSessions: 16,
    validityMonths: 12,
    badge: 'Complete Care',
    inclusions: [
      '16 sessions across your assigned care team',
      'Dedicated care coordinator',
      '24/7 care-coordinator helpline',
      'Priority scheduling',
      'Includes lactation consultant & postpartum physiotherapist sessions'
    ],
    exclusions: []
  }
];
