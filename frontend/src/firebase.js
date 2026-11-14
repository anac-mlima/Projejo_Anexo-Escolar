import { initializeApp } from 'firebase/app';
import { browserSessionPersistence, initializeAuth } from 'firebase/auth';

// O front-end usa o Firebase SOMENTE para login (Authentication).
// Firestore e Storage são acessados exclusivamente pela API Node.
const app = initializeApp({
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
});

// A sessão vale só para a aba atual: uma URL colada em outra aba ou janela pede login.
export const auth = initializeAuth(app, { persistence: browserSessionPersistence });