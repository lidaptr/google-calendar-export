import { useEffect, useState } from 'react';
import { getCachedToken } from './utils/storage';
import { signOut } from './utils/auth';
import SignInView from './components/SignInView';
import ExportView from './components/ExportView';

function App() {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCachedToken().then((cached) => {
      setToken(cached);
      setLoading(false);
    });
  }, []);

  function handleSignIn(newToken: string) {
    setToken(newToken);
  }

  async function handleSignOut() {
    await signOut();
    setToken(null);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full w-full bg-white">
        <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!token) {
    return <SignInView onSignIn={handleSignIn} />;
  }

  return <ExportView token={token} onSignOut={handleSignOut} />;
}

export default App;
