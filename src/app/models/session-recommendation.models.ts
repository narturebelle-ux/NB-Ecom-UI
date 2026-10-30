import { PregnancyStage } from './maternal.models';
import { Modality, Provider } from './provider.models';
import { RiskFactor } from './onboarding.models';

/**
 * Products a verified professional recommends to a mother during a session, labelled Essential/Optional.
 * Built against the UI's PROPOSED contract (sent to the API agent 2026-10-30) — reconcile with
 * UI_INTEGRATION_GUIDE.md once the API publishes the final shapes.
 */

export type RecommendationPriority = 'ESSENTIAL' | 'OPTIONAL';

export const PRIORITY_LABELS: Record<RecommendationPriority, string> = {
  ESSENTIAL: 'Essential',
  OPTIONAL: 'Optional'
};

/** GET /provider/me — the signed-in professional's own provider profile. */
export type ProviderSelf = Provider;

export interface ProviderBooking {
  id: number;
  status: string;
  scheduledStart: string;
  scheduledEnd: string;
  modality: Modality;
  serviceName: string;
  mother: { firstName: string; stage: string; gestationalWeek: number | null };
}

export interface SuggestedProduct {
  productId: number;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  category: string;
  whyRecommended: string[];
}

export interface ProductSuggestions {
  mother: {
    firstName: string;
    stage: PregnancyStage | string;
    /** Null unless the mother granted the HEALTH_DATA consent. */
    healthProfile: { firstPregnancy: boolean | null; multiples: boolean | null; riskFactors: RiskFactor[] } | null;
  };
  items: SuggestedProduct[];
  /** Hidden by an approved health rule, with that rule's reason. */
  avoided: { productId: number; name: string; reason: string }[];
}

export interface SessionProductRecommendation {
  id: number;
  bookingId: number;
  productId: number;
  name: string;
  imageUrl: string;
  price: number;
  category: string;
  priority: RecommendationPriority;
  note: string | null;
  recommendedBy: { providerId: number; displayName: string; professionalType: string };
  createdAt: string;
  /** Only on the mother's list. */
  sessionDate?: string;
}
