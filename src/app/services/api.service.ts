import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  Product,
  ChecklistTask,
  HospitalPartner,
  NursePackage,
  DoctorSession,
  User,
  CartItem,
  CartProduct,
  PregnancyStage,
  ConsentDocument,
  ConsentDocumentType,
  ConsentStatus,
  Journey,
  JourneyStatus,
  Dashboard
} from '../models/maternal.models';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private readonly baseUrl = environment.apiUrl;

  // Reactive State Signals
  readonly cart = signal<CartItem[]>([]);
  readonly currentUser = signal<User | null>(null);
  readonly toastMessage = signal<string | null>(null);
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

    return this.http.get<Product[]>(url);
  }

  getChecklists(stage?: PregnancyStage): Observable<ChecklistTask[]> {
    let url = `${this.baseUrl}/checklists`;
    if (stage) url += `?stage=${stage}`;

    return this.http.get<ChecklistTask[]>(url);
  }

  getHospitals(city?: string, pincode?: string): Observable<HospitalPartner[]> {
    let url = `${this.baseUrl}/hospitals`;
    const params: string[] = [];
    if (city) params.push(`city=${encodeURIComponent(city)}`);
    if (pincode) params.push(`pincode=${encodeURIComponent(pincode)}`);
    if (params.length > 0) url += `?${params.join('&')}`;

    return this.http.get<HospitalPartner[]>(url);
  }

  getNursePackages(): Observable<NursePackage[]> {
    return this.http.get<NursePackage[]>(`${this.baseUrl}/nurse-companion/packages`);
  }

  bookNurse(bookingData: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/nurse-companion/book`, bookingData);
  }

  getDoctorSessions(): Observable<DoctorSession[]> {
    return this.http.get<DoctorSession[]>(`${this.baseUrl}/doctor-sessions`);
  }

  rsvpDoctor(rsvpData: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/doctor-sessions/rsvp`, rsvpData);
  }

  /**
   * Calls POST /api/v1/auth/firebase (per the AUTH CONTRACT) right after any Firebase
   * sign-in — no request body; the Bearer token (attached by the auth HttpInterceptor)
   * is the only input. Returns the user object directly (not wrapped). Errors always
   * propagate — including "API unreachable" — so a session is never faked.
   */
  loginWithFirebase(): Observable<User> {
    return this.http.post<User>(`${this.baseUrl}/auth/firebase`, {});
  }


  /**
   * GET /api/v1/me — the logged-in user's own profile (roadmap §0.6, switched from the
   * now-deprecated /users/me). Also returns `roles[]`, `pendingConsents` and
   * `hasActiveJourney`, used to route straight to the consent screen or journey setup.
   */
  getMe(): Observable<User> {
    return this.http.get<User>(`${this.baseUrl}/me`);
  }

  /**
   * PATCH /api/v1/me — requires a verified user. Per UI_INTEGRATION_GUIDE.md §7, `stage`/
   * `dueDate` are frozen as of the Journey migration: the API accepts but silently ignores
   * them now, so this only ever sends the three fields it still actually writes.
   */
  updateMe(payload: { firstName?: string; lastName?: string; phone?: string }): Observable<User> {
    return this.http.patch<User>(`${this.baseUrl}/me`, payload);
  }

  // --- Phase 1: Consent (roadmap §1.1) ---

  /** GET /api/v1/consent-documents/current — public; the active version of every document type. */
  getConsentDocuments(): Observable<ConsentDocument[]> {
    return this.http.get<ConsentDocument[]>(`${this.baseUrl}/consent-documents/current`);
  }

  /** GET /api/v1/me/consents — this user's grant history plus which types are still pending. */
  getMyConsents(): Observable<ConsentStatus> {
    return this.http.get<ConsentStatus>(`${this.baseUrl}/me/consents`);
  }

  /** POST /api/v1/me/consents — grants the given document type/version for the current user. */
  grantConsent(documentType: ConsentDocumentType, documentVersion: number): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/me/consents`, { documentType, documentVersion });
  }

  /** POST /api/v1/me/consents/{type}/revoke */
  revokeConsent(documentType: ConsentDocumentType): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/me/consents/${documentType}/revoke`, {});
  }

  // --- Phase 1: Journey (roadmap §1.2) ---

  /** POST /api/v1/me/journeys — fails with 409 JOURNEY_ALREADY_ACTIVE if one already exists. */
  createJourney(status: JourneyStatus, expectedDeliveryDate?: string | null): Observable<Journey> {
    return this.http.post<Journey>(`${this.baseUrl}/me/journeys`, { status, expectedDeliveryDate });
  }

  /** GET /api/v1/me/journeys — all journeys for the current user, most recent first. */
  getJourneys(): Observable<Journey[]> {
    return this.http.get<Journey[]>(`${this.baseUrl}/me/journeys`);
  }

  /** PATCH /api/v1/me/journeys/{id} — both fields optional, only non-null ones are applied. */
  updateJourney(id: number, patch: { status?: JourneyStatus; expectedDeliveryDate?: string | null }): Observable<Journey> {
    return this.http.patch<Journey>(`${this.baseUrl}/me/journeys/${id}`, patch);
  }

  /**
   * GET /api/v1/me/dashboard — requires consent (403 CONSENT_REQUIRED otherwise, handled
   * globally by the auth interceptor). Pulls profile/consent/journey/nextActions together;
   * `journeySetupRequired` drives the "Set up your journey" card.
   */
  getDashboard(): Observable<Dashboard> {
    return this.http.get<Dashboard>(`${this.baseUrl}/me/dashboard`);
  }

  // --- Cart Operations ---

  addToCart(product: CartProduct) {
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

  // --- Toast ---

  showToast(message: string) {
    this.toastMessage.set(message);
    setTimeout(() => {
      if (this.toastMessage() === message) {
        this.toastMessage.set(null);
      }
    }, 4000);
  }
}
