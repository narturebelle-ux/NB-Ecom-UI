export type PregnancyStage = 'MONTH_3' | 'MONTH_6' | 'MONTH_9' | 'BABY_CARE';
export type NecessityTier = 'MANDATORY' | 'OPTIONAL' | 'SKIP';

export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  stage: PregnancyStage;
  tier: NecessityTier;
  clinicalRationale: string;
  imageUrl: string;
  rating: number;
  reviewCount: number;
  doctorApproved: boolean;
  category: string;
  keyBenefits: string[];
  targetSymptoms: string[];
}

export interface ChecklistTask {
  id: number;
  stage: PregnancyStage;
  testName: string;
  weeksDue: string;
  description: string;
  isMandatoryMedicalTest: boolean;
  category: string;
  recommendedFacilityType: string;
  sponsoredPartnerName?: string;
  sponsoredPartnerBadge?: string;
  partnerDiscountCode?: string;
  partnerBookingUrl?: string;
}

export interface HospitalPartner {
  id: number;
  name: string;
  city: string;
  pincode: string;
  address: string;
  specialty: string;
  rating: number;
  reviewCount: number;
  phone: string;
  consultationUrl: string;
  discountDetails: string;
  partnerTier: string;
  imageUrl: string;
}

export interface NursePackage {
  id: number;
  name: string;
  tagLine: string;
  price: number;
  originalPrice?: number;
  duration: string;
  badge?: string;
  description: string;
  features: string[];
}

export interface DoctorSession {
  id: number;
  doctorName: string;
  doctorTitle: string;
  hospitalAffiliation: string;
  topic: string;
  description: string;
  targetStage: PregnancyStage;
  sessionDate: string;
  durationMinutes: number;
  attendeeCount: number;
  bannerUrl: string;
  meetingUrl: string;
  status: string;
}

export interface LeadProfile {
  id?: number;
  name?: string;
  email?: string;
  phone: string;
  stage?: PregnancyStage;
  dueDate?: string;
  city?: string;
  pincode?: string;
  reportedSymptoms?: string[];
}

export interface User {
  id: number;
  firstName?: string;
  lastName?: string;
  name: string;
  email?: string;
  phone?: string;
  authProvider: string;
  stage?: PregnancyStage;
  dueDate?: string;
  role: string;
  createdAt?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}
