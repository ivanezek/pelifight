import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Card } from '../components/ui/card';
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
    <div className="flex flex-col items-center justify-center min-h-screen bg-[rgb(182,134,151)]">
      <Card className="w-full max-w-sm p-8 rounded-2xl shadow-xl bg-white/95">
        <h2 className="text-2xl font-bold mb-6 text-center">
          {mode === 'login' ? 'Iniciar sesión' : 'Registrarse'}
        </h2>
        <div className="flex justify-center mb-6 gap-2">
          <Button
            variant={mode === 'login' ? 'default' : 'outline'}
            className="w-1/2"
            onClick={() => setMode('login')}
            disabled={loading}
          >
            Iniciar sesión
          </Button>
          <Button
            variant={mode === 'register' ? 'default' : 'outline'}
            className="w-1/2"
            onClick={() => setMode('register')}
            disabled={loading}
          >
            Registrarse
          </Button>
        </div>
        {mode === 'login' ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                placeholder="Contraseña"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              Iniciar sesión
            </Button>
          </form>
        ) : (
          <form onSubmit={handleSignUp} className="space-y-4">
            <div>
              <Label htmlFor="username">Nombre de usuario</Label>
              <Input
                id="username"
                type="text"
                placeholder="Nombre de usuario"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                placeholder="Contraseña"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full bg-green-600 hover:bg-green-700" disabled={loading}>
              Registrarse
            </Button>
          </form>
        )}
        <div className="my-4 flex items-center gap-2">
          <span className="flex-1 border-t border-gray-300" />
          <span className="text-gray-500 text-xs">o</span>
          <span className="flex-1 border-t border-gray-300" />
        </div>
        <Button onClick={handleGoogle} className="w-full bg-blue-600 hover:bg-blue-700" disabled={loading}>
          Iniciar sesión con Google
        </Button>
        {error && <div className="text-red-600 mt-4 text-center">{error}</div>}
      </Card>
    </div>
  );
};

export default Auth;
