import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Battle from './pages/Battle';
import Winner from './pages/Winner';
import GuessGame from './pages/GuessGame';
import Navbar from './components/Navbar';
import Auth from './pages/Auth';
import Profile from './pages/Profile';
import { useEffect, useState } from 'react';
import { supabase } from './lib/supabaseClient';
import type { Session } from '@supabase/supabase-js';
import { ThemeProvider } from './context/ThemeContext';
import ThemeSwitcher from './components/ThemeSwitcher';
import Blur from './pages/guess/Blur';
import WhoAmI from './pages/guess/WhoAmI';
import Impostor from './pages/guess/Impostor';
import Score from './pages/guess/Score';
import Release from './pages/guess/Release';

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [profileChecked, setProfileChecked] = useState(false);
  const [needsProfile, setNeedsProfile] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => {
      listener?.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const checkProfile = async () => {
      if (!session) {
        setProfileChecked(true);
        setNeedsProfile(false);
        return;
      }
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        setProfileChecked(true);
        setNeedsProfile(false);
        return;
      }
      const { data } = await supabase
        .from('profiles')
        .select('username, avatar_url')
        .eq('id', userData.user.id)
        .single();
      if (!data || !data.username) {
        setNeedsProfile(true);
      } else {
        setNeedsProfile(false);
      }
      setProfileChecked(true);
    };
    checkProfile();
  }, [session]);

  useEffect(() => {
    // Redirige a /guess si está logueado y la ruta es /
    if (session && window.location.pathname === '/') {
      window.location.replace('/guess');
    }
  }, [session]);

  if (!session) {
    return <Auth onAuth={() => window.location.reload()} />;
  }

  if (!profileChecked) {
    return <div className="flex min-h-screen items-center justify-center">Cargando...</div>;
  }

  if (needsProfile) {
    return <Profile onProfileSaved={() => setNeedsProfile(false)} />;
  }

  return (
    <ThemeProvider>
      <Router>
        <div className="min-h-screen pb-24 bg-gradient-to-b dark:from-black dark:to-green-900 from-white to-yellow-100 transition-colors duration-500">
          <ThemeSwitcher />
          <Routes>
            <Route path="/" element={<Battle />} />
            <Route path="/winner" element={<Winner />} />
            <Route path="/guess" element={<GuessGame />} />
            <Route path="/guess/blur" element={<Blur />} />
            <Route path="/guess/whoami" element={<WhoAmI />} />
            <Route path="/guess/impostor" element={<Impostor />} />
            <Route path="/guess/score" element={<Score />} />
            <Route path="/guess/release" element={<Release />} />
            <Route path="/profile" element={<Profile />} />
          </Routes>
          <Navbar />
        </div>
      </Router>
    </ThemeProvider>
  );
}

export default App;