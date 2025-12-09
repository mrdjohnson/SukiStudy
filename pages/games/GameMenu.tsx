
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Icons } from '../../components/Icons';
import { Button } from '../../components/ui/Button';

export const GameMenu: React.FC = () => {
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
    },
    {
      id: 'connect',
      name: 'Hiragana Connect',
      desc: 'Trace the path of kana to spell the word.',
      icon: Icons.GridDots,
      color: 'bg-teal-100 text-teal-600'
    },
    {
      id: 'variations',
      name: 'Kanji Readings',
      desc: 'Select all valid readings for a Kanji.',
      icon: Icons.ListCheck,
      color: 'bg-rose-100 text-rose-600'
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
