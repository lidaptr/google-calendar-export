import { useState } from 'react';
import { getAuthToken } from '../utils/auth';

interface SignInViewProps {
  onSignIn: (token: string) => void;
}

export default function SignInView({ onSignIn }: SignInViewProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignIn() {
    setLoading(true);
    setError(null);
    try {
      const token = await getAuthToken();
      onSignIn(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center h-full w-full bg-white px-8">
      <div className="flex flex-col items-center gap-4 w-full max-w-xs">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-gray-900">Calendar Export</h1>
          <p className="mt-2 text-sm text-gray-500">
            Export your Google Calendar events to Google Sheets
          </p>
        </div>

        <button
          onClick={handleSignIn}
          disabled={loading}
          className="mt-4 w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg px-4 py-2.5 transition-colors"
        >
          {loading ? (
            <>
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Signing in…
            </>
          ) : (
            'Sign in with Google'
          )}
        </button>

        {error && (
          <p className="text-sm text-red-600 text-center">{error}</p>
        )}
      </div>
    </div>
  );
}
