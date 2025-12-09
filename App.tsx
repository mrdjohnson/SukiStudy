import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { waniKaniService } from './services/wanikaniService';
import { User, Summary, Subject, Assignment, SubjectType } from './types';
import { Header } from './components/Header';
import { Button } from './components/ui/Button';
import { Flashcard } from './components/Flashcard';
import { Icons } from './components/Icons';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

// --- Pages ---

const Login: React.FC<{ onLogin: (token: string) => void }> = ({ onLogin }) => {
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      waniKaniService.setToken(token);
      await waniKaniService.getUser(); // Validate token
      onLogin(token);
    } catch (err) {
      setError('Invalid API Token or Network Error');
      waniKaniService.setToken('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
        <div className="text-center mb-8">
          <div className="bg-indigo-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg transform rotate-3">
             <Icons.Brain className="text-white w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">SukiStudy</h1>
          <p className="text-gray-500 mt-2">Enter your Personal Access Token V2</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">API Token</label>
            <input
              type="text"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
              placeholder="Ex: 8a4c9b..."
              required
            />
          </div>
          
          {error && <div className="text-red-500 text-sm bg-red-50 p-3 rounded-lg border border-red-100">{error}</div>}

          <Button type="submit" className="w-full" size="lg" isLoading={loading}>
            Connect Account
          </Button>

          <p className="text-xs text-center text-gray-400">
            Token is stored locally in your browser.
          </p>
        </form>
      </div>
    </div>
  );
};

const Dashboard: React.FC<{ user: User | null }> = ({ user }) => {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await waniKaniService.getSummary();
        setSummary(data.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  if (loading || !user) return <div className="flex h-[50vh] items-center justify-center"><div className="animate-spin text-indigo-600"><Icons.RotateCcw /></div></div>;

  const lessonsCount = summary?.lessons?.[0]?.subject_ids?.length || 0;
  const reviewsCount = summary?.reviews?.[0]?.subject_ids?.length || 0;
  
  const chartData = [
    { name: 'Mon', reviews: 45 },
    { name: 'Tue', reviews: 52 },
    { name: 'Wed', reviews: 38 },
    { name: 'Thu', reviews: 65 },
    { name: 'Fri', reviews: 48 },
    { name: 'Sat', reviews: 20 },
    { name: 'Sun', reviews: 15 },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <h1 className="text-3xl font-bold mb-2">Welcome back, {user.username}!</h1>
          <p className="text-indigo-100 text-lg">You are on Level {user.level}. Keep up the momentum.</p>
        </div>
        <div className="absolute right-0 bottom-0 opacity-10 transform translate-y-1/4 translate-x-1/4">
          <Icons.BookOpen size={300} />
        </div>
      </div>

      {/* Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center hover:border-indigo-200 transition-colors group">
          <div className="bg-pink-100 p-4 rounded-full mb-4 group-hover:bg-pink-200 transition-colors">
            <Icons.Layers className="w-8 h-8 text-pink-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-1">{lessonsCount} Lessons</h3>
          <p className="text-gray-500 mb-6">New items to learn</p>
          <Button 
            variant={lessonsCount > 0 ? "primary" : "outline"} 
            disabled={lessonsCount === 0}
            onClick={() => window.location.hash = '/session/lesson'}
          >
            Start Lessons
          </Button>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center hover:border-indigo-200 transition-colors group">
          <div className="bg-sky-100 p-4 rounded-full mb-4 group-hover:bg-sky-200 transition-colors">
            <Icons.RotateCcw className="w-8 h-8 text-sky-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-1">{reviewsCount} Reviews</h3>
          <p className="text-gray-500 mb-6">Items to recall</p>
          <Button 
            variant={reviewsCount > 0 ? "secondary" : "outline"} 
            disabled={reviewsCount === 0}
            onClick={() => window.location.hash = '/session/review'}
          >
            Start Reviews
          </Button>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center hover:border-indigo-200 transition-colors group">
          <div className="bg-green-100 p-4 rounded-full mb-4 group-hover:bg-green-200 transition-colors">
            <Icons.Gamepad2 className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-1">Memory Match</h3>
          <p className="text-gray-500 mb-6">Review with a game</p>
          <Button 
            variant="outline"
            onClick={() => window.location.hash = '/session/game'}
          >
            Play Game
          </Button>
        </div>
      </div>
      
      {/* Quick Browse */}
       <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
         <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-gray-900">Current Level Content</h3>
             <Button variant="ghost" size="sm" onClick={() => window.location.hash = '/browse'}>
               Browse All <Icons.ChevronRight className="w-4 h-4 ml-1" />
             </Button>
         </div>
         <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} dy={10} />
                <Tooltip 
                  cursor={{fill: '#f3f4f6'}}
                  contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                />
                <Bar dataKey="reviews" radius={[4, 4, 4, 4]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 3 ? '#4f46e5' : '#e5e7eb'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
         </div>
       </div>
    </div>
  );
};

const Browse: React.FC<{ user: User | null }> = ({ user }) => {
  const [items, setItems] = useState<{subject: Subject, assignment?: Assignment}[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<{subject: Subject, assignment?: Assignment} | null>(null);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      setLoading(true);
      try {
        const subjectsCol = await waniKaniService.getLevelSubjects(user.level);
        // Safety check for data array
        const subjects = (subjectsCol?.data || []).map(r => ({ ...r.data, id: r.id, object: r.object, url: r.url }));
        
        // Fetch assignments for these subjects
        const subjectIds = subjects.map(s => s.id!).filter(Boolean);
        
        let assignments: Record<number, Assignment> = {};
        
        if (subjectIds.length > 0) {
          const assignmentsCol = await waniKaniService.getAssignments(subjectIds);
          if (assignmentsCol && assignmentsCol.data) {
             assignments = assignmentsCol.data.reduce((acc, curr) => {
              acc[curr.data.subject_id] = curr.data;
              return acc;
            }, {} as Record<number, Assignment>);
          }
        }

        setItems(subjects.map(s => ({
          subject: s,
          assignment: s.id ? assignments[s.id] : undefined
        })));

      } catch (err) {
        console.error("Browse Fetch Error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  const getSRSColor = (stage?: number) => {
    if (stage === undefined) return 'bg-gray-100 border-gray-200 text-gray-400';
    if (stage === 0) return 'bg-gray-100 border-gray-200';
    if (stage < 5) return 'bg-pink-100 border-pink-200 text-pink-700'; // Apprentice
    if (stage < 7) return 'bg-purple-100 border-purple-200 text-purple-700'; // Guru
    if (stage === 7) return 'bg-blue-100 border-blue-200 text-blue-700'; // Master
    if (stage === 8) return 'bg-sky-100 border-sky-200 text-sky-700'; // Enlightened
    return 'bg-yellow-100 border-yellow-200 text-yellow-700'; // Burned
  };

  if (loading) return <div className="flex h-[80vh] items-center justify-center"><div className="animate-spin text-indigo-600"><Icons.RotateCcw /></div></div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
         <h2 className="text-2xl font-bold text-gray-900">Level {user?.level} Content</h2>
         <Button variant="outline" size="sm" onClick={() => window.location.hash = '/'}>
           Back to Dashboard
         </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
        {items.map(({subject, assignment}) => (
          <button 
            key={subject.id}
            onClick={() => setSelectedItem({subject, assignment})}
            className={`
              aspect-square rounded-xl p-2 flex flex-col items-center justify-center border-2 transition-all hover:scale-105
              ${getSRSColor(assignment?.srs_stage)}
            `}
          >
            <div className="text-3xl font-bold mb-1">
              {subject.characters || (
                <div className="w-8 h-8">
                   {subject.character_images?.find(i => i.content_type === 'image/svg+xml')?.url && (
                     <img src={subject.character_images?.find(i => i.content_type === 'image/svg+xml')?.url} alt="" className="w-full h-full opacity-80" />
                   )}
                </div>
              )}
            </div>
            <div className="text-xs truncate max-w-full font-medium opacity-80">
              {subject.meanings?.[0]?.meaning}
            </div>
          </button>
        ))}
      </div>

      {/* Modal Overlay */}
      {selectedItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedItem(null)}>
          <div className="w-full max-w-2xl" onClick={e => e.stopPropagation()}>
            <Flashcard 
               subject={selectedItem.subject}
               assignment={selectedItem.assignment}
               hasPrev={false}
               hasNext={false}
               onPrev={() => setSelectedItem(null)}
               onNext={() => setSelectedItem(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

const Session: React.FC<{ mode: 'lesson' | 'review', user: User | null }> = ({ mode, user }) => {
  const [items, setItems] = useState<{subject: Subject, assignment?: Assignment}[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [complete, setComplete] = useState(false);
  const [drillDownStack, setDrillDownStack] = useState<Subject[]>([]);

  useEffect(() => {
    const fetchSessionData = async () => {
      setLoading(true);
      setDrillDownStack([]);
      setCurrentIndex(0);
      setComplete(false);
      try {
        // Fetch subjects
        const collection = await waniKaniService.getLevelSubjects(user?.level || 1);
        // Safety check for empty collection
        let subjects = (collection?.data || []).map(r => ({ ...r.data, id: r.id, object: r.object, url: r.url }));
        
        // Fetch assignments for context
        const subjectIds = subjects.map(s => s.id!).filter(Boolean);
        
        let assignments: Record<number, Assignment> = {};
        if (subjectIds.length > 0) {
           const assignmentsCol = await waniKaniService.getAssignments(subjectIds);
           if (assignmentsCol && assignmentsCol.data) {
             assignments = assignmentsCol.data.reduce((acc, curr) => {
              acc[curr.data.subject_id] = curr.data;
              return acc;
             }, {} as Record<number, Assignment>);
           }
        }

        // Filter/Sort logic (Simplified)
        let sessionItems = subjects.map(s => ({
          subject: s,
          assignment: s.id ? assignments[s.id] : undefined
        }));

        if (mode === 'review') {
           sessionItems = sessionItems.sort(() => Math.random() - 0.5);
        }

        setItems(sessionItems);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (user) fetchSessionData();
  }, [mode, user]);

  const handleNext = () => {
    if (currentIndex < items.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setDrillDownStack([]); 
    } else {
      setComplete(true);
    }
  };

  const handlePrev = () => {
    if (drillDownStack.length > 0) {
      setDrillDownStack(prev => prev.slice(0, -1));
    } else if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const handleDrillDown = (s: Subject) => {
    setDrillDownStack(prev => [...prev, s]);
  };

  const handleBreadcrumbClick = (index: number) => {
    if (index === -1) {
      setDrillDownStack([]);
    } else {
      setDrillDownStack(drillDownStack.slice(0, index + 1));
    }
  };

  if (loading) return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center gap-4">
      <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
      <p className="text-gray-500 font-medium">Loading session data...</p>
    </div>
  );

  if (complete) return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-4 text-center animate-fade-in">
       <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6">
         <Icons.CheckCircle className="w-12 h-12" />
       </div>
       <h2 className="text-3xl font-bold text-gray-900 mb-2">Session Complete!</h2>
       <p className="text-gray-500 mb-8 max-w-md">You've reviewed {items.length} items. Great job keeping up with your studies.</p>
       <Button onClick={() => window.location.hash = '/'}>Return to Dashboard</Button>
    </div>
  );

  if (items.length === 0) return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-4 text-center">
       <div className="w-20 h-20 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mb-4">
         <Icons.BookOpen className="w-10 h-10" />
       </div>
       <h2 className="text-xl font-bold text-gray-900 mb-2">No items found</h2>
       <p className="text-gray-500 mb-6">There are no items available for this session type.</p>
       <Button variant="outline" onClick={() => window.location.hash = '/'}>Go Back</Button>
    </div>
  );

  // Determine active subject
  const currentItem = items[currentIndex];
  const activeSubject = drillDownStack.length > 0 ? drillDownStack[drillDownStack.length - 1] : currentItem.subject;
  const activeAssignment = drillDownStack.length > 0 ? undefined : currentItem.assignment; // Don't show assignment for drilled down components usually, or fetch them if needed. simplified here.
  const isDrillDown = drillDownStack.length > 0;
  
  const progress = ((currentIndex + 1) / items.length) * 100;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 flex flex-col min-h-[calc(100vh-64px)]">
      
      {/* Navigation / Breadcrumbs */}
      <div className="mb-8">
        {!isDrillDown ? (
          <>
            <div className="flex justify-between text-sm font-medium text-gray-500 mb-2">
              <span>{mode === 'review' ? 'Review Session' : 'Lessons'}</span>
              <span>{currentIndex + 1} / {items.length}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-indigo-600 h-2 rounded-full transition-all duration-300 ease-out" 
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </>
        ) : (
          <div className="flex items-center flex-wrap gap-2 text-sm">
             <button 
               onClick={() => handleBreadcrumbClick(-1)}
               className="text-indigo-600 font-medium hover:underline flex items-center"
             >
               <Icons.Layers className="w-3 h-3 mr-1" />
               Session
             </button>
             {drillDownStack?.map((s, idx) => (
               <React.Fragment key={s.id || idx}>
                 <Icons.ChevronRight className="w-3 h-3 text-gray-400" />
                 <button 
                   onClick={() => handleBreadcrumbClick(idx)}
                   className={`hover:underline flex items-center ${idx === drillDownStack.length - 1 ? 'font-bold text-gray-800 pointer-events-none' : 'text-indigo-600 font-medium'}`}
                 >
                   {s.characters || s.meanings?.[0]?.meaning}
                 </button>
               </React.Fragment>
             ))}
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col justify-center">
        <Flashcard 
          subject={activeSubject} 
          assignment={activeAssignment}
          onNext={isDrillDown ? undefined : handleNext}
          onPrev={handlePrev}
          hasPrev={isDrillDown || currentIndex > 0}
          hasNext={!isDrillDown}
          onDrillDown={handleDrillDown}
        />
      </div>
    </div>
  );
};

// --- Memory Game ---

interface GameCard {
  id: string; // unique card id for rendering
  subjectId: number;
  content: string;
  type: 'character' | 'meaning' | 'reading';
  isFlipped: boolean;
  isMatched: boolean;
  subjectType: string;
}

const MemoryGame: React.FC<{ user: User | null }> = ({ user }) => {
  const [cards, setCards] = useState<GameCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [flippedIndices, setFlippedIndices] = useState<number[]>([]);
  const [matches, setMatches] = useState(0);
  const [timer, setTimer] = useState(300); // 5 minutes
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  
  useEffect(() => {
    const initGame = async () => {
      setLoading(true);
      try {
        const col = await waniKaniService.getLevelSubjects(user?.level || 1);
        const allSubjects = (col?.data || []).map(r => ({ ...r.data, id: r.id }));
        
        // Pick 6 random subjects
        const selected = allSubjects.sort(() => 0.5 - Math.random()).slice(0, 6);
        
        const gameCards: GameCard[] = [];
        
        selected.forEach((s) => {
          if (!s.id) return;
          const sType = s.object || 'vocabulary';
          
          // Card 1: The Character/Image
          let charContent = s.characters;
          if (!charContent && s.character_images) {
            const svg = s.character_images.find(i => i.content_type === 'image/svg+xml');
            charContent = svg ? svg.url : '?'; // Store URL in content if it's an image
          }

          gameCards.push({
            id: `${s.id}-char`,
            subjectId: s.id,
            content: charContent || '?',
            type: 'character',
            isFlipped: false,
            isMatched: false,
            subjectType: sType
          });

          // Card 2: Meaning or Reading (Randomized based on rules)
          // Radical -> Meaning (Radicals don't have reading in WK usually)
          // Kanji/Vocab -> 50/50 Meaning or Reading
          
          let pairType: 'meaning' | 'reading' = 'meaning';
          if (sType !== 'radical') {
            pairType = Math.random() > 0.5 ? 'reading' : 'meaning';
          }
          
          let pairContent = "";
          if (pairType === 'meaning') {
            pairContent = s.meanings.find(m => m.primary)?.meaning || s.meanings[0].meaning;
          } else {
             // For reading, use Hiragana/Katakana
             pairContent = s.readings?.find(r => r.primary)?.reading || s.readings?.[0]?.reading || "?";
          }

          gameCards.push({
            id: `${s.id}-pair`,
            subjectId: s.id,
            content: pairContent,
            type: pairType,
            isFlipped: false,
            isMatched: false,
            subjectType: sType
          });
        });

        // Shuffle cards
        setCards(gameCards.sort(() => 0.5 - Math.random()));
        setTimer(300);
        setMatches(0);
        setGameOver(false);
        setWon(false);
        setFlippedIndices([]);

      } catch (e) {
        console.error("Game init failed", e);
      } finally {
        setLoading(false);
      }
    };

    if (user) initGame();
  }, [user]);

  // Timer
  useEffect(() => {
    if (loading || gameOver || won) return;
    const interval = setInterval(() => {
      setTimer((t) => {
        if (t <= 1) {
          clearInterval(interval);
          setGameOver(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [loading, gameOver, won]);

  const handleCardClick = (index: number) => {
    if (gameOver || won || loading) return;
    if (cards[index].isFlipped || cards[index].isMatched) return;
    if (flippedIndices.length >= 2) return; // Prevent clicking more than 2

    const newFlipped = [...flippedIndices, index];
    setFlippedIndices(newFlipped);
    
    // Optimistic flip
    const newCards = [...cards];
    newCards[index].isFlipped = true;
    setCards(newCards);

    if (newFlipped.length === 2) {
      const idx1 = newFlipped[0];
      const idx2 = newFlipped[1];
      const card1 = cards[idx1];
      const card2 = cards[idx2];

      if (card1.subjectId === card2.subjectId) {
        // Match!
        setTimeout(() => {
          const matchedCards = [...cards];
          matchedCards[idx1].isMatched = true;
          matchedCards[idx2].isMatched = true;
          // Keep flipped but visually mark as done
          matchedCards[idx1].isFlipped = true; 
          matchedCards[idx2].isFlipped = true;
          setCards(matchedCards);
          setFlippedIndices([]);
          
          const newMatchCount = matches + 1;
          setMatches(newMatchCount);
          if (newMatchCount === cards.length / 2) {
            setWon(true);
          }
        }, 500);
      } else {
        // No match
        setTimeout(() => {
          const resetCards = [...cards];
          resetCards[idx1].isFlipped = false;
          resetCards[idx2].isFlipped = false;
          setCards(resetCards);
          setFlippedIndices([]);
        }, 1000);
      }
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const getColor = (type: string) => {
    if (type === 'radical') return 'text-sky-500 bg-sky-50 border-sky-100';
    if (type === 'kanji') return 'text-pink-500 bg-pink-50 border-pink-100';
    return 'text-purple-500 bg-purple-50 border-purple-100';
  };

  if (loading) return <div className="flex h-[80vh] items-center justify-center"><div className="animate-spin text-indigo-600"><Icons.RotateCcw /></div></div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Icons.Gamepad2 className="text-indigo-600" />
            Memory Match
          </h2>
          <p className="text-gray-500 text-sm">Match characters to their meanings or readings.</p>
        </div>
        <div className={`text-2xl font-mono font-bold ${timer < 60 ? 'text-red-500 animate-pulse' : 'text-gray-700'}`}>
           <div className="flex items-center gap-2">
             <Icons.Clock className="w-6 h-6" />
             {formatTime(timer)}
           </div>
        </div>
      </div>

      {!gameOver && !won ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
          {cards.map((card, idx) => (
             <div 
               key={card.id}
               onClick={() => handleCardClick(idx)}
               className={`
                 aspect-[3/4] rounded-xl cursor-pointer perspective-1000 transition-all duration-300
                 ${card.isMatched ? 'opacity-50 grayscale scale-95 pointer-events-none' : ''}
               `}
             >
                <div className={`relative w-full h-full transition-transform duration-500 transform-style-3d ${card.isFlipped ? 'rotate-y-180' : ''}`}>
                   {/* Back of Card (Hidden side) - Shows standard Pattern */}
                   <div className="absolute inset-0 backface-hidden bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-md border-2 border-indigo-400 flex items-center justify-center">
                      <Icons.Brain className="text-white/30 w-12 h-12" />
                   </div>

                   {/* Front of Card (Revealed side) */}
                   <div className={`absolute inset-0 backface-hidden rotate-y-180 bg-white rounded-xl shadow-lg border-2 flex flex-col items-center justify-center p-2 text-center ${getColor(card.subjectType)}`}>
                      {card.content.startsWith('http') ? (
                        <img src={card.content} className="w-16 h-16 object-contain" alt="" />
                      ) : (
                        <span className={`${card.type === 'character' ? 'text-4xl font-bold' : 'text-lg font-medium'}`}>
                          {card.content}
                        </span>
                      )}
                      <span className="text-[10px] uppercase tracking-wider opacity-60 mt-2">{card.type}</span>
                   </div>
                </div>
             </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 bg-white rounded-3xl shadow-lg border border-gray-100 text-center">
           {won ? (
             <>
                <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6">
                  <Icons.CheckCircle className="w-12 h-12" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">You Won!</h2>
                <p className="text-gray-500 mb-8">Completed with {formatTime(timer)} remaining.</p>
             </>
           ) : (
             <>
                <div className="w-24 h-24 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-6">
                  <Icons.X className="w-12 h-12" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">Time's Up!</h2>
                <p className="text-gray-500 mb-8">Good effort. Try again to beat the clock.</p>
             </>
           )}
           <div className="flex gap-4">
             <Button onClick={() => window.location.reload()}>Play Again</Button>
             <Button variant="outline" onClick={() => window.location.hash = '/'}>Dashboard</Button>
           </div>
        </div>
      )}

      <style>{`
        .rotate-y-180 { transform: rotateY(180deg); }
        .transform-style-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; }
        .perspective-1000 { perspective: 1000px; }
      `}</style>
    </div>
  );
};


// --- Main App ---

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
             localStorage.removeItem('wk_token');
          }
        } catch (e) {
          console.error("Auth Error", e);
          // Don't auto-remove token on network error, only on auth fail (401 handled in service?)
          // For now, let's just fail silently and stay on login if user object isn't set
        }
      }
      setLoading(false);
    };
    init();
  }, []);

  const handleLogin = async (token: string) => {
    localStorage.setItem('wk_token', token);
    const userData = await waniKaniService.getUser();
    setUser(userData.data);
  };

  const handleLogout = () => {
    localStorage.removeItem('wk_token');
    setUser(null);
    window.location.hash = '/login';
  };

  if (loading) return null;

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
            <Route path="/session/game" element={user ? <MemoryGame user={user} /> : <Navigate to="/login" />} />
            <Route path="/browse" element={user ? <Browse user={user} /> : <Navigate to="/login" />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}