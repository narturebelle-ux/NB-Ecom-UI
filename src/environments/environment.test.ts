// Used for local development and CI test builds (`ng serve`, `ng build -c test`).
// Firebase apiKey is intentionally left as the placeholder so FirebaseAuthService
// falls back to its built-in dev-simulation mode (mock Google user, OTP "123456").
export const environment = {
  production: false,
  apiUrl: 'http://localhost:8085/api/v1',
  firebase: {
    apiKey: 'YOUR_FIREBASE_API_KEY',
    authDomain: 'narturebelle-app.firebaseapp.com',
    projectId: 'narturebelle-app',
    storageBucket: 'narturebelle-app.appspot.com',
    messagingSenderId: '123456789012',
    appId: '1:123456789012:web:abcdef123456'
  }
};
