import { PregnancyStage } from './maternal.models';

/**
 * Phase 6 — product recommendations, against the API's planned contract
 * (GET /me/product-recommendations; final version in UI_INTEGRATION_GUIDE.md).
 * The old MANDATORY/OPTIONAL/SKIP store framing is retired: there's no tier, SKIP products are never
 * returned, and whyRecommended is non-clinical only (clinicalRationale isn't exposed — unreviewed).
 */

export interface ProductRecommendation {
  productId: number;
  name: string;
  description: string;
  price: number;
  originalPrice: number | null;
  imageUrl: string;
  category: string;
  whyRecommended: string[];
  dismissed: boolean;
}

export interface RecommendationsResponse {
  /** From the active Journey; null (with no items) when there isn't one. */
  stage: PregnancyStage | null;
  commissionDisclosure: string;
  items: ProductRecommendation[];
}

/** Upper bound in rupees; null = no limit. */
export type Budget = number | null;

export const BUDGET_OPTIONS: { value: Budget; label: string }[] = [
  { value: null, label: 'Any budget' },
  { value: 500, label: 'Under ₹500' },
  { value: 1000, label: 'Under ₹1,000' },
  { value: 2000, label: 'Under ₹2,000' }
];

export const RECO_STAGE_LABELS: Record<PregnancyStage, string> = {
  MONTH_3: 'your first trimester',
  MONTH_6: 'your second trimester',
  MONTH_9: 'your third trimester',
  BABY_CARE: 'life with your baby'
};
