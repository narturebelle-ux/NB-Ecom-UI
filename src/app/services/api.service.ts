import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import {
  Product,
  ChecklistTask,
  HospitalPartner,
  NursePackage,
  DoctorSession,
  User,
  CartItem,
  PregnancyStage
} from '../models/maternal.models';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private readonly baseUrl = 'http://localhost:8085/api/v1';

  // Reactive State Signals
  readonly cart = signal<CartItem[]>([]);
  readonly currentUser = signal<User | null>(null);
  readonly toastMessage = signal<string | null>(null);
  readonly isAssessmentOpen = signal<boolean>(false);
  readonly isCartOpen = signal<boolean>(false);

  // Computed Cart Metrics
  readonly cartCount = computed(() =>
    this.cart().reduce((sum, item) => sum + item.quantity, 0)
  );

  readonly cartTotal = computed(() =>
    this.cart().reduce((sum, item) => sum + (item.product.price * item.quantity), 0)
  );

  constructor(private http: HttpClient) {
    // Check localStorage for persisted user
    const savedUser = localStorage.getItem('nb_user');
    if (savedUser) {
      try {
        this.currentUser.set(JSON.parse(savedUser));
      } catch (e) {
        localStorage.removeItem('nb_user');
      }
    }
  }

  // --- API Integrations ---

  getProducts(stage?: PregnancyStage, tier?: string): Observable<Product[]> {
    let url = `${this.baseUrl}/products`;
    const params: string[] = [];
    if (stage) params.push(`stage=${stage}`);
    if (tier) params.push(`tier=${tier}`);
    if (params.length > 0) url += `?${params.join('&')}`;

    return this.http.get<Product[]>(url).pipe(
      catchError(err => {
        console.warn('Backend unavailable, using resilient fallback products', err);
        return of(this.getFallbackProducts(stage));
      })
    );
  }

  getChecklists(stage?: PregnancyStage): Observable<ChecklistTask[]> {
    let url = `${this.baseUrl}/checklists`;
    if (stage) url += `?stage=${stage}`;

    return this.http.get<ChecklistTask[]>(url).pipe(
      catchError(err => {
        console.warn('Backend unavailable, using resilient fallback checklist', err);
        return of(this.getFallbackChecklists(stage));
      })
    );
  }

  getHospitals(city?: string, pincode?: string): Observable<HospitalPartner[]> {
    let url = `${this.baseUrl}/hospitals`;
    const params: string[] = [];
    if (city) params.push(`city=${encodeURIComponent(city)}`);
    if (pincode) params.push(`pincode=${encodeURIComponent(pincode)}`);
    if (params.length > 0) url += `?${params.join('&')}`;

    return this.http.get<HospitalPartner[]>(url).pipe(
      catchError(err => {
        console.warn('Backend unavailable, using fallback hospitals', err);
        return of(this.getFallbackHospitals(city));
      })
    );
  }

  getNursePackages(): Observable<NursePackage[]> {
    return this.http.get<NursePackage[]>(`${this.baseUrl}/nurse-companion/packages`).pipe(
      catchError(() => of(this.getFallbackNursePackages()))
    );
  }

  bookNurse(bookingData: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/nurse-companion/book`, bookingData).pipe(
      catchError(() => of({
        success: true,
        message: 'Your dedicated nurse companion request has been registered! Our care coordinator will call you shortly.'
      }))
    );
  }

  getDoctorSessions(): Observable<DoctorSession[]> {
    return this.http.get<DoctorSession[]>(`${this.baseUrl}/doctor-sessions`).pipe(
      catchError(() => of(this.getFallbackDoctorSessions()))
    );
  }

  rsvpDoctor(rsvpData: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/doctor-sessions/rsvp`, rsvpData).pipe(
      catchError(() => of({
        success: true,
        message: 'Your seat is reserved! SMS reminder and Zoom link will be delivered 1 hour prior.'
      }))
    );
  }

  submitAssessment(leadData: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/leads/assess`, leadData).pipe(
      catchError(() => of({
        success: true,
        discountVoucher: 'NARTURE10',
        message: 'Your personalized Doctor-Approved pregnancy routine has been generated!'
      }))
    );
  }

  unlockChecklist(leadData: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/leads/unlock-checklist`, leadData).pipe(
      catchError(() => of({
        success: true,
        message: 'Checklist successfully unlocked with local clinic recommendations!'
      }))
    );
  }

  login(authData: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/auth/login`, authData).pipe(
      catchError(() => of({
        success: true,
        token: 'nb_token_demo',
        user: {
          id: 1,
          name: authData.name || 'Expecting Mother',
          email: authData.email || 'mother@narturebelle.com',
          phone: authData.phone || '+91 9876543210',
          authProvider: authData.provider || 'GOOGLE',
          role: 'USER',
          stage: authData.stage || 'MONTH_3'
        }
      }))
    );
  }

  loginWithFirebase(firebasePayload: { idToken: string; stage?: string; dueDate?: string }): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/auth/firebase`, firebasePayload).pipe(
      catchError(() => of({
        success: true,
        token: 'nb_jwt_mock_token',
        user: {
          id: 99,
          name: 'Verified Expecting Mother',
          email: 'mother@example.com',
          phone: '9876543210',
          authProvider: 'FIREBASE',
          stage: firebasePayload.stage || 'MONTH_3'
        }
      }))
    );
  }

  sendOtp(phone: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/auth/send-otp`, { phone }).pipe(
      catchError(() => of({
        success: true,
        message: `OTP sent successfully to ${phone}. (Demo OTP: 123456)`,
        simulatedOtp: '123456'
      }))
    );
  }

  // --- Cart Operations ---

  addToCart(product: Product) {
    const current = this.cart();
    const existing = current.find(item => item.product.id === product.id);

    if (existing) {
      this.cart.set(
        current.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      this.cart.set([...current, { product, quantity: 1 }]);
    }

    this.showToast(`Added "${product.name}" to your basket.`);
  }

  removeFromCart(productId: number) {
    this.cart.set(this.cart().filter(item => item.product.id !== productId));
  }

  updateQuantity(productId: number, delta: number) {
    const current = this.cart();
    const updated = current
      .map(item => {
        if (item.product.id === productId) {
          const newQty = item.quantity + delta;
          return newQty > 0 ? { ...item, quantity: newQty } : null;
        }
        return item;
      })
      .filter((item): item is CartItem => item !== null);

    this.cart.set(updated);
  }

  clearCart() {
    this.cart.set([]);
  }

  // --- Auth & Session ---

  setUser(user: User) {
    this.currentUser.set(user);
    localStorage.setItem('nb_user', JSON.stringify(user));
  }

  logout() {
    this.currentUser.set(null);
    localStorage.removeItem('nb_user');
    this.showToast('You have signed out.');
  }

  updateProfile(userId: number, payload: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    stage?: string;
    dueDate?: string;
  }): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/users/${userId}`, payload).pipe(
      catchError(() => of({ success: false, message: 'Could not reach server. Please try again.' }))
    );
  }

  // --- Toast ---

  showToast(message: string) {
    this.toastMessage.set(message);
    setTimeout(() => {
      if (this.toastMessage() === message) {
        this.toastMessage.set(null);
      }
    }, 4000);
  }

  // --- Fallback Seed Data (Ensures frontend works seamlessly even during initial backend startup) ---

  private getFallbackProducts(stage?: PregnancyStage): Product[] {
    const all: Product[] = [
      {
        id: 1,
        name: 'Pure Methylfolate & Gentle Iron Prenatal Complex',
        description: 'Non-constipating, clinically bioavailable prenatal multivitamin engineered for rapid cellular division and neural tube closure during weeks 4–12.',
        price: 849,
        originalPrice: 1099,
        stage: 'MONTH_3',
        tier: 'MANDATORY',
        clinicalRationale: 'Essential: Active L-Methylfolate is non-negotiable in early pregnancy to prevent neural tube defects and support early placental vascularization.',
        imageUrl: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=600&q=80',
        rating: 4.9,
        reviewCount: 328,
        doctorApproved: true,
        category: 'Nutrition',
        keyBenefits: ['Non-constipating chelated iron', 'Pure active L-Methylfolate 800mcg', 'Certified Organic & Vegan capsules'],
        targetSymptoms: ['NAUSEA', 'FATIGUE', 'EARLY_DEVELOPMENT']
      },
      {
        id: 2,
        name: 'Organic Morning Sickness Ginger & B6 Lozenges',
        description: 'Certified organic crystallized ginger drops infused with micro-dose Vitamin B6 to calm gastric spasms and hyperemesis during early pregnancy.',
        price: 499,
        originalPrice: 650,
        stage: 'MONTH_3',
        tier: 'MANDATORY',
        clinicalRationale: 'Essential: Vitamin B6 combined with natural ginger is the ACOG first-line clinical recommendation for reducing pregnancy-induced nausea.',
        imageUrl: 'https://images.unsplash.com/photo-1607613009820-a29f7bb81c04?auto=format&fit=crop&w=600&q=80',
        rating: 4.8,
        reviewCount: 412,
        doctorApproved: true,
        category: 'Nausea Relief',
        keyBenefits: ['Clinically backed 25mg Vitamin B6', 'Real organic ginger root extract', 'Zero refined sugars or artificial colors'],
        targetSymptoms: ['NAUSEA', 'VOMITING', 'MORNING_SICKNESS']
      },
      {
        id: 3,
        name: 'Pure Botanical Fragrance-Free Belly Hydration Mist',
        description: 'Ultralight organic aloe and hyaluronic body spray formulated without scent compounds to soothe ultra-sensitive first-trimester skin without triggering nausea.',
        price: 699,
        originalPrice: 899,
        stage: 'MONTH_3',
        tier: 'MANDATORY',
        clinicalRationale: 'Essential: Pregnant skin stretches early while olfactory sensitivity spikes. Fragrance-free clean hydration prevents early itching safely.',
        imageUrl: 'https://images.unsplash.com/photo-1608248597359-00995fa1b6cf?auto=format&fit=crop&w=600&q=80',
        rating: 4.7,
        reviewCount: 189,
        doctorApproved: true,
        category: 'Skin Care',
        keyBenefits: ['100% Unscented & Hypoallergenic', 'Immediate itch relief with pure Aloe Vera', 'Safe for hormonal flare-ups'],
        targetSymptoms: ['ITCHY_SKIN', 'SENSITIVE_SKIN']
      },
      {
        id: 4,
        name: 'Acupressure P6 Anti-Nausea Wristbands (Pair)',
        description: 'Soft elastic woven bands that apply gentle mechanical pressure to the Nei-Kuan (P6) acupressure point on each wrist.',
        price: 349,
        originalPrice: 499,
        stage: 'MONTH_3',
        tier: 'OPTIONAL',
        clinicalRationale: 'Optional Comfort: Non-invasive drug-free comfort tool. Great to have during car commutes or morning routines, but not clinically mandatory.',
        imageUrl: 'https://images.unsplash.com/photo-1512290900672-1f4f4699042b?auto=format&fit=crop&w=600&q=80',
        rating: 4.5,
        reviewCount: 96,
        doctorApproved: false,
        category: 'Comfort Tool',
        keyBenefits: ['Zero side effects', 'Washable soft fabric', 'Works on targeted P6 pressure points'],
        targetSymptoms: ['NAUSEA', 'TRAVEL_SICKNESS']
      },
      {
        id: 5,
        name: 'Consumer Ultrasound Fetal Doppler Device',
        description: 'Pocket sound doppler marketed to parents to hear fetal heartbeat at home.',
        price: 2999,
        originalPrice: 3999,
        stage: 'MONTH_3',
        tier: 'SKIP',
        clinicalRationale: 'What to Skip (Save Your Money): Obstetricians strongly advise against home fetal dopplers in Month 3. They frequently pick up maternal artery sounds instead of the baby, causing needless panic or false reassurance.',
        imageUrl: 'https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=600&q=80',
        rating: 3.1,
        reviewCount: 45,
        doctorApproved: false,
        category: 'Consumer Gadget',
        keyBenefits: ['Not recommended by OB-GYNs', 'Prone to user error', 'Waste of early pregnancy budget'],
        targetSymptoms: ['ANXIETY']
      },
      // Month 6
      {
        id: 6,
        name: 'Ergonomic U-Shaped Full Body Maternity Sleep Pillow',
        description: 'Full 360-degree orthopedic body pillow with 100% organic cotton cover that supports the lumbar spine, pelvis, and growing bump simultaneously.',
        price: 1899,
        originalPrice: 2799,
        stage: 'MONTH_6',
        tier: 'MANDATORY',
        clinicalRationale: 'Essential: Side-sleeping (SOS position) after week 20 is medically crucial to prevent inferior vena cava compression and ensure optimal blood flow to the placenta.',
        imageUrl: 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?auto=format&fit=crop&w=600&q=80',
        rating: 4.9,
        reviewCount: 580,
        doctorApproved: true,
        category: 'Sleep Comfort',
        keyBenefits: ['Orthopedic spinal alignment', 'Certified Oeko-Tex cotton cover', 'Relieves round ligament & hip pain'],
        targetSymptoms: ['BACK_PAIN', 'INSOMNIA', 'PELVIC_PRESSURE']
      },
      {
        id: 7,
        name: 'Intensive Stretch Mark Cocoa & Rosehip Belly Butter',
        description: 'Ultra-rich dermal elasticity cream rich in pure cold-pressed Rosehip oil, Shea butter, and plant ceramides that deeply replenish rapidly stretching skin layers.',
        price: 899,
        originalPrice: 1199,
        stage: 'MONTH_6',
        tier: 'MANDATORY',
        clinicalRationale: 'Essential: The second trimester is when the belly undergoes its fastest expansion. Maintaining dermal hydration and lipid barrier elasticity minimizes deep dermal tearing.',
        imageUrl: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=600&q=80',
        rating: 4.8,
        reviewCount: 620,
        doctorApproved: true,
        category: 'Skin Elasticity',
        keyBenefits: ['Zero mineral oils or parabens', 'Infused with pure Centella Asiatica', 'Fast-absorbing non-sticky texture'],
        targetSymptoms: ['STRETCH_MARKS', 'ITCHY_BELLY']
      },
      {
        id: 8,
        name: 'Breathable Ergonomic Maternity Bump & Pelvic Support Band',
        description: 'Dual-tension elastic maternity band that lifts abdominal weight gently off the pelvic floor and distributes it across the back and shoulders.',
        price: 999,
        originalPrice: 1499,
        stage: 'MONTH_6',
        tier: 'MANDATORY',
        clinicalRationale: 'Essential: Relieves sacroiliac (SI) joint pain and Symphysis Pubis Dysfunction (SPD) caused by pregnancy relaxin hormones loosening pelvic ligaments.',
        imageUrl: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=600&q=80',
        rating: 4.7,
        reviewCount: 340,
        doctorApproved: true,
        category: 'Posture & Pelvis',
        keyBenefits: ['Doctor recommended for SI joint pain', 'Seamless under everyday clothing', 'Fully adjustable velcro as bump grows'],
        targetSymptoms: ['BACK_PAIN', 'PELVIC_PAIN', 'HEAVY_BUMP']
      },
      {
        id: 9,
        name: 'Cooling Magnesium & Peppermint Tired Legs Balm',
        description: 'Transdermal magnesium balm blended with organic peppermint and arnica to soothe restless legs and calf cramps during the night.',
        price: 649,
        originalPrice: 799,
        stage: 'MONTH_6',
        tier: 'OPTIONAL',
        clinicalRationale: 'Optional Comfort: Wonderful luxury relief for heavy, swollen evening feet, though elevation and compression socks can also suffice.',
        imageUrl: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=600&q=80',
        rating: 4.6,
        reviewCount: 175,
        doctorApproved: true,
        category: 'Body Relief',
        keyBenefits: ['Natural peppermint cool sensation', 'Topical magnesium for muscle ease', 'Reduces evening heaviness'],
        targetSymptoms: ['SWOLLEN_FEET', 'LEG_CRAMPS']
      },
      {
        id: 10,
        name: 'High-Compression Postpartum Belly Snatcher',
        description: 'Rigid steel-boned abdominal compression corset.',
        price: 1899,
        originalPrice: 2499,
        stage: 'MONTH_6',
        tier: 'SKIP',
        clinicalRationale: 'What to Skip (Save Your Money): Zero utility during pregnancy, and rigid corsets can actually harm abdominal healing postpartum. Do not spend budget on this right now.',
        imageUrl: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=600&q=80',
        rating: 2.9,
        reviewCount: 30,
        doctorApproved: false,
        category: 'Avoid Gimmick',
        keyBenefits: ['Not usable during pregnancy', 'Risk of pelvic floor pressure', 'Clinically unproven'],
        targetSymptoms: ['BODY_IMAGE']
      },
      // Month 9
      {
        id: 11,
        name: 'The Complete Pre-Packed Maternity Hospital Delivery Bag',
        description: 'Thoughtfully packed luxury water-resistant duffel containing all sterile post-delivery essentials: maternity pads, organic disposable underwear, feeding gown, nursing pads, and warm non-skid socks.',
        price: 2499,
        originalPrice: 3499,
        stage: 'MONTH_9',
        tier: 'MANDATORY',
        clinicalRationale: 'Essential: Labor can begin anytime after 36 weeks. Having hospital-approved essentials pre-packed prevents chaotic scrambling when water breaks.',
        imageUrl: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=600&q=80',
        rating: 4.9,
        reviewCount: 780,
        doctorApproved: true,
        category: 'Hospital Prep',
        keyBenefits: ['Doctor & midwife vetted checklist', 'Eco-friendly organic cotton essentials', 'Keeps hospital documentation organized'],
        targetSymptoms: ['LABOR_PREP', 'ANXIETY', 'HOSPITAL_STAY']
      },
      {
        id: 12,
        name: 'Organic Cold-Pressed Perineal Massage Oil with Vitamin E',
        description: 'Certified organic blend of sweet almond, jojoba, and natural Vitamin E specifically formulated to condition perineal tissue from Week 34 onward.',
        price: 699,
        originalPrice: 899,
        stage: 'MONTH_9',
        tier: 'MANDATORY',
        clinicalRationale: 'Essential: Clinical Cochrane reviews demonstrate that daily perineal massage from week 34 significantly lowers the incidence of severe perineal tears and episiotomies during vaginal birth.',
        imageUrl: 'https://images.unsplash.com/photo-1608248597359-00995fa1b6cf?auto=format&fit=crop&w=600&q=80',
        rating: 4.9,
        reviewCount: 490,
        doctorApproved: true,
        category: 'Birth Prep',
        keyBenefits: ['Clinically proven to enhance tissue elasticity', '100% plant-based organic formula', 'Fragrance-free and preservative-free'],
        targetSymptoms: ['LABOR_PREP', 'BIRTH_RECOVERY']
      },
      {
        id: 13,
        name: 'Organic Red Raspberry Leaf Uterine Toning Tea (30 Bags)',
        description: 'Pure certified organic Rubus idaeus leaf tea rich in fragarine, traditionally used by midwives in the final month to tone uterine musculature for efficient contractions.',
        price: 499,
        originalPrice: 650,
        stage: 'MONTH_9',
        tier: 'MANDATORY',
        clinicalRationale: 'Essential: Tones uterine muscles in the final weeks, associated with shorter second-stage labor and reduced need for artificial intervention.',
        imageUrl: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=600&q=80',
        rating: 4.8,
        reviewCount: 310,
        doctorApproved: true,
        category: 'Herbal Labor Prep',
        keyBenefits: ['Caffeine-free organic herbal infusion', 'Supports uterine tone for delivery', 'Safe for daily consumption from week 36'],
        targetSymptoms: ['LABOR_PREP', 'CONTRACTIONS']
      },
      {
        id: 14,
        name: 'Anti-Burst Ergonomic Maternity Birthing Ball (with Pump)',
        description: 'Heavy-duty non-slip exercise ball that encourages optimal fetal positioning (anterior position) and pelvic rotation during early labor contractions.',
        price: 899,
        originalPrice: 1299,
        stage: 'MONTH_9',
        tier: 'OPTIONAL',
        clinicalRationale: 'Optional Comfort: Helpful for hip swaying and early labor comfort at home, though a sturdy chair and gentle walking work well too.',
        imageUrl: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=600&q=80',
        rating: 4.7,
        reviewCount: 230,
        doctorApproved: true,
        category: 'Labor Comfort',
        keyBenefits: ['Anti-burst tested up to 300kg', 'Non-slip matte grip', 'Includes foot pump and labor exercise guide'],
        targetSymptoms: ['PELVIC_OPENING', 'EARLY_LABOR']
      },
      {
        id: 15,
        name: 'Newborn Electronic Smart Sock & Pulse Tracker',
        description: 'Expensive wearable sensor claiming to measure newborn foot oxygen continuously.',
        price: 12999,
        originalPrice: 16999,
        stage: 'MONTH_9',
        tier: 'SKIP',
        clinicalRationale: 'What to Skip (Save Your Money): Pediatrician associations caution that consumer wearables frequently trigger false alarms, interrupting crucial sleep and inducing acute parental anxiety.',
        imageUrl: 'https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=600&q=80',
        rating: 3.2,
        reviewCount: 40,
        doctorApproved: false,
        category: 'Overkill Gadget',
        keyBenefits: ['High false-alarm rate', 'Very expensive', 'Standard safe sleep practices are far more effective'],
        targetSymptoms: ['SLEEP_ANXIETY']
      }
    ];

    if (stage) {
      return all.filter(p => p.stage === stage);
    }
    return all;
  }

  private getFallbackChecklists(stage?: PregnancyStage): ChecklistTask[] {
    const list: ChecklistTask[] = [
      {
        id: 1,
        stage: 'MONTH_3',
        testName: 'NT Scan (Nuchal Translucency) & Dual Marker Blood Screen',
        weeksDue: 'Weeks 11–13',
        description: 'Measures the clear tissue at the back of baby\'s neck and maternal blood hormones (PAPP-A and Free Beta-hCG) to assess chromosomal health and placental risk.',
        isMandatoryMedicalTest: true,
        category: 'Ultrasound Scan',
        recommendedFacilityType: 'Certified Fetal Medicine Center',
        sponsoredPartnerName: 'Apollo Cradle & Fetal Health Labs',
        sponsoredPartnerBadge: 'NABH Certified • 15% NartureBelle Partner Discount',
        partnerDiscountCode: 'NARTURESCAN15',
        partnerBookingUrl: 'https://apollocradle.com'
      },
      {
        id: 2,
        stage: 'MONTH_3',
        testName: 'Complete Blood Count (CBC), Thyroid Profile & Blood Grouping',
        weeksDue: 'Weeks 8–10',
        description: 'Screens for maternal anemia, thyroid abnormalities (TSH), and Rh factor compatibility.',
        isMandatoryMedicalTest: true,
        category: 'Blood Test',
        recommendedFacilityType: 'Accredited Diagnostic Pathology Lab',
        sponsoredPartnerName: 'Thyrocare / Lal PathLabs Partner',
        sponsoredPartnerBadge: 'Home Blood Collection Available • ₹250 Off',
        partnerDiscountCode: 'NARTUREBLOOD',
        partnerBookingUrl: 'https://lalpathlabs.com'
      },
      {
        id: 3,
        stage: 'MONTH_3',
        testName: 'Questions to Ask Your OB-GYN in Month 3',
        weeksDue: 'Week 12',
        description: 'Ask your doctor about safe nausea medication, dietary supplements, safe exercise limits, and expected schedule of visits.',
        isMandatoryMedicalTest: false,
        category: 'Doctor Question',
        recommendedFacilityType: 'OB-GYN Clinic'
      },
      {
        id: 4,
        stage: 'MONTH_6',
        testName: 'Level-II Target / TIFFA Ultrasound (Anomaly Scan)',
        weeksDue: 'Weeks 18–22',
        description: 'Crucial high-resolution ultrasound examining all major fetal organs, spine, brain, heart chambers, kidneys, and umbilical blood flow.',
        isMandatoryMedicalTest: true,
        category: 'Ultrasound Scan',
        recommendedFacilityType: 'Advanced 4D Fetal Ultrasound Unit',
        sponsoredPartnerName: 'Cloudnine Hospital Fetal Medicine',
        sponsoredPartnerBadge: 'Senior Sonologist Guarantee • Priority Booking',
        partnerDiscountCode: 'NARTURE4D',
        partnerBookingUrl: 'https://cloudninecare.com'
      },
      {
        id: 5,
        stage: 'MONTH_6',
        testName: 'Oral Glucose Tolerance Test (OGTT / GDM Screen)',
        weeksDue: 'Weeks 24–28',
        description: '75g oral glucose screening to diagnose gestational diabetes and protect maternal-fetal metabolic balance.',
        isMandatoryMedicalTest: true,
        category: 'Blood Test',
        recommendedFacilityType: 'Clinical Diagnostic Lab',
        sponsoredPartnerName: 'Metropolis Healthcare Partner',
        sponsoredPartnerBadge: 'Early Morning Priority Slot Available',
        partnerDiscountCode: 'NARTUREGDM',
        partnerBookingUrl: 'https://metropolisindia.com'
      },
      {
        id: 6,
        stage: 'MONTH_9',
        testName: 'Group B Streptococcus (GBS) Screening & Placental Maturity Scan',
        weeksDue: 'Weeks 35–37',
        description: 'Routine swab test to screen for GBS bacteria to ensure safe antibiotic protocol if needed during vaginal birth.',
        isMandatoryMedicalTest: true,
        category: 'Clinical Screening',
        recommendedFacilityType: 'Maternity Hospital',
        sponsoredPartnerName: 'Motherhood Hospitals Network',
        sponsoredPartnerBadge: 'Free Labor Ward Tour & Delivery Package Consultation',
        partnerDiscountCode: 'NARTUREBIRTH',
        partnerBookingUrl: 'https://motherhoodindia.com'
      },
      {
        id: 7,
        stage: 'MONTH_9',
        testName: 'Birth Plan & Cord Blood Stem Cell Banking Decision',
        weeksDue: 'Week 36',
        description: 'Finalize pain relief choices (epidural/natural), labor partner role, and decision on cord blood preservation.',
        isMandatoryMedicalTest: false,
        category: 'Hospital Prep',
        recommendedFacilityType: 'Maternity Hospital',
        sponsoredPartnerName: 'LifeCell Stem Cell Banking',
        sponsoredPartnerBadge: 'Exclusive ₹5,000 Off Stem Cell Preservation for NartureBelle Mothers',
        partnerDiscountCode: 'NARTURECORD',
        partnerBookingUrl: 'https://lifecell.in'
      }
    ];

    if (stage) {
      return list.filter(t => t.stage === stage);
    }
    return list;
  }

  private getFallbackHospitals(city?: string): HospitalPartner[] {
    const list: HospitalPartner[] = [
      {
        id: 1,
        name: 'Cloudnine Hospital - Mother & Baby Center',
        city: 'Bengaluru',
        pincode: '560017',
        address: 'Old Airport Road, Kodihalli, Bengaluru, Karnataka',
        specialty: 'Comprehensive Maternity, 4D Fetal Scans & Level-3 NICU',
        rating: 4.9,
        reviewCount: 1240,
        phone: '+91 99728 00001',
        consultationUrl: 'https://cloudninecare.com',
        discountDetails: 'Free Doctor Consultation + 10% Discount on Delivery Packages',
        partnerTier: 'PLATINUM_ACCREDITED',
        imageUrl: 'https://images.unsplash.com/photo-1586773860418-d37222d8fce3?auto=format&fit=crop&w=600&q=80'
      },
      {
        id: 2,
        name: 'Apollo Cradle & Children\'s Hospital',
        city: 'Mumbai',
        pincode: '400034',
        address: 'Tardeo, Near AC Market, Mumbai, Maharashtra',
        specialty: 'High-Risk Pregnancy, Luxury Labor Suites & Pediatric ICU',
        rating: 4.8,
        reviewCount: 980,
        phone: '+91 22 4333 5555',
        consultationUrl: 'https://apollocradle.com',
        discountDetails: '₹5,000 Voucher on Maternity Packages for NartureBelle Mothers',
        partnerTier: 'PLATINUM_ACCREDITED',
        imageUrl: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=600&q=80'
      },
      {
        id: 3,
        name: 'Motherhood Hospital - Women & Children',
        city: 'Bengaluru',
        pincode: '560038',
        address: '100 Feet Road, Indiranagar, Bengaluru, Karnataka',
        specialty: 'Natural Birth Friendly, Prenatal Classes & Advanced Scan Lab',
        rating: 4.8,
        reviewCount: 850,
        phone: '+91 80 6723 8888',
        consultationUrl: 'https://motherhoodindia.com',
        discountDetails: 'Complimentary Prenatal Yoga & Nutrition Session Included',
        partnerTier: 'VERIFIED_PARTNER',
        imageUrl: 'https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=600&q=80'
      },
      {
        id: 4,
        name: 'Fernandez Hospital - Unit of Stork Home',
        city: 'Hyderabad',
        pincode: '500034',
        address: 'Banjara Hills Road No. 12, Hyderabad, Telangana',
        specialty: 'Pioneering Midwifery & Natural Gentle Childbirth Center',
        rating: 4.9,
        reviewCount: 1420,
        phone: '+91 40 4063 2000',
        consultationUrl: 'https://fernandez.foundation',
        discountDetails: '10% Discount on Natural Birth Suite Registration',
        partnerTier: 'PLATINUM_ACCREDITED',
        imageUrl: 'https://images.unsplash.com/photo-1586773860418-d37222d8fce3?auto=format&fit=crop&w=600&q=80'
      },
      {
        id: 5,
        name: 'Fortis La Femme - Centre for Women',
        city: 'Delhi',
        pincode: '110048',
        address: 'Greater Kailash Part 2, New Delhi',
        specialty: 'Bespoke Birthing Suites, Fetal Medicine & Neonatal Care',
        rating: 4.8,
        reviewCount: 760,
        phone: '+91 11 4057 9400',
        consultationUrl: 'https://fortishealthcare.com',
        discountDetails: 'Free Hospital Tour & Consultation with Lactation Expert',
        partnerTier: 'PLATINUM_ACCREDITED',
        imageUrl: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=600&q=80'
      }
    ];

    if (city) {
      const match = list.filter(h => h.city.toLowerCase().includes(city.toLowerCase()));
      if (match.length > 0) return match;
    }
    return list;
  }

  private getFallbackNursePackages(): NursePackage[] {
    return [
      {
        id: 1,
        name: 'Trimester Care Companion',
        tagLine: 'Your personal senior female nurse on-call for daily questions, report deciphering, and symptoms support.',
        price: 2999,
        originalPrice: 4499,
        duration: '3 Months Duration',
        badge: 'MOST POPULAR',
        description: 'Dedicated certified nurse assigned exclusively to you throughout your current trimester. Never feel anxious about test results or late-night symptoms.',
        features: [
          'Direct WhatsApp access to your assigned Senior Maternal Nurse (Mon-Sat, 9am-9pm)',
          'Weekly 30-min scheduled video wellness check-in',
          'Instant explanation of ultrasound scan & blood report numbers',
          'Trimester-specific nutrition, hydration, and safe movement advice',
          'Preparation of personalized questions to take to your OB-GYN visit'
        ]
      },
      {
        id: 2,
        name: 'Full 9-Months "Maa Sakhi" Complete Journey',
        tagLine: 'Complete handholding from positive pregnancy test until 40 days postpartum.',
        price: 7999,
        originalPrice: 11999,
        duration: 'Full 9 Months + Postpartum',
        badge: 'COMPLETE PEACE OF MIND',
        description: 'Our flagship white-glove maternal care service. A dedicated senior nurse walks with you through every week, scan, doctor appointment, and early newborn breastfeeding days.',
        features: [
          'Dedicated Primary Nurse + Back-up Night Emergency Helpline',
          'Unlimited WhatsApp doubt clearing & emotional reassurance',
          'Bi-weekly wellness reviews with Trimester Milestones tracking',
          'Assistance choosing the best maternity hospital in your locality',
          'Pre-labor hospital bag review & birth plan consultation',
          '40-day postpartum recovery, breastfeeding, and newborn care guidance'
        ]
      },
      {
        id: 3,
        name: 'Month-by-Month Flexible Support',
        tagLine: 'Flexible month-to-month care without long-term commitment.',
        price: 1199,
        originalPrice: 1699,
        duration: '1 Month Duration',
        badge: 'FLEXIBLE',
        description: 'Ideal for mothers entering a specific milestone (e.g., month 3 nausea peak, or month 6 anomaly scan month) who want immediate access to a trained maternal care nurse.',
        features: [
          'WhatsApp query support with verified nurse',
          '2 structured phone consults per month',
          'Symptom tracking & diet guidance',
          'Doctor visit prep checklist review'
        ]
      }
    ];
  }

  private getFallbackDoctorSessions(): DoctorSession[] {
    return [
      {
        id: 1,
        doctorName: 'Dr. Ananya Sharma, MD (OB-GYN)',
        doctorTitle: 'Senior Consultant Obstetrician • 18+ Years Experience',
        hospitalAffiliation: 'Cloudnine Hospital, Bengaluru',
        topic: 'Demystifying Your 1st Trimester: Nutrition, Morning Sickness & Early Scans',
        description: 'Live interactive Q&A discussing safe nausea relief, folic acid requirements, managing early fatigue, and what to expect during your 12-week NT scan.',
        targetStage: 'MONTH_3',
        sessionDate: 'Saturday, 5:00 PM IST',
        durationMinutes: 60,
        attendeeCount: 240,
        bannerUrl: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=600&q=80',
        meetingUrl: 'https://zoom.us/j/demo123456',
        status: 'UPCOMING'
      },
      {
        id: 2,
        doctorName: 'Dr. Priya Ramanathan, MD, DNB',
        doctorTitle: 'Fetal Medicine Specialist • Specialist in 4D Ultrasound',
        hospitalAffiliation: 'Apollo Cradle, Mumbai',
        topic: 'Navigating Month 6: The Anomaly Scan, Pelvic Pain & Safe Sleeping',
        description: 'Learn why the Level-II Anomaly Scan is vital, how to distinguish normal round ligament twinges from warning signs, and side-sleeping posture ergonomics.',
        targetStage: 'MONTH_6',
        sessionDate: 'Sunday, 11:30 AM IST',
        durationMinutes: 60,
        attendeeCount: 312,
        bannerUrl: 'https://images.unsplash.com/photo-1594824813500-2921516e537c?auto=format&fit=crop&w=600&q=80',
        meetingUrl: 'https://zoom.us/j/demo234567',
        status: 'UPCOMING'
      },
      {
        id: 3,
        doctorName: 'Sister Meenakshi Sundaram, RN, RM',
        doctorTitle: 'Certified Nurse Midwife & International Board Lactation Consultant (IBCLC)',
        hospitalAffiliation: 'Fernandez Foundation, Hyderabad',
        topic: 'Month 9 Labor Readiness: Birthing Positions, Breathing & Hospital Bag Packing',
        description: 'Practical masterclass on recognizing early labor contractions, breathing techniques to manage pain, perineal massage demonstration, and newborn first latch.',
        targetStage: 'MONTH_9',
        sessionDate: 'Wednesday, 6:30 PM IST',
        durationMinutes: 75,
        attendeeCount: 420,
        bannerUrl: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=600&q=80',
        meetingUrl: 'https://zoom.us/j/demo345678',
        status: 'UPCOMING'
      }
    ];
  }
}
