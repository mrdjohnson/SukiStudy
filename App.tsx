
import React, { useState, useEffect, useCallback } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { waniKaniService } from './services/wanikaniService';
import { User, Summary, Subject, Assignment, SubjectType } from './types';
import { Header } from './components/Header';
import { Button } from './components/ui/Button';
import { Flashcard } from './components/Flashcard';
import { Icons } from './components/Icons';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

// --- Shared Helpers ---

// Simple WanaKana-ish converter (Romaji -> Hiragana) for Shiritori input
const toHiragana = (input: string): string => {
  const table: Record<string, string> = {
    'a': 'あ', 'i': 'い', 'u': 'う', 'e': 'え', 'o': 'お',
    'ka': 'か', 'ki': 'き', 'ku': 'く', 'ke': 'け', 'ko': 'こ',
    'sa': 'さ', 'shi': 'し', 'su': 'す', 'se': 'せ', 'so': 'そ',
    'ta': 'た', 'chi': 'ち', 'tsu': 'つ', 'te': 'て', 'to': 'と',
    'na': 'な', 'ni': 'に', 'nu': 'ぬ', 'ne': 'ね', 'no': 'の',
    'ha': 'は', 'hi': 'ひ', 'fu': 'ふ', 'he': 'へ', 'ho': 'ほ',
    'ma': 'ま', 'mi': 'み', 'mu': 'む', 'me': 'め', 'mo': 'も',
    'ya': 'や', 'yu': 'ゆ', 'yo': 'よ',
    'ra': 'ら', 'ri': 'り', 'ru': 'る', 're': 'れ', 'ro': 'ろ',
    'wa': 'わ', 'wo': 'を', 'n': 'ん',
    'ga': 'が', 'gi': 'ぎ', 'gu': 'ぐ', 'ge': 'げ', 'go': 'ご',
    'za': 'ざ', 'ji': 'じ', 'zu': 'ず', 'ze': 'ぜ', 'zo': 'ぞ',
    'da': 'だ', 'de': 'で', 'do': 'ど',
    'ba': 'ば', 'bi': 'び', 'bu': 'ぶ', 'be': 'べ', 'bo': 'ぼ',
    'pa': 'ぱ', 'pi': 'ぴ', 'pu': 'ぷ', 'pe': 'ぺ', 'po': 'ぽ',
    'kya': 'きゃ', 'kyu': 'きゅ', 'kyo': 'きょ',
    'sha': 'しゃ', 'shu': 'しゅ', 'sho': 'しょ',
    'cha': 'ちゃ', 'chu': 'ちゅ', 'cho': 'ちょ',
    'nya': 'にゃ', 'nyu': 'にゅ', 'nyo': 'にょ',
    'hya': 'ひゃ', 'hyu': 'ひゅ', 'hyo': 'ひょ',
    'mya': 'みゃ', 'myu': 'みゅ', 'myo': 'みょ',
    'rya': 'りゃ', 'ryu': 'りゅ', 'ryo': 'りょ',
    'gya': 'ぎゃ', 'gyu': 'ぎゅ', 'gyo': 'ぎょ',
    'ja': 'じゃ', 'ju': 'じゅ', 'jo': 'じょ',
    'bya': 'びゃ', 'byu': 'びゅ', 'byo': 'びょ',
    'pya': 'ぴゃ', 'pyu': 'ぴゅ', 'pyo': 'ぴょ',
    '-': 'ー'
  };
  
  // Naive replacement for basic inputs
  let str = input.toLowerCase();
  
  // Double consonants (small tsu)
  str = str.replace(/([kstnhmyrwgzbpd])\1/g, 'っ$1');

  // Sort keys by length descending to match longest first (e.g., 'shi' before 's')
  const keys = Object.keys(table).sort((a, b) => b.length - a.length);
  
  keys.forEach(key => {
    const regex = new RegExp(key, 'g');
    str = str.replace(regex, table[key]);
  });
  
  return str;
};

// Hook to fetch only learned items
const useLearnedSubjects = (user: User | null) => {
  const [items, setItems] = useState<{subject: Subject, assignment: Assignment}[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        // Fetch learned assignments (SRS > 0)
        // We fetch current level and maybe level - 1 to ensure enough items
        const levels = [user.level];
        if (user.level > 1) levels.push(user.level - 1);
        if (user.level > 2) levels.push(user.level - 2);

        const assignmentsCol = await waniKaniService.getAssignments([], levels, [1,2,3,4,5,6,7,8,9]);
        
        if (!assignmentsCol.data || assignmentsCol.data.length === 0) {
          setItems([]);
          setLoading(false);
          return;
        }

        // Extract Subject IDs
        const assignmentMap = new Map<number, Assignment>();
        const subjectIds: number[] = [];
        assignmentsCol.data.forEach(a => {
            assignmentMap.set(a.data.subject_id, a.data);
            subjectIds.push(a.data.subject_id);
        });

        // Batch fetch subjects (chunking if necessary, but WK API handles up to 1000 usually ok, or we assume small set for mini-games)
        const subjectsCol = await waniKaniService.getSubjects(subjectIds.slice(0, 100)); // Limit to latest 100 learned for performance in games
        
        if (subjectsCol && subjectsCol.data) {
          const combined = subjectsCol.data.map(s => ({
            subject: { ...s.data, id: s.id, object: s.object, url: s.url },
            assignment: assignmentMap.get(s.id)!
          }));
          setItems(combined);
        } else {
          setItems([]);
        }
      } catch (e) {
        console.error("Failed to load learned items", e);
        setItems([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  return { items, loading };
};

// --- Pages ---

const Login: React.FC<{ onLogin: (token: string, user: User) => void }> = ({ onLogin }) => {
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      waniKaniService.setToken(token);
      const userRes = await waniKaniService.getUser(); // Validate token
      onLogin(token, userRes.data);
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
  const navigate = useNavigate();

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
            onClick={() => navigate('/session/lesson')}
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
            onClick={() => navigate('/session/review')}
          >
            Start Reviews
          </Button>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center hover:border-indigo-200 transition-colors group">
          <div className="bg-green-100 p-4 rounded-full mb-4 group-hover:bg-green-200 transition-colors">
            <Icons.Gamepad2 className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-1">Mini Games</h3>
          <p className="text-gray-500 mb-6">Review while having fun</p>
          <Button 
            variant="outline"
            onClick={() => navigate('/session/games')}
          >
            Play Games
          </Button>
        </div>
      </div>
      
      {/* Quick Browse */}
       <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
         <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-gray-900">Current Level Content</h3>
             <Button variant="ghost" size="sm" onClick={() => navigate('/browse')}>
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

// --- Game Menu ---

const GameMenu: React.FC = () => {
  const navigate = useNavigate();

  const games = [
    {
      id: 'memory',
      name: 'Memory Match',
      desc: 'Match characters to their meanings or readings.',
      icon: Icons.Brain,
      color: 'bg-purple-100 text-purple-600'
    },
    {
      id: 'quiz',
      name: 'Quick Quiz',
      desc: 'Multiple choice speed run of your learned items.',
      icon: Icons.FileQuestion,
      color: 'bg-orange-100 text-orange-600'
    },
    {
      id: 'shiritori',
      name: 'Shiritori Chain',
      desc: 'Link vocabulary words by their last character.',
      icon: Icons.Link,
      color: 'bg-pink-100 text-pink-600'
    },
    {
      id: 'sorting',
      name: 'Sort & Order',
      desc: 'Match keys to values by reordering list items.',
      icon: Icons.ArrowUpDown,
      color: 'bg-blue-100 text-blue-600'
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" onClick={() => navigate('/')}><Icons.ChevronLeft /></Button>
        <h1 className="text-3xl font-bold text-gray-900">Mini Games</h1>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {games.map(game => (
          <button 
            key={game.id}
            onClick={() => navigate(`/session/games/${game.id}`)}
            className="flex items-center p-6 bg-white rounded-2xl shadow-sm border border-gray-100 hover:border-indigo-200 hover:shadow-md transition-all text-left"
          >
            <div className={`p-4 rounded-xl mr-6 ${game.color}`}>
              <game.icon className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">{game.name}</h3>
              <p className="text-gray-500 mt-1">{game.desc}</p>
            </div>
            <Icons.ChevronRight className="ml-auto text-gray-300" />
          </button>
        ))}
      </div>
    </div>
  );
};

// --- Memory Game ---

interface GameCard {
  id: string; 
  subjectId: number;
  content: string;
  type: 'character' | 'meaning' | 'reading';
  isFlipped: boolean;
  isMatched: boolean;
  subjectType: string;
}

const MemoryGame: React.FC<{ user: User | null }> = ({ user }) => {
  const { items: learnedItems, loading: dataLoading } = useLearnedSubjects(user);
  const [cards, setCards] = useState<GameCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [flippedIndices, setFlippedIndices] = useState<number[]>([]);
  const [matches, setMatches] = useState(0);
  const [timer, setTimer] = useState(300);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (dataLoading) return;
    if (learnedItems.length < 6) {
        setLoading(false);
        return; 
    }
    
    // Pick 6 random subjects
    const selected = [...learnedItems].sort(() => 0.5 - Math.random()).slice(0, 6);
    
    const gameCards: GameCard[] = [];
    
    selected.forEach(({ subject: s }) => {
      const sType = s.object || 'vocabulary';
      
      let charContent = s.characters;
      if (!charContent && s.character_images) {
        const svg = s.character_images.find(i => i.content_type === 'image/svg+xml');
        charContent = svg ? svg.url : '?';
      }

      gameCards.push({
        id: `${s.id}-char`,
        subjectId: s.id!,
        content: charContent || '?',
        type: 'character',
        isFlipped: false,
        isMatched: false,
        subjectType: sType
      });

      let pairType: 'meaning' | 'reading' = 'meaning';
      if (sType !== 'radical') {
        pairType = Math.random() > 0.5 ? 'reading' : 'meaning';
      }
      
      let pairContent = "";
      if (pairType === 'meaning') {
        pairContent = s.meanings.find(m => m.primary)?.meaning || s.meanings[0].meaning;
      } else {
         pairContent = s.readings?.find(r => r.primary)?.reading || s.readings?.[0]?.reading || "?";
      }

      gameCards.push({
        id: `${s.id}-pair`,
        subjectId: s.id!,
        content: pairContent,
        type: pairType,
        isFlipped: false,
        isMatched: false,
        subjectType: sType
      });
    });

    setCards(gameCards.sort(() => 0.5 - Math.random()));
    setLoading(false);
    setTimer(300);
  }, [learnedItems, dataLoading]);

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
    if (flippedIndices.length >= 2) return;

    const newFlipped = [...flippedIndices, index];
    setFlippedIndices(newFlipped);
    
    const newCards = [...cards];
    newCards[index].isFlipped = true;
    setCards(newCards);

    if (newFlipped.length === 2) {
      const idx1 = newFlipped[0];
      const idx2 = newFlipped[1];
      const card1 = cards[idx1];
      const card2 = cards[idx2];

      if (card1.subjectId === card2.subjectId) {
        setTimeout(() => {
          const matchedCards = [...cards];
          matchedCards[idx1].isMatched = true;
          matchedCards[idx2].isMatched = true;
          setCards(matchedCards);
          setFlippedIndices([]);
          
          const newMatchCount = matches + 1;
          setMatches(newMatchCount);
          if (newMatchCount === cards.length / 2) {
            setWon(true);
          }
        }, 500);
      } else {
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

  if (loading || dataLoading) return <div className="flex h-[80vh] items-center justify-center"><div className="animate-spin text-indigo-600"><Icons.RotateCcw /></div></div>;

  if (learnedItems.length < 6) return <div className="p-8 text-center text-gray-500">Not enough learned items to play. Start some lessons!</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
         <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Button variant="ghost" onClick={() => navigate('/session/games')}><Icons.ChevronLeft /></Button>
            Memory Match
         </h2>
         <div className="text-xl font-mono font-bold text-gray-700">
             {formatTime(timer)}
         </div>
      </div>

      {!gameOver && !won ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
          {cards.map((card, idx) => (
             <div 
               key={card.id}
               onClick={() => handleCardClick(idx)}
               className={`aspect-[3/4] rounded-xl cursor-pointer perspective-1000 transition-all duration-300 ${card.isMatched ? 'opacity-50 grayscale pointer-events-none' : ''}`}
             >
                <div className={`relative w-full h-full transition-transform duration-500 transform-style-3d ${card.isFlipped ? 'rotate-y-180' : ''}`}>
                   <div className="absolute inset-0 backface-hidden bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-md border-2 border-indigo-400 flex items-center justify-center">
                      <Icons.Brain className="text-white/30 w-12 h-12" />
                   </div>
                   <div className={`absolute inset-0 backface-hidden rotate-y-180 bg-white rounded-xl shadow-lg border-2 flex flex-col items-center justify-center p-2 text-center`}>
                      {card.content.startsWith('http') ? (
                        <img src={card.content} className="w-16 h-16 object-contain" alt="" />
                      ) : (
                        <span className={`${card.type === 'character' ? 'text-4xl font-bold' : 'text-lg font-medium'}`}>
                          {card.content}
                        </span>
                      )}
                   </div>
                </div>
             </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
            <h2 className="text-3xl font-bold mb-4">{won ? "You Won!" : "Time's Up!"}</h2>
            <Button onClick={() => window.location.reload()}>Play Again</Button>
        </div>
      )}
      <style>{`.rotate-y-180 { transform: rotateY(180deg); } .transform-style-3d { transform-style: preserve-3d; } .backface-hidden { backface-visibility: hidden; } .perspective-1000 { perspective: 1000px; }`}</style>
    </div>
  );
};

// --- Quiz Game ---

const QuizGame: React.FC<{ user: User | null }> = ({ user }) => {
  const { items, loading } = useLearnedSubjects(user);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [questions, setQuestions] = useState<any[]>([]);
  const [finished, setFinished] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (loading || items.length < 4) return;
    
    // Generate 10 questions
    const q = Array.from({length: 10}).map(() => {
       const correctItem = items[Math.floor(Math.random() * items.length)];
       const type = Math.random() > 0.5 ? 'meaning' : 'reading';
       // Filter distractors of same type
       const distractors = items
         .filter(i => i.subject.id !== correctItem.subject.id && i.subject.object === correctItem.subject.object)
         .sort(() => 0.5 - Math.random())
         .slice(0, 3);
       
       const correctAns = type === 'meaning' 
         ? correctItem.subject.meanings[0].meaning 
         : (correctItem.subject.readings?.[0]?.reading || correctItem.subject.meanings[0].meaning); // fallback if radical
       
       const options = [correctItem, ...distractors].map(i => {
          return type === 'meaning' 
            ? i.subject.meanings[0].meaning 
            : (i.subject.readings?.[0]?.reading || i.subject.meanings[0].meaning)
       }).sort(() => 0.5 - Math.random());

       return {
         subject: correctItem.subject,
         type,
         correctAnswer: correctAns,
         options
       };
    });
    setQuestions(q);
  }, [items, loading]);

  const handleAnswer = (ans: string) => {
    if (ans === questions[currentQuestion].correctAnswer) {
      setScore(s => s + 1);
    }
    if (currentQuestion < 9) {
      setCurrentQuestion(c => c + 1);
    } else {
      setFinished(true);
    }
  };

  if (loading) return <div className="flex h-[80vh] items-center justify-center"><div className="animate-spin text-indigo-600"><Icons.RotateCcw /></div></div>;
  if (items.length < 4) return <div className="p-8 text-center text-gray-500">Not enough items.</div>;

  if (finished) return (
     <div className="max-w-2xl mx-auto p-8 text-center">
        <Icons.Trophy className="w-20 h-20 text-yellow-500 mx-auto mb-6" />
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Quiz Complete!</h2>
        <p className="text-xl text-gray-600 mb-8">You scored {score} / 10</p>
        <div className="flex justify-center gap-4">
           <Button onClick={() => window.location.reload()}>Play Again</Button>
           <Button variant="outline" onClick={() => navigate('/session/games')}>Back to Menu</Button>
        </div>
     </div>
  );

  const q = questions[currentQuestion];
  if (!q) return null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <Button variant="ghost" onClick={() => navigate('/session/games')}><Icons.ChevronLeft /></Button>
        <span className="font-bold text-gray-500">{currentQuestion + 1} / 10</span>
      </div>

      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 text-center mb-8">
        <div className="text-xs font-bold uppercase tracking-widest text-indigo-500 mb-4">
           Select the Correct {q.type}
        </div>
        <div className="text-6xl font-bold text-gray-800 mb-4">
           {q.subject.characters || <img src={q.subject.character_images[0].url} className="w-16 h-16 mx-auto" alt="" />}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {q.options.map((opt: string, idx: number) => (
          <button
            key={idx}
            onClick={() => handleAnswer(opt)}
            className="p-4 rounded-xl border-2 border-gray-200 hover:border-indigo-500 hover:bg-indigo-50 transition-all font-medium text-lg text-gray-700"
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
};

// --- Shiritori Game ---

const ShiritoriGame: React.FC<{ user: User | null }> = ({ user }) => {
  const { items, loading } = useLearnedSubjects(user);
  const [currentWord, setCurrentWord] = useState<Subject | null>(null);
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<Subject[]>([]);
  const [message, setMessage] = useState('Type the reading in Hiragana');
  const [gameOver, setGameOver] = useState(false);
  const navigate = useNavigate();

  // Filter vocab only
  const vocab = items.filter(i => i.subject.object === 'vocabulary').map(i => i.subject);

  useEffect(() => {
    if (loading || vocab.length === 0) return;
    // Start with random word
    const start = vocab[Math.floor(Math.random() * vocab.length)];
    setCurrentWord(start);
    setHistory([start]);
  }, [loading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWord || gameOver) return;

    // 1. Check if input matches reading of current word
    const readings = currentWord.readings?.map(r => r.reading) || [];
    const normalizedInput = toHiragana(input).trim(); // Basic conversion

    if (!readings.includes(normalizedInput)) {
      setMessage("Incorrect reading. Try again.");
      return;
    }

    // 2. Get last char
    const lastChar = normalizedInput.slice(-1);
    
    // 3. Find next word in user's vocab starting with lastChar
    // Note: 'ー' implies vowel extension, usually we look at previous char, but simpler to just match exact char for now or ignore 'ー'
    const nextChar = lastChar === 'ー' ? normalizedInput.slice(-2, -1) : lastChar;
    
    const candidates = vocab.filter(v => {
      const reading = v.readings?.[0]?.reading;
      return reading && reading.startsWith(nextChar) && !history.find(h => h.id === v.id);
    });

    if (candidates.length === 0) {
      setGameOver(true);
      setMessage("Chain broken! No words found starting with " + nextChar);
      return;
    }

    const nextWord = candidates[Math.floor(Math.random() * candidates.length)];
    setCurrentWord(nextWord);
    setHistory(h => [...h, nextWord]);
    setInput('');
    setMessage(`Good! Next word starts with ${nextChar}`);
  };

  if (loading) return <div className="flex h-[80vh] items-center justify-center"><div className="animate-spin text-indigo-600"><Icons.RotateCcw /></div></div>;
  if (vocab.length < 10) return <div className="p-8 text-center">Not enough vocabulary to play Shiritori.</div>;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
         <Button variant="ghost" onClick={() => navigate('/session/games')}><Icons.ChevronLeft /></Button>
         <h2 className="text-xl font-bold">Shiritori ({history.length} Links)</h2>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center mb-8">
         {!gameOver ? (
            <>
              <div className="text-gray-400 text-sm mb-2">Current Word</div>
              <div className="text-5xl font-bold text-gray-900 mb-4">{currentWord?.characters}</div>
              <div className="text-indigo-600 font-medium">{currentWord?.meanings[0].meaning}</div>
            </>
         ) : (
            <div>
               <Icons.Link className="w-16 h-16 mx-auto text-gray-300 mb-4" />
               <h3 className="text-2xl font-bold text-gray-900">Chain Broken!</h3>
               <p className="text-gray-500">You connected {history.length} words.</p>
               <Button className="mt-4" onClick={() => window.location.reload()}>Try Again</Button>
            </div>
         )}
      </div>

      {!gameOver && (
        <form onSubmit={handleSubmit} className="relative">
          <input 
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type reading (romaji auto-converts)"
            className="w-full px-6 py-4 rounded-xl border-2 border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none text-lg text-center font-bold shadow-sm"
            autoFocus
          />
          <p className="text-center mt-3 text-sm text-gray-500 flex items-center justify-center gap-2">
            {message === 'Incorrect reading. Try again.' ? <Icons.X className="w-4 h-4 text-red-500" /> : <Icons.Sparkles className="w-4 h-4 text-yellow-500" />}
            {message}
          </p>
        </form>
      )}

      {/* Chain History */}
      <div className="mt-12">
        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Chain History</h3>
        <div className="flex flex-wrap gap-2">
           {history.slice(0, -1).reverse().map((w, i) => (
             <span key={i} className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm">
               {w.characters}
             </span>
           ))}
        </div>
      </div>
    </div>
  );
};

// --- Sorting Game ---

const SortingGame: React.FC<{ user: User | null }> = ({ user }) => {
  const { items, loading } = useLearnedSubjects(user);
  const [pairs, setPairs] = useState<{char: string, val: string, id: number}[]>([]);
  const [rightOrder, setRightOrder] = useState<string[]>([]); // Current state of right side
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [solved, setSolved] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (loading || items.length < 5) return;
    // Pick 5
    const selected = [...items].sort(() => 0.5 - Math.random()).slice(0, 5);
    const p = selected.map(s => ({
      id: s.subject.id!,
      char: s.subject.characters || '?',
      val: s.subject.meanings[0].meaning
    }));
    
    setPairs(p);
    // Shuffle right side
    setRightOrder(p.map(x => x.val).sort(() => 0.5 - Math.random()));
    setSolved(false);
  }, [items, loading]);

  const handleRightClick = (idx: number) => {
    if (solved) return;
    if (selectedIdx === null) {
      setSelectedIdx(idx);
    } else {
      // Swap
      const newOrder = [...rightOrder];
      const temp = newOrder[selectedIdx];
      newOrder[selectedIdx] = newOrder[idx];
      newOrder[idx] = temp;
      setRightOrder(newOrder);
      setSelectedIdx(null);
      
      // Check if solved
      const isCorrect = newOrder.every((val, i) => val === pairs[i].val);
      if (isCorrect) setSolved(true);
    }
  };

  if (loading) return <div className="flex h-[80vh] items-center justify-center"><div className="animate-spin text-indigo-600"><Icons.RotateCcw /></div></div>;
  if (items.length < 5) return <div className="p-8 text-center">Not enough items to sort.</div>;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
         <Button variant="ghost" onClick={() => navigate('/session/games')}><Icons.ChevronLeft /></Button>
         <h2 className="text-xl font-bold">Sort & Match</h2>
      </div>

      <div className="bg-indigo-50 p-4 rounded-lg mb-6 text-sm text-indigo-800 flex gap-2">
         <Icons.GripVertical className="w-5 h-5" />
         Tap two items on the right list to swap them until they match the characters on the left.
      </div>

      <div className="flex gap-4">
        {/* Left Col (Fixed) */}
        <div className="flex-1 space-y-3">
           {pairs.map((p) => (
             <div key={p.id} className="h-16 flex items-center justify-center bg-white border-2 border-gray-200 rounded-xl font-bold text-2xl shadow-sm">
               {p.char}
             </div>
           ))}
        </div>

        {/* Right Col (Sortable) */}
        <div className="flex-1 space-y-3">
           {rightOrder.map((val, idx) => {
             const isCorrect = val === pairs[idx].val;
             return (
               <button
                 key={idx}
                 onClick={() => handleRightClick(idx)}
                 className={`
                   w-full h-16 px-2 flex items-center justify-center rounded-xl font-medium text-sm transition-all border-2
                   ${selectedIdx === idx ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200' : 'border-gray-200 bg-white shadow-sm'}
                   ${solved && isCorrect ? 'border-green-500 bg-green-50 text-green-700' : ''}
                 `}
               >
                 {solved && <Icons.CheckCircle className="w-4 h-4 mr-1 text-green-500" />}
                 {val}
               </button>
             );
           })}
        </div>
      </div>
      
      {solved && (
        <div className="mt-8 text-center animate-bounce">
           <Button size="lg" onClick={() => window.location.reload()}>Next Level <Icons.ChevronRight className="ml-2" /></Button>
        </div>
      )}
    </div>
  );
};


const Browse: React.FC<{ user: User | null }> = ({ user }) => {
  const [items, setItems] = useState<{subject: Subject, assignment?: Assignment}[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<{subject: Subject, assignment?: Assignment} | null>(null);
  const navigate = useNavigate();

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
         <Button variant="outline" size="sm" onClick={() => navigate('/')}>
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
  const navigate = useNavigate();

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
       <Button onClick={() => navigate('/')}>Return to Dashboard</Button>
    </div>
  );

  if (items.length === 0) return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-4 text-center">
       <div className="w-20 h-20 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mb-4">
         <Icons.BookOpen className="w-10 h-10" />
       </div>
       <h2 className="text-xl font-bold text-gray-900 mb-2">No items found</h2>
       <p className="text-gray-500 mb-6">There are no items available for this session type.</p>
       <Button variant="outline" onClick={() => navigate('/')}>Go Back</Button>
    </div>
  );

  // Determine active subject
  const currentItem = items[currentIndex];
  const activeSubject = drillDownStack.length > 0 ? drillDownStack[drillDownStack.length - 1] : currentItem.subject;
  const activeAssignment = drillDownStack.length > 0 ? undefined : currentItem.assignment; 
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


// --- Main App ---

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
