import { FirebaseError, getApp, getApps, initializeApp } from 'firebase/app';
import {
  GoogleAuthProvider,
  OAuthProvider,
  getAuth,
  signInWithPopup,
  signOut,
  type AuthProvider,
} from 'firebase/auth';

export type OAuthProviderName = 'Google' | 'Apple';

const firebaseConfig = {
  apiKey: 'AIzaSyB3JRQKuOF0ruoosB1f5yFMs6sXkPABK88',
  authDomain: 'fayrly-ce8ac.firebaseapp.com',
  projectId: 'fayrly-ce8ac',
  storageBucket: 'fayrly-ce8ac.firebasestorage.app',
  messagingSenderId: '82427319495',
  appId: '1:82427319495:web:007bc4b172ba7dae165ae2',
};

function firebaseAuth() {
  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  return getAuth(app);
}

function buildProvider(provider: OAuthProviderName): AuthProvider {
  if (provider === 'Google') {
    const google = new GoogleAuthProvider();
    google.setCustomParameters({ prompt: 'select_account' });
    return google;
  }
  const apple = new OAuthProvider('apple.com');
  apple.addScope('email');
  apple.addScope('name');
  return apple;
}

export async function providerIdToken(provider: OAuthProviderName): Promise<string> {
  const auth = firebaseAuth();
  const credential = await signInWithPopup(auth, buildProvider(provider));
  try {
    return await credential.user.getIdToken();
  } finally {
    // The backend issues its own session; the Firebase session is only needed for the token.
    await signOut(auth).catch(() => undefined);
  }
}

export function providerErrorMessage(error: unknown, provider: OAuthProviderName): string | null {
  if (!(error instanceof FirebaseError)) {
    return null;
  }
  switch (error.code) {
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return `Jendela masuk ${provider} ditutup. Coba lagi.`;
    case 'auth/popup-blocked':
      return 'Popup diblokir browser. Izinkan popup untuk situs ini lalu coba lagi.';
    case 'auth/operation-not-allowed':
      return `Masuk dengan ${provider} belum diaktifkan di Firebase.`;
    case 'auth/unauthorized-domain':
      return 'Domain ini belum diizinkan di Firebase Authentication.';
    case 'auth/account-exists-with-different-credential':
      return 'Email ini sudah terdaftar dengan metode masuk lain.';
    case 'auth/network-request-failed':
      return 'Tidak dapat menghubungi Firebase. Periksa koneksimu.';
    default:
      return `Tidak dapat masuk dengan ${provider}. Coba lagi.`;
  }
}
