export interface FeatureFlags {
  nurseCompanion: boolean;
  hospitalLeads: boolean;
  doctorLiveSessions: boolean;
  assessmentVoucher: boolean;
  babyCareProducts: boolean;
  [key: string]: boolean;
}

export const DEFAULT_FEATURES: FeatureFlags = {
  nurseCompanion: true,
  hospitalLeads: true,
  doctorLiveSessions: true,
  assessmentVoucher: true,
  babyCareProducts: false
};
