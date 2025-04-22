import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Trophy, Brain } from 'lucide-react';

const Navbar = () => {
  const location = useLocation();

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
    <nav className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
      <div className="bg-white/90 backdrop-blur-sm px-6 py-3 rounded-full shadow-lg border border-white/20">
        <div className="flex items-center gap-4">
          {links.map((link) => {
            const isActive = location.pathname === link.to;
            
            return (
              <Link
                key={link.to}
                to={link.to}
                className="relative px-4 py-2"
              >
                <div className="flex items-center gap-2">
                  {isActive && (
                    <motion.div
                      layoutId="bubble"
                      className={`absolute inset-0 bg-gradient-to-r ${link.color} rounded-full -z-10`}
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                  <span className={`${isActive ? 'text-white' : 'text-gray-700'}`}>
                    {link.icon}
                  </span>
                  <span className={`${isActive ? 'text-white' : 'text-gray-700'} font-medium`}>
                    {link.label}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default Navbar; 