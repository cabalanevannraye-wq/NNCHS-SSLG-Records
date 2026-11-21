import { useState } from 'react';
import { GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { AlertCircle, ArrowRight, LogOut } from 'lucide-react';
import {
  auth,
  clearGoogleDriveAccessToken,
  googleProvider,
  setGoogleDriveAccessToken,
} from '../firebase.ts';
import { SSLGCrest } from './SSLGCrest.tsx';

interface LoginViewProps {
  authBlockState?: {
    status: 'unauthorized' | 'disabled' | 'unverified';
    email: string;
  } | null;
  onClearBlockState?: () => void;
}

export function LoginView({ authBlockState, onClearBlockState }: LoginViewProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        setGoogleDriveAccessToken(credential.accessToken);
      }
    } catch (err) {
      const code = (err as { code?: string })?.code;
      if (code === 'auth/popup-closed-by-user') {
        setError('Sign-in window was closed before completing Google authentication.');
      } else if (code === 'auth/popup-blocked') {
        setError('Pop-up was blocked by your browser. Please allow pop-ups for this site and try again.');
      } else if (code === 'auth/unauthorized-domain') {
        const host = typeof window !== 'undefined' ? window.location.hostname : 'this domain';
        setError(
          `Domain "${host}" is not yet authorized in Firebase Authentication. Add "${host}" under Firebase Console → Authentication → Settings → Authorized domains.`
        );
      } else {
        setError(err instanceof Error ? err.message : 'Unable to sign in with Google.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchAccount = async () => {
    setError('');
    clearGoogleDriveAccessToken();
    await signOut(auth);
    onClearBlockState?.();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-sm p-8 sm:p-10">
        <div className="flex flex-col items-center text-center mb-8">
          <SSLGCrest className="w-20 h-20 mb-4" />
          <h1 className="text-2xl font-bold tracking-tight text-slate-950">SSLG Records</h1>
          <p className="text-xs font-medium text-slate-500 mt-1">
            NNCHS · Supreme Secondary Learner Government
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3 rounded-lg bg-rose-50 border border-rose-200 text-sm font-medium text-rose-800">
            {error}
          </div>
        )}

        {authBlockState ? (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-950 space-y-2">
              <div className="flex items-center gap-2 font-bold">
                <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
                <span>
                  {authBlockState.status === 'disabled'
                    ? 'Account Deactivated'
                    : authBlockState.status === 'unverified'
                    ? 'Email Verification Required'
                    : 'Pending Admin Authorization'}
                </span>
              </div>
              <p className="text-xs text-amber-900 leading-relaxed">
                {authBlockState.status === 'disabled' ? (
                  <>
                    The account <strong>{authBlockState.email}</strong> has been deactivated by the
                    SSLG President (Admin).
                  </>
                ) : authBlockState.status === 'unverified' ? (
                  <>
                    Your Google account email must be verified before accessing SSLG Records.
                  </>
                ) : (
                  <>
                    <strong>{authBlockState.email}</strong> is not yet registered in the SSLG
                    Records portal. Ask the SSLG President (Admin) to add your Google email under{' '}
                    <strong>Accounts &amp; Settings</strong>.
                  </>
                )}
              </p>
            </div>

            <button
              type="button"
              onClick={handleSwitchAccount}
              className="w-full py-2.5 px-4 bg-slate-950 hover:bg-blue-900 text-white font-semibold text-sm rounded-lg transition-colors inline-flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out / Switch Google Account</span>
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <button
              type="button"
              disabled={loading}
              onClick={handleGoogleSignIn}
              className="w-full py-3 px-4 bg-slate-950 hover:bg-blue-900 text-white font-semibold text-sm rounded-lg transition-colors inline-flex items-center justify-center gap-3 disabled:opacity-60 cursor-pointer"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="#EA4335"
                  d="M12 10.2v3.9h5.5c-.2 1.3-1.5 3.9-5.5 3.9-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.7 3.5 14.6 2.6 12 2.6 6.8 2.6 2.6 6.8 2.6 12s4.2 9.4 9.4 9.4c5.4 0 9-3.8 9-9.1 0-.6-.1-1.1-.2-1.6H12z"
                />
                <path
                  fill="#34A853"
                  d="M3.7 7.4l3.2 2.3C7.8 7.6 9.7 6.3 12 6.3c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.7 3.5 14.6 2.6 12 2.6 8.3 2.6 5.1 4.6 3.7 7.4z"
                />
                <path
                  fill="#FBBC05"
                  d="M12 21.4c2.5 0 4.7-.8 6.2-2.3l-2.9-2.4c-.8.6-1.9 1-3.3 1-3.9 0-5.2-2.6-5.5-3.9l-3.2 2.5c1.4 2.9 4.5 5.1 8.7 5.1z"
                />
                <path
                  fill="#4285F4"
                  d="M20.8 12.3c0-.6-.1-1.1-.2-1.6H12v3.9h5.5c-.3 1.4-1.1 2.4-2.1 3l2.9 2.4c1.7-1.6 2.5-3.9 2.5-7.7z"
                />
              </svg>
              <span>{loading ? 'Connecting to Google...' : 'Sign In with Google'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        <p className="mt-6 text-center text-xs text-slate-400">
          Authorized SSLG Officers &amp; School Clubs only. Accounts are issued by the SSLG President (Admin).
        </p>
      </div>
    </div>
  );
}
