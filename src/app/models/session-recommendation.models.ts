import { PregnancyStage } from './maternal.models';
import { Modality, Provider } from './provider.models';
import { RiskFactor } from './onboarding.models';

/**
 * Products a verified professional recommends to a mother during a session, labelled Essential/Optional.
 * Final contract: API 30c56a9. Picks are editable while IN_PROGRESS and for 48h after COMPLETED
 * (409 SESSION_RECOMMENDATIONS_CLOSED otherwise, including before the session starts); max 30 per session.
 */

export const MAX_SESSION_PICKS = 30;

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
  originalPrice: number | null;
  imageUrl: string;
  category: string;
  whyRecommended: string[];
}

export interface ProductSuggestions {
  mother: {
    firstName: string;
    stage: PregnancyStage | string | null;
    gestationalWeek: number | null;
    /** Null unless she holds an unrevoked grant of the current HEALTH_DATA version (v2, which covers care-team access). */
    healthProfile: { firstPregnancy: boolean | null; multiples: boolean | null; riskFactors: RiskFactor[]; updatedAt?: string } | null;
  };
  items: SuggestedProduct[];
  /** Hidden by an approved health rule, with its reason. Always [] when healthProfile is null (it would reveal her conditions). */
  avoided: { productId: number; name: string; reason: string }[];
}

export interface SessionProductRecommendation {
  id: number;
  bookingId: number;
  sessionDate: string;
  productId: number;
  name: string;
  description: string;
  imageUrl: string;
  price: number;
  originalPrice: number | null;
  category: string;
  priority: RecommendationPriority;
  note: string | null;
  recommendedBy: { providerId: number; displayName: string; professionalType: string };
  createdAt: string;
}
