
import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { waniKaniService } from './services/wanikaniService';
import { User } from './types';
import { Header } from './components/Header';
import { Icons } from './components/Icons';

// Pages
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Browse } from './pages/Browse';
import { Session } from './pages/Session';
import { GameMenu } from './pages/games/GameMenu';
import { MemoryGame } from './pages/games/MemoryGame';
import { QuizGame } from './pages/games/QuizGame';
import { ShiritoriGame } from './pages/games/ShiritoriGame';
import { SortingGame } from './pages/games/SortingGame';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(()=> {
    window.location.hash = '/' 
  }, [])

  // Init Auth
  useEffect(() => {
    const init = async () => {
      const storedToken = localStorage.getItem('wk_token');
      if (storedToken) {
        waniKaniService.setToken(storedToken);
        try {
          const userData = await waniKaniService.getUser();
          if (userData && userData.data) {
             setUser(userData.data);
          } else {
             // Only clear if specifically unauthorized, otherwise might be network error
             // But for simplicity in this demo, we keep token if error is not 401
          }
        } catch (e: any) {
          console.error("Auth Error", e);
          if (e.message.includes("401") || e.message.includes("Invalid")) {
              localStorage.removeItem('wk_token');
          }
        }
      }
      setLoading(false);
    };
    init();
  }, []);

  const handleLogin = (token: string, userData: User) => {
    localStorage.setItem('wk_token', token);
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('wk_token');
    setUser(null);
    window.location.hash = '/login';
  };

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
       <div className="bg-white p-4 rounded-full shadow-lg mb-4">
         <Icons.Brain className="w-12 h-12 text-indigo-600 animate-pulse" />
       </div>
       <p className="text-gray-500 font-medium">Loading SukiStudy...</p>
    </div>
  );

  return (
    <Router>
      <div className="min-h-screen bg-gray-50 font-sans">
        <Header user={user} onLogout={handleLogout} />
        
        <main>
          <Routes>
            <Route path="/login" element={!user ? <Login onLogin={handleLogin} /> : <Navigate to="/" />} />
            <Route path="/" element={user ? <Dashboard user={user} /> : <Navigate to="/login" />} />
            <Route path="/session/lesson" element={user ? <Session mode="lesson" user={user} /> : <Navigate to="/login" />} />
            <Route path="/session/review" element={user ? <Session mode="review" user={user} /> : <Navigate to="/login" />} />
            
            <Route path="/session/games" element={user ? <GameMenu /> : <Navigate to="/login" />} />
            <Route path="/session/games/memory" element={user ? <MemoryGame user={user} /> : <Navigate to="/login" />} />
            <Route path="/session/games/quiz" element={user ? <QuizGame user={user} /> : <Navigate to="/login" />} />
            <Route path="/session/games/shiritori" element={user ? <ShiritoriGame user={user} /> : <Navigate to="/login" />} />
            <Route path="/session/games/sorting" element={user ? <SortingGame user={user} /> : <Navigate to="/login" />} />

            <Route path="/browse" element={user ? <Browse user={user} /> : <Navigate to="/login" />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}
