import { getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import {
  GoogleAuthProvider,
  getAuth,
  inMemoryPersistence,
  setPersistence,
  signInWithPopup,
  signOut,
  type Auth,
} from 'firebase/auth';
import { doc, getDocFromServer, getFirestore } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const typedConfig = firebaseConfig as typeof firebaseConfig & { firestoreDatabaseId?: string };
const app = initializeApp(typedConfig);
export const db = typedConfig.firestoreDatabaseId
  ? getFirestore(app, typedConfig.firestoreDatabaseId)
  : getFirestore(app);
export const auth = getAuth(app);

export const SYNTHETIC_AUTH_DOMAIN = 'accounts.sslgnnchs26.site';

export function normalizeUsername(input: string): string {
  return input.trim().toLowerCase().replace(/^@+/, '');
}

export function isValidUsername(username: string): boolean {
  return /^[a-z0-9._-]{3,60}$/.test(normalizeUsername(username));
}

export function isSyntheticUsernameEmail(email: string): boolean {
  return email.trim().toLowerCase().endsWith(`@${SYNTHETIC_AUTH_DOMAIN}`);
}

export function extractUsernameFromEmail(email: string): string | undefined {
  const lower = email.trim().toLowerCase();
  const suffix = `@${SYNTHETIC_AUTH_DOMAIN}`;
  return lower.endsWith(suffix) ? lower.slice(0, -suffix.length) : undefined;
}

export function usernameOrEmailToAuthEmail(input: string): string {
  const clean = normalizeUsername(input);
  if (clean.includes('@')) return clean;
  return `${clean}@${SYNTHETIC_AUTH_DOMAIN}`;
}

function getSecondaryNamedApp(name: string): FirebaseApp {
  const existing = getApps().find((a) => a.name === name);
  return existing || initializeApp(typedConfig, name);
}

export async function getProvisionerAuth(): Promise<Auth> {
  const secondaryApp = getSecondaryNamedApp('account-provisioner');
  const secondaryAuth = getAuth(secondaryApp);
  await setPersistence(secondaryAuth, inMemoryPersistence);
  return secondaryAuth;
}

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
  const driveApp = getSecondaryNamedApp('drive-oauth-helper');
  const driveAuth = getAuth(driveApp);
  await setPersistence(driveAuth, inMemoryPersistence);
  const result = await signInWithPopup(driveAuth, googleProvider);
  const credential = GoogleAuthProvider.credentialFromResult(result);
  const accessToken = credential?.accessToken;
  await signOut(driveAuth).catch(() => undefined);
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
