import { Injectable, signal } from '@angular/core';
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  Auth,
  GoogleAuthProvider,
  signInWithPopup,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  linkWithPhoneNumber,
  linkWithCredential,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  fetchSignInMethodsForEmail,
  ConfirmationResult,
  AuthCredential,
  signOut as fbSignOut,
  User as FirebaseUser
} from 'firebase/auth';
import { environment } from '../../environments/environment';

/** Shown instead of the old simulated sign-in when the build has no real Firebase web config. */
const FIREBASE_NOT_CONFIGURED =
  'Sign-in isn’t available: this build has no Firebase configuration. Run it with the staging or production settings.';
const RECAPTCHA_NOT_READY = 'Phone verification couldn’t start. Please reload the page and try again.';

@Injectable({
  providedIn: 'root'
})
export class FirebaseAuthService {
  private app: FirebaseApp | null = null;
  private auth: Auth | null = null;

  readonly isConfigured = signal<boolean>(false);
  readonly currentFirebaseUser = signal<FirebaseUser | null>(null);

  constructor() {
    this.initFirebase();
  }

  private initFirebase(): void {
    const config = environment.firebase;
    // Check if user has replaced placeholder apiKey
    if (config.apiKey && config.apiKey !== 'YOUR_FIREBASE_API_KEY') {
      try {
        if (!getApps().length) {
          this.app = initializeApp(config);
        } else {
          this.app = getApps()[0];
        }
        this.auth = getAuth(this.app);
        this.isConfigured.set(true);

        this.auth.onAuthStateChanged(user => {
          this.currentFirebaseUser.set(user);
        });
      } catch (err) {
        console.error('Error initializing Firebase:', err);
        this.isConfigured.set(false);
      }
    } else {
      this.isConfigured.set(false);
    }
  }

  /**
   * Real Google Sign-In via Firebase Popup
   */
  async loginWithGoogle(): Promise<{ idToken: string; user: any }> {
    if (!this.isConfigured() || !this.auth) {
      throw new Error(FIREBASE_NOT_CONFIGURED);
    }

    const provider = new GoogleAuthProvider();
    provider.addScope('profile');
    provider.addScope('email');
    provider.setCustomParameters({ prompt: 'select_account' });

    const result = await signInWithPopup(this.auth, provider);
    const idToken = await result.user.getIdToken();

    return {
      idToken,
      user: {
        displayName: result.user.displayName,
        email: result.user.email,
        emailVerified: result.user.emailVerified,
        photoURL: result.user.photoURL,
        uid: result.user.uid
      }
    };
  }

  /**
   * Email + password sign-up. Sends a verification email immediately after account creation.
   */
  async signUpWithEmail(email: string, password: string): Promise<{ idToken: string; user: any }> {
    if (!this.isConfigured() || !this.auth) {
      throw new Error(FIREBASE_NOT_CONFIGURED);
    }

    const credential = await createUserWithEmailAndPassword(this.auth, email, password);
    await sendEmailVerification(credential.user);
    const idToken = await credential.user.getIdToken();

    return {
      idToken,
      user: { email: credential.user.email, emailVerified: credential.user.emailVerified, uid: credential.user.uid }
    };
  }

  /**
   * Email + password sign-in.
   */
  async loginWithEmail(email: string, password: string): Promise<{ idToken: string; user: any }> {
    if (!this.isConfigured() || !this.auth) {
      throw new Error(FIREBASE_NOT_CONFIGURED);
    }

    const credential = await signInWithEmailAndPassword(this.auth, email, password);
    const idToken = await credential.user.getIdToken();

    return {
      idToken,
      user: { email: credential.user.email, emailVerified: credential.user.emailVerified, uid: credential.user.uid }
    };
  }

  /**
   * Sends a password-reset email.
   */
  async sendPasswordReset(email: string): Promise<void> {
    if (!this.isConfigured() || !this.auth) {
      return; // dev simulation: no-op
    }
    await sendPasswordResetEmail(this.auth, email);
  }

  /**
   * Re-sends the verification email to the currently signed-in user.
   */
  async resendVerificationEmail(): Promise<void> {
    if (!this.isConfigured() || !this.auth?.currentUser) {
      return; // dev simulation: no-op
    }
    await sendEmailVerification(this.auth.currentUser);
  }

  /**
   * Reloads the current user from Firebase (picks up a just-clicked verification link)
   * and returns a FORCE-REFRESHED ID token, so the new email_verified claim is actually
   * present the next time it's sent to the API — a token fetched without forceRefresh
   * can still carry the stale, pre-verification claim.
   */
  async reloadAndGetFreshToken(): Promise<string | null> {
    if (!this.isConfigured() || !this.auth?.currentUser) {
      return null;
    }
    await this.auth.currentUser.reload();
    return await this.auth.currentUser.getIdToken(true);
  }

  /**
   * Current Firebase ID token, refreshed automatically by the SDK when it's close to
   * expiry. Pass forceRefresh=true right after an action that changes token claims
   * (e.g. linking a phone number) so the new claim is picked up immediately.
   */
  async getIdToken(forceRefresh = false): Promise<string | null> {
    if (!this.isConfigured() || !this.auth?.currentUser) {
      return null;
    }
    return await this.auth.currentUser.getIdToken(forceRefresh);
  }

  isEmailVerified(): boolean {
    return this.auth?.currentUser?.emailVerified ?? false;
  }

  getCurrentEmail(): string | null {
    return this.auth?.currentUser?.email ?? null;
  }

  /**
   * Looks up which sign-in methods already exist for an email — used when Firebase
   * throws 'auth/account-exists-with-different-credential' during Google sign-in, so
   * the UI can tell the user which method to use instead.
   */
  async getSignInMethodsForEmail(email: string): Promise<string[]> {
    if (!this.isConfigured() || !this.auth) {
      return ['password'];
    }
    return await fetchSignInMethodsForEmail(this.auth, email);
  }

  /**
   * Links a pending credential (e.g. a Google credential recovered from an
   * 'account-exists-with-different-credential' error) onto the currently signed-in user.
   */
  async linkPendingCredential(credential: AuthCredential): Promise<void> {
    if (!this.isConfigured() || !this.auth?.currentUser) {
      return; // dev simulation: no-op
    }
    await linkWithCredential(this.auth.currentUser, credential);
  }

  /**
   * Initializes reCAPTCHA for Phone Authentication
   */
  initRecaptcha(containerId: string): RecaptchaVerifier | null {
    if (!this.isConfigured() || !this.auth) {
      return null;
    }

    try {
      return new RecaptchaVerifier(this.auth, containerId, {
        size: 'invisible',
        callback: () => {
          // reCAPTCHA solved
        }
      });
    } catch (err) {
      console.warn('reCAPTCHA init error:', err);
      return null;
    }
  }

  /**
   * Sends real SMS OTP via Firebase Phone Auth
   */
  async sendPhoneOtp(
    phoneNumber: string,
    appVerifier?: RecaptchaVerifier | null
  ): Promise<ConfirmationResult> {
    const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+91${phoneNumber}`;

    if (!this.isConfigured() || !this.auth) {
      throw new Error(FIREBASE_NOT_CONFIGURED);
    }
    if (!appVerifier) {
      throw new Error(RECAPTCHA_NOT_READY);
    }

    return await signInWithPhoneNumber(this.auth, formattedPhone, appVerifier);
  }

  /**
   * Verifies the SMS OTP code
   */
  async verifyPhoneOtp(
    confirmationResult: any,
    otpCode: string
  ): Promise<{ idToken: string; phone: string }> {
    if (!this.isConfigured() || !confirmationResult) {
      throw new Error(FIREBASE_NOT_CONFIGURED);
    }

    // Real Firebase confirmation
    const userCredential = await confirmationResult.confirm(otpCode);
    const idToken = await userCredential.user.getIdToken();

    return {
      idToken,
      phone: userCredential.user.phoneNumber || ''
    };
  }

  /**
   * Starts linking a phone number onto the CURRENTLY SIGNED-IN user (profile page "add
   * phone" flow) — distinct from sendPhoneOtp, which signs in with phone as the primary method.
   */
  async linkPhoneToAccount(
    phoneNumber: string,
    appVerifier?: RecaptchaVerifier | null
  ): Promise<ConfirmationResult> {
    const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+91${phoneNumber}`;

    if (!this.isConfigured() || !this.auth?.currentUser) {
      throw new Error(FIREBASE_NOT_CONFIGURED);
    }
    if (!appVerifier) {
      throw new Error(RECAPTCHA_NOT_READY);
    }

    return await linkWithPhoneNumber(this.auth.currentUser, formattedPhone, appVerifier);
  }

  /**
   * Confirms the OTP for a phone-link started by linkPhoneToAccount, and returns a
   * force-refreshed ID token so the new phone_number claim is picked up immediately.
   */
  async confirmPhoneLink(confirmationResult: any, otpCode: string): Promise<{ idToken: string; phone: string }> {
    if (!this.isConfigured() || !confirmationResult) {
      throw new Error(FIREBASE_NOT_CONFIGURED);
    }

    const userCredential = await confirmationResult.confirm(otpCode);
    const idToken = await userCredential.user.getIdToken(true);

    return {
      idToken,
      phone: userCredential.user.phoneNumber || ''
    };
  }

  /**
   * Signs out from Firebase
   */
  async logout(): Promise<void> {
    if (this.auth) {
      await fbSignOut(this.auth);
    }
    this.currentFirebaseUser.set(null);
  }
}

export { GoogleAuthProvider };
export type { AuthCredential };
