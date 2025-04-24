import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';

const Auth = ({ onAuth }: { onAuth: () => void }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }
    // Insert into profiles
    if (data.user) {
      await supabase.from('profiles').insert({
        id: data.user.id,
        username,
        avatar_url: null
      });
      onAuth();
    }
    setLoading(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      setError(signInError.message);
    } else {
      onAuth();
    }
    setLoading(false);
  };

  const handleGoogle = async () => {
    setLoading(true);
    setError(null);
    const { error: googleError } = await supabase.auth.signInWithOAuth({ provider: 'google' });
    if (googleError) {
      setError(googleError.message);
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-purple-300 via-pink-200 to-green-100 dark:from-[#18181b] dark:via-[#23272f] dark:to-[#1e293b] transition-colors duration-500">
      <div className="backdrop-blur-xl bg-white/80 dark:bg-black/70 border border-gray-200 dark:border-gray-800 shadow-2xl rounded-3xl p-0 max-w-md w-full mx-4 relative">
        {/* Tabs */}
        <div className="flex rounded-t-3xl overflow-hidden">
          <button
            className={`flex-1 py-4 text-lg font-bold transition-colors duration-200 ${
              mode === 'login'
                ? 'bg-white dark:bg-black text-purple-700 dark:text-green-300 shadow-inner'
                : 'bg-transparent text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-900'
            }`}
            onClick={() => setMode('login')}
            disabled={loading}
            style={{ outline: 'none' }}
          >
            Iniciar sesión
          </button>
          <button
            className={`flex-1 py-4 text-lg font-bold transition-colors duration-200 ${
              mode === 'register'
                ? 'bg-white dark:bg-black text-purple-700 dark:text-green-300 shadow-inner'
                : 'bg-transparent text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-900'
            }`}
            onClick={() => setMode('register')}
            disabled={loading}
            style={{ outline: 'none' }}
          >
            Registrarse
          </button>
        </div>
        {/* Content */}
        <div className="px-8 py-10">
          <h2 className="text-2xl font-extrabold mb-8 text-center text-gray-900 dark:text-white tracking-tight">
            {mode === 'login' ? 'Bienvenido de nuevo' : 'Crea tu cuenta'}
          </h2>
          {mode === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <Label htmlFor="email" className="text-gray-700 dark:text-gray-200">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white/80 dark:bg-black/60 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-purple-400 dark:focus:ring-green-400 focus:border-transparent transition"
                />
              </div>
              <div>
                <Label htmlFor="password" className="text-gray-700 dark:text-gray-200">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Contraseña"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white/80 dark:bg-black/60 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-purple-400 dark:focus:ring-green-400 focus:border-transparent transition"
                />
              </div>
              <Button type="submit" className="w-full py-3 rounded-xl font-bold bg-gradient-to-r from-purple-500 to-green-400 dark:from-green-700 dark:to-purple-700 text-white shadow-lg hover:scale-[1.03] transition-transform" disabled={loading}>
                {loading ? 'Cargando...' : 'Iniciar sesión'}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleSignUp} className="space-y-6">
              <div>
                <Label htmlFor="username" className="text-gray-700 dark:text-gray-200">Nombre de usuario</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Nombre de usuario"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  required
                  className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white/80 dark:bg-black/60 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-purple-400 dark:focus:ring-green-400 focus:border-transparent transition"
                />
              </div>
              <div>
                <Label htmlFor="email" className="text-gray-700 dark:text-gray-200">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white/80 dark:bg-black/60 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-purple-400 dark:focus:ring-green-400 focus:border-transparent transition"
                />
              </div>
              <div>
                <Label htmlFor="password" className="text-gray-700 dark:text-gray-200">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Contraseña"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white/80 dark:bg-black/60 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-purple-400 dark:focus:ring-green-400 focus:border-transparent transition"
                />
              </div>
              <Button type="submit" className="w-full py-3 rounded-xl font-bold bg-gradient-to-r from-green-400 to-purple-500 dark:from-green-700 dark:to-purple-700 text-white shadow-lg hover:scale-[1.03] transition-transform" disabled={loading}>
                {loading ? 'Cargando...' : 'Registrarse'}
              </Button>
            </form>
          )}
          <div className="my-6 flex items-center gap-2">
            <span className="flex-1 border-t border-gray-300 dark:border-gray-800" />
            <span className="text-gray-500 dark:text-gray-400 text-xs">o</span>
            <span className="flex-1 border-t border-gray-300 dark:border-gray-800" />
          </div>
          <Button
            onClick={handleGoogle}
            className="w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:scale-[1.03] transition-transform"
            disabled={loading}
            type="button"
          >
            <svg className="w-5 h-5" viewBox="0 0 48 48"><g><path fill="#4285F4" d="M24 9.5c3.54 0 6.45 1.22 8.47 3.22l6.32-6.32C34.73 2.47 29.77 0 24 0 14.82 0 6.87 5.82 2.99 14.09l7.56 5.86C12.16 14.03 17.62 9.5 24 9.5z"/><path fill="#34A853" d="M46.1 24.55c0-1.64-.15-3.21-.42-4.73H24v9.02h12.42c-.54 2.91-2.19 5.38-4.66 7.05l7.24 5.63c4.23-3.91 6.7-9.67 6.7-16.97z"/><path fill="#FBBC05" d="M10.55 28.15a14.48 14.48 0 010-8.3l-7.56-5.86A23.94 23.94 0 000 24c0 3.77.9 7.34 2.49 10.48l8.06-6.33z"/><path fill="#EA4335" d="M24 48c6.48 0 11.92-2.15 15.89-5.85l-7.24-5.63c-2.02 1.36-4.6 2.17-8.65 2.17-6.38 0-11.84-4.53-13.45-10.61l-8.06 6.33C6.87 42.18 14.82 48 24 48z"/><path fill="none" d="M0 0h48v48H0z"/></g></svg>
            Iniciar sesión con Google
          </Button>
          {error && <div className="text-red-600 dark:text-red-400 mt-6 text-center font-semibold animate-pulse">{error}</div>}
        </div>
      </div>
    </div>
  );
};

export default Auth;
