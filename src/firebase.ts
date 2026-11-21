import { initializeApp } from 'firebase/app';
import {
  GoogleAuthProvider,
  getAuth,
  reauthenticateWithPopup,
  signInWithPopup,
} from 'firebase/auth';
import { doc, getDocFromServer, getFirestore } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const typedConfig = firebaseConfig as typeof firebaseConfig & { firestoreDatabaseId?: string };
const app = initializeApp(typedConfig);
export const db = typedConfig.firestoreDatabaseId
  ? getFirestore(app, typedConfig.firestoreDatabaseId)
  : getFirestore(app);
export const auth = getAuth(app);

export const GOOGLE_DRIVE_SCOPES = [
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/drive.activity',
  'https://www.googleapis.com/auth/drive.activity.readonly',
  'https://www.googleapis.com/auth/drive.appdata',
  'https://www.googleapis.com/auth/drive.apps.readonly',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.install',
  'https://www.googleapis.com/auth/drive.meet.readonly',
  'https://www.googleapis.com/auth/drive.metadata',
  'https://www.googleapis.com/auth/drive.metadata.readonly',
  'https://www.googleapis.com/auth/drive.photos.readonly',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/drive.scripts',
] as const;

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });
for (const scope of GOOGLE_DRIVE_SCOPES) {
  googleProvider.addScope(scope);
}

// Keep Google Workspace OAuth access token strictly in JS memory (never localStorage/sessionStorage).
let driveAccessTokenMemory: string | null = null;
const driveTokenListeners = new Set<(token: string | null) => void>();

export function setGoogleDriveAccessToken(token: string | null) {
  driveAccessTokenMemory = token && token.trim().length > 0 ? token.trim() : null;
  for (const listener of driveTokenListeners) {
    listener(driveAccessTokenMemory);
  }
}

export function getGoogleDriveAccessToken(): string | null {
  return driveAccessTokenMemory;
}

export function clearGoogleDriveAccessToken() {
  setGoogleDriveAccessToken(null);
}

export function subscribeDriveTokenChange(
  listener: (token: string | null) => void
): () => void {
  driveTokenListeners.add(listener);
  return () => {
    driveTokenListeners.delete(listener);
  };
}

export async function connectGoogleDriveWithPopup(): Promise<string> {
  const result = auth.currentUser
    ? await reauthenticateWithPopup(auth.currentUser, googleProvider)
    : await signInWithPopup(auth, googleProvider);
  const credential = GoogleAuthProvider.credentialFromResult(result);
  const accessToken = credential?.accessToken;
  if (!accessToken) {
    throw new Error('Google did not return a Drive access token. Please try again and allow Drive access.');
  }
  setGoogleDriveAccessToken(accessToken);
  return accessToken;
}

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

void testConnection();
