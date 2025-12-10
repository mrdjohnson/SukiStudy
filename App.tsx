
import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { waniKaniService } from './services/wanikaniService';
import { User } from './types';
import { Header } from './components/Header';
import { Icons } from './components/Icons';
import { SettingsProvider } from './contexts/SettingsContext';

// Pages
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Browse } from './pages/Browse';
import { Session } from './pages/Session';
import { GameMenu } from './pages/games/GameMenu';
import { MemoryGame } from './pages/games/MemoryGame';
import { QuizGame } from './pages/games/QuizGame';
import { ShiritoriGame } from './pages/games/ShiritoriGame';
import { MatchingGame } from './pages/games/SortingGame';
import { ConnectGame } from './pages/games/ConnectGame';
import { VariationsQuizGame } from './pages/games/VariationsQuizGame';
import { RecallGame } from './pages/games/RecallGame';
import { TypingGame } from './pages/games/TypingGame';
import { CustomGameSetup } from './pages/games/CustomGameSetup';
import { RadicalCompositionGame } from './pages/games/RadicalCompositionGame';
import { AudioQuizGame } from './pages/games/AudioQuizGame';
import { CustomSession } from './pages/games/CustomSession';

const Layout: React.FC<{ user: User | null, onLogout: () => void, children: React.ReactNode }> = ({ user, onLogout, children }) => {
    const location = useLocation();
    const hideHeader = location.pathname === '/login';

    return (
        <div className="min-h-screen bg-gray-50 font-sans">
            {!hideHeader && <Header user={user} onLogout={onLogout} />}
            <main>
                {children}
            </main>
        </div>
    );
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

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
             // Only clear if specifically unauthorized
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
    <SettingsProvider>
      <Router>
        <Layout user={user} onLogout={handleLogout}>
            <Routes>
              <Route path="/login" element={!user ? <Login onLogin={handleLogin} /> : <Navigate to="/" />} />
              <Route path="/" element={user ? <Dashboard user={user} /> : <Navigate to="/login" />} />
              <Route path="/session/lesson" element={user ? <Session mode="lesson" user={user} /> : <Navigate to="/login" />} />
              <Route path="/session/review" element={user ? <Session mode="review" user={user} /> : <Navigate to="/login" />} />
              
              <Route path="/session/games" element={user ? <GameMenu /> : <Navigate to="/login" />} />
              <Route path="/session/games/memory" element={user ? <MemoryGame user={user} /> : <Navigate to="/login" />} />
              <Route path="/session/games/quiz" element={user ? <QuizGame user={user} /> : <Navigate to="/login" />} />
              <Route path="/session/games/shiritori" element={user ? <ShiritoriGame user={user} /> : <Navigate to="/login" />} />
              <Route path="/session/games/sorting" element={user ? <MatchingGame user={user} /> : <Navigate to="/login" />} />
              <Route path="/session/games/connect" element={user ? <ConnectGame user={user} /> : <Navigate to="/login" />} />
              <Route path="/session/games/variations" element={user ? <VariationsQuizGame user={user} /> : <Navigate to="/login" />} />
              <Route path="/session/games/recall" element={user ? <RecallGame user={user} /> : <Navigate to="/login" />} />
              <Route path="/session/games/typing" element={user ? <TypingGame user={user} /> : <Navigate to="/login" />} />
              <Route path="/session/games/radical-composition" element={user ? <RadicalCompositionGame user={user} /> : <Navigate to="/login" />} />
              <Route path="/session/games/audio-quiz" element={user ? <AudioQuizGame user={user} /> : <Navigate to="/login" />} />
              
              <Route path="/session/custom" element={user ? <CustomGameSetup user={user} /> : <Navigate to="/login" />} />
              <Route path="/session/custom/play" element={user ? <CustomSession user={user} /> : <Navigate to="/login" />} />

              <Route path="/browse" element={user ? <Browse user={user} /> : <Navigate to="/login" />} />
            </Routes>
        </Layout>
      </Router>
    </SettingsProvider>
  );
}
