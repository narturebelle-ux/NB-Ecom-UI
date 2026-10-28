// Default file compiled in when no build configuration applies a fileReplacement
// (i.e. `ng build` with no -c flag, before defaultConfiguration kicks in).
// Actual per-environment values live in environment.test.ts / .staging.ts / .prod.ts
// and are swapped in via the "fileReplacements" entries in angular.json.
export const environment = {
  production: false,
  apiUrl: 'http://localhost:8085/api/v1',
  firebase: {
    // Replace with your Firebase Web configuration from Firebase Console:
    // Firebase Console -> Project Settings -> General -> Your apps -> Web app
    apiKey: 'YOUR_FIREBASE_API_KEY',
    authDomain: 'narturebelle-app.firebaseapp.com',
    projectId: 'narturebelle-app',
    storageBucket: 'narturebelle-app.appspot.com',
    messagingSenderId: '123456789012',
    appId: '1:123456789012:web:abcdef123456'
  }
};
