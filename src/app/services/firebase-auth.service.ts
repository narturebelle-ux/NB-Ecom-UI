import { Injectable, signal } from '@angular/core';
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  Auth,
  GoogleAuthProvider,
  signInWithPopup,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
  signOut as fbSignOut,
  User as FirebaseUser
} from 'firebase/auth';
import { environment } from '../../environments/environment';

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
      // Dev simulation fallback when API keys are pending
      return {
        idToken: 'mock_google_id_token_' + Date.now(),
        user: {
          displayName: 'Ananya Verma',
          email: 'ananya.verma@example.com',
          photoURL: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80'
        }
      };
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
        photoURL: result.user.photoURL,
        uid: result.user.uid
      }
    };
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
  ): Promise<ConfirmationResult | { isMock: boolean; verificationId: string }> {
    const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+91${phoneNumber}`;

    if (!this.isConfigured() || !this.auth || !appVerifier) {
      // Dev simulation fallback
      return {
        isMock: true,
        verificationId: 'mock_vid_' + Date.now()
      };
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
    if (!this.isConfigured() || confirmationResult?.isMock) {
      // Dev simulation fallback
      if (otpCode === '123456') {
        return {
          idToken: 'mock_phone_id_token_' + Date.now(),
          phone: '+919876543210'
        };
      } else {
        throw new Error('Invalid OTP code. For demo mode, enter 123456.');
      }
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
   * Signs out from Firebase
   */
  async logout(): Promise<void> {
    if (this.auth) {
      await fbSignOut(this.auth);
    }
    this.currentFirebaseUser.set(null);
  }
}
