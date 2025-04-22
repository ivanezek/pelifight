import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Battle from './pages/Battle';
import Winner from './pages/Winner';
import GuessGame from './pages/GuessGame';
import Navbar from './components/Navbar';

function App() {
  return (
    <Router>
      <div className="bg-[rgb(182,134,151)] min-h-screen pb-24">
        <Routes>
          <Route path="/" element={<Battle />} />
          <Route path="/winner" element={<Winner />} />
          <Route path="/guess" element={<GuessGame />} />
        </Routes>
        <Navbar />
      </div>
    </Router>
  );
}

export default App; 