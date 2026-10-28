export interface FeatureFlags {
  nurseCompanion: boolean;
  hospitalLeads: boolean;
  doctorLiveSessions: boolean;
  assessmentVoucher: boolean;
  babyCareProducts: boolean;
  // Roadmap phase 0/1 — care-coordination pivot. All off until their phase ships.
  productRecommendations: boolean; // Phase 6: store pages become personalised recommendations
  legacyLeadForms: boolean; // assessment modal, lead forms, nurse-companion booking, doctor-live RSVP
  careBooking: boolean; // Phase 3: provider booking
  recordsVault: boolean; // Phase 4: records vault
  childTracker: boolean; // Phase 6: child profile + vaccination tracker
  aiAssistant: boolean; // Phase 6: AI record plan
  [key: string]: boolean;
}

export const DEFAULT_FEATURES: FeatureFlags = {
  nurseCompanion: true,
  hospitalLeads: true,
  doctorLiveSessions: true,
  assessmentVoucher: true,
  babyCareProducts: false,
  productRecommendations: false,
  legacyLeadForms: false,
  careBooking: false,
  recordsVault: false,
  childTracker: false,
  aiAssistant: false
};
