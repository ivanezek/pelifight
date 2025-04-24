import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Trophy, Brain } from 'lucide-react';
import { FiLogOut, FiUser } from 'react-icons/fi';
import { supabase } from '../lib/supabaseClient';
import logo from '/logo.png';

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const links = [
    {
      to: '/',
      icon: <Trophy className="w-5 h-5" />,
      label: 'Torneo',
      color: 'from-orange-500 to-pink-500'
    },
    {
      to: '/guess',
      icon: <Brain className="w-5 h-5" />,
      label: 'Adivina',
      color: 'from-blue-500 to-purple-500'
    }
  ];

  return (
    <>
      <header className="w-full flex items-center justify-between px-6 py-4 fixed top-0 left-0 z-50 bg-white/90 dark:bg-black/90 shadow-md border-b border-white/20 dark:border-green-800">
        <div className="flex items-center gap-2">
          <img src={logo} alt="Logo" className="h-9 w-auto mr-2" />
        </div>
        <div className="flex-1 flex justify-end">
          {/* Aquí iría el switcher de darkmode, si existe como componente */}
          {/* Si el switcher está en otro componente, asegúrate de importarlo y colocarlo aquí */}
        </div>
      </header>
      <nav className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-40 flex gap-2 items-center bg-white/90 dark:bg-black/90 shadow-lg rounded-full px-4 py-2 backdrop-blur-md border border-white/20 dark:border-green-800`}
        style={{ color: '#222', fontWeight: 600 }}>
        {links.map((link) => {
          const isActive = location.pathname === link.to;

          return (
            <Link
              key={link.to}
              to={link.to}
              className={`flex items-center gap-2 px-4 py-2 rounded-full font-semibold text-sm focus:outline-none transition
                ${isActive ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white dark:from-green-800 dark:to-green-500 dark:text-white' : 
                'bg-transparent hover:bg-gray-100 dark:hover:bg-green-900 text-gray-900 dark:text-white'}`}
            >
              <span role="img" aria-label={link.label}>{link.icon}</span> {link.label}
            </Link>
          );
        })}
        <Link
          to="/profile"
          className="flex items-center gap-2 px-4 py-2 rounded-full font-semibold text-sm focus:outline-none transition bg-transparent hover:bg-gray-100 dark:hover:bg-green-900 text-gray-900 dark:text-white"
        >
          <FiUser className="w-5 h-5" /> Perfil
        </Link>
        <button onClick={handleLogout} className="flex items-center gap-2 px-2 py-2 rounded-full text-sm hover:bg-red-50 dark:hover:bg-red-900 transition text-red-500 dark:text-red-400">
          <FiLogOut className="w-5 h-5" />
        </button>
      </nav>
    </>
  );
};

export default Navbar;