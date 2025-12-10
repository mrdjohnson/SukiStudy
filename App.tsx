import React, { useState, useEffect } from 'react';
import { BrowserRouter, Route, Routes, Navigate, useLocation } from 'react-router'
import { waniKaniService } from './services/wanikaniService';
import { syncService } from './services/syncService';
import { users } from './services/db';
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
  console.log('rendering app')
    const location = useLocation();
    const hideHeader = location.pathname === '/login';

    if (hideHeader) {
        return (
            <div className="min-h-screen bg-gray-50 font-sans">
                <main>
                    {children}
                </main>
            </div>
        );
    }

    return (
        <Header user={user} onLogout={onLogout}>
            {children}
        </Header>
    );
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  // Init Auth & Sync
  useEffect(() => {
    const init = async () => {
      const storedToken = localStorage.getItem('wk_token');
      if (storedToken) {
        waniKaniService.setToken(storedToken);
        
        // 1. Try to load user from DB first (Offline support)
        const dbUser = users.findOne({ id: 'current' });
        if (dbUser) {
           setUser(dbUser);
           setLoading(false);
        }

        // 2. Background Sync
        try {
          // If we didn't find a user locally, we must wait for network
          if (!dbUser) {
              const userData = await waniKaniService.getUser();
              if (userData && userData.data) {
                  setUser(userData.data);
                  users.insert({ ...userData.data, id: 'current' });
              }
          }

          // Trigger Data Sync
          setIsSyncing(true);
          await syncService.sync();
          setIsSyncing(false);
          
          // Refresh user from DB to ensure latest
          const updatedUser = users.findOne({ id: 'current' });
          if (updatedUser) setUser(updatedUser);

        } catch (e: any) {
          console.error("Auth/Sync Error", e);
          if (e.message && (e.message.includes("401") || e.message.includes("Invalid"))) {
              localStorage.removeItem('wk_token');
              await syncService.clearData();
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
    users.insert({ ...userData, id: 'current' });
    
    // Trigger initial sync
    setIsSyncing(true);
    syncService.sync().then(() => setIsSyncing(false));
  };

  const handleLogout = async () => {
    localStorage.removeItem('wk_token');
    await syncService.clearData();
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
      <BrowserRouter>
        <Layout user={user} onLogout={handleLogout}>
            {isSyncing && user && (
                <div className="fixed bottom-4 right-4 bg-indigo-600 text-white text-xs px-3 py-1 rounded-full shadow-lg z-50 flex items-center gap-2 animate-pulse">
                    <Icons.RotateCcw className="w-3 h-3 animate-spin" />
                    Syncing...
                </div>
            )}
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
      </BrowserRouter>
    </SettingsProvider>
  );
}