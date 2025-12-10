
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, GameItem, SubjectType } from '../../types';
import { useAllSubjects } from '../../hooks/useAllSubjects';
import { Icons } from '../../components/Icons';
import { Button } from '../../components/ui/Button';
import { Flashcard } from '../../components/Flashcard';
import { generateKanaGameItems } from '../../utils/kana';
import { games } from '../../utils/games';

export const CustomGameSetup: React.FC<{ user: User }> = ({ user }) => {
  const { items: learnedItems, loading } = useAllSubjects(user);

  const [selectedGames, setSelectedGames] = useState<string[]>(['quiz']);
  const [itemCount, setItemCount] = useState(25);
  const [levels, setLevels] = useState<number[]>([]);
  const [types, setTypes] = useState<SubjectType[]>([SubjectType.KANJI, SubjectType.VOCABULARY, SubjectType.RADICAL]);
  const [manualSelection, setManualSelection] = useState<number[]>([]);
  const [isManualMode, setIsManualMode] = useState(false);
  const [includeHiragana, setIncludeHiragana] = useState(false);
  const [includeKatakana, setIncludeKatakana] = useState(false);
  const [previewFlashcard, setPreviewFlashcard] = useState<GameItem | null>(null);
  const [showLevelSelect, setShowLevelSelect] = useState(false);

  const navigate = useNavigate();

  // Initialize levels to current level
  useEffect(() => {
    if (user && levels.length === 0) {
      const initialLevels = [1]
      let level = 2

      while (level <= user.level) {
        initialLevels.push(level + 1)
        level += 1
      }

      setLevels(initialLevels);
    }
  }, [user]);

  const getFilteredItems = () => {
    let pool = learnedItems.filter(item => {
      // Level Filter
      if (levels.length > 0 && !levels.includes(item.subject.level)) return false;

      // Type Filter
      const type = item.subject.object as SubjectType;
      // WaniKani API returns 'radical', 'kanji', 'vocabulary'
      if (!types.includes(type)) return false;

      return true;
    });

    if (includeHiragana || includeKatakana) {
      pool = [...pool, ...generateKanaGameItems(includeHiragana, includeKatakana)];
    }

    return pool;
  };

  const filteredPool = getFilteredItems();

  const handleStart = () => {
    let finalItems = [];
    if (isManualMode && manualSelection.length > 0) {
      finalItems = filteredPool.filter(i => manualSelection.includes(i.subject.id!));
    } else {
      // Random selection from pool
      finalItems = [...filteredPool].sort(() => 0.5 - Math.random()).slice(0, itemCount);
    }

    if (finalItems.length === 0) return;

    navigate('/session/custom/play', {
      state: {
        games: selectedGames,
        items: finalItems
      }
    });
  };

  const toggleGame = (id: string) => {
    setSelectedGames(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleType = (t: SubjectType) => {
    setTypes(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  };

  const toggleManualId = (id: number) => {
    setManualSelection(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleLevel = (l: number) => {
    if (levels.includes(l)) {
      if (levels.length > 1) setLevels(prev => prev.filter(x => x !== l));
    } else {
      setLevels(prev => [...prev, l]);
    }
  }

  if (loading) return <div className="flex h-[80vh] items-center justify-center"><div className="animate-spin text-indigo-600"><Icons.RotateCcw /></div></div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8" onClick={() => setShowLevelSelect(false)}>
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" onClick={() => navigate('/session/games')}><Icons.ChevronLeft /></Button>
        <h1 className="text-3xl font-bold text-gray-900">Custom Session Setup</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-8">
          {/* Game Selection */}
          <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Icons.Gamepad2 className="w-5 h-5 text-indigo-600" /> Select Games
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {games.map(g => (
                <button
                  key={g.id}
                  onClick={() => toggleGame(g.id)}
                  className={`p-3 rounded-xl border-2 text-left flex items-center gap-3 transition-all ${selectedGames.includes(g.id) ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-bold' : 'border-gray-100 hover:border-gray-300'}`}
                >
                  <g.icon className="w-5 h-5" /> {g.name}
                </button>
              ))}
            </div>
          </section>

          {/* Filters */}
          <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Icons.Settings className="w-5 h-5 text-indigo-600" /> Filters
            </h3>

            <div className="space-y-4">

              <div className="relative">
                <Button variant="outline" size="sm" onClick={e => { setShowLevelSelect(!showLevelSelect); e.stopPropagation() }}>
                  Levels: {levels.length > 3 ? `${levels.length} selected` : levels.join(', ')}
                  <Icons.ChevronRight className={`ml-2 w-4 h-4 transition-transform ${showLevelSelect ? 'rotate-90' : ''}`} />
                </Button>
                {showLevelSelect && (
                  <div className="absolute top-10 left-0 z-20 bg-white shadow-xl border border-gray-200 rounded-xl p-4 w-72 h-64 overflow-y-auto grid grid-cols-5 gap-2" onClick={e => e.stopPropagation()}>
                    {Array.from({ length: 60 }, (_, i) => i + 1).map(l => (
                      <button
                        key={l}
                        onClick={() => toggleLevel(l)}
                        className={`
                                    w-10 h-10 rounded-lg text-sm font-bold flex items-center justify-center transition-colors
                                    ${levels.includes(l) ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}
                                `}
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Subject Types</label>
                <div className="flex flex-wrap gap-2">
                  {[SubjectType.RADICAL, SubjectType.KANJI, SubjectType.VOCABULARY].map(t => (
                    <button
                      key={t}
                      onClick={() => toggleType(t)}
                      className={`px-3 py-1 rounded-full text-sm capitalize border ${types.includes(t) ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-300'}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Kana Practice</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={includeHiragana} onChange={e => setIncludeHiragana(e.target.checked)} className="rounded text-indigo-600" />
                    Hiragana
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={includeKatakana} onChange={e => setIncludeKatakana(e.target.checked)} className="rounded text-indigo-600" />
                    Katakana
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Item Count: {itemCount}</label>
                <input
                  type="range" min="5" max="100" step="5"
                  value={itemCount}
                  onChange={e => setItemCount(Number(e.target.value))}
                  className="w-full accent-indigo-600"
                />
              </div>

              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={isManualMode}
                    onChange={e => setIsManualMode(e.target.checked)}
                    className="w-5 h-5 rounded text-indigo-600 border-gray-300"
                  />
                  <span className="font-medium text-gray-800">Select Items Manually</span>
                </label>
              </div>
            </div>
          </section>
        </div>

        {/* Item Preview / Selection */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col h-[600px]">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold">
              {isManualMode ? `Selected (${manualSelection.length})` : `Pool Preview (${filteredPool.length})`}
            </h3>
            {isManualMode && (
              <div className="flex gap-2">
                <button onClick={() => setManualSelection(filteredPool.map(i => i.subject.id!))} className="text-xs text-indigo-600 underline">Select All</button>
                <button onClick={() => setManualSelection([])} className="text-xs text-red-600 underline">Clear</button>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto grid grid-cols-5 gap-2 content-start pr-2">
            {filteredPool.map(item => {
              const isSelected = isManualMode && manualSelection.includes(item.subject.id!);
              const isKana = item.subject.id! < 0;
              return (
                <button
                  key={item.subject.id}
                  onClick={() => isManualMode && toggleManualId(item.subject.id!)}
                  onContextMenu={(e) => { e.preventDefault(); if (!isKana) setPreviewFlashcard(item); }}
                  className={`
                                aspect-square rounded-lg flex items-center justify-center text-xl font-bold border-2 transition-all relative
                                ${isManualMode
                      ? isSelected ? 'border-indigo-600 bg-indigo-50 text-indigo-800' : 'border-gray-200 text-gray-400 opacity-60'
                      : 'border-gray-100 text-gray-800'
                    }
                            `}
                >
                  {item.subject.characters || "?"}
                </button>
              )
            })}
            {filteredPool.length === 0 && <div className="col-span-5 text-center text-gray-400 py-10">No items match your filters.</div>}
          </div>

          <div className="pt-4 border-t border-gray-100 mt-4">
            <Button className="w-full" size="lg" onClick={handleStart} disabled={selectedGames.length === 0 || filteredPool.length === 0 || (isManualMode && manualSelection.length === 0)}>
              Start Custom Session
            </Button>
            <p className="text-center text-xs text-gray-400 mt-2">Long press / Right click items to view details</p>
          </div>
        </div>
      </div>

      {previewFlashcard && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md" onClick={() => setPreviewFlashcard(null)}>
          <div className="w-full max-w-2xl h-full flex items-center" onClick={e => e.stopPropagation()}>
            <Flashcard
              subject={previewFlashcard.subject}
              hasPrev={false}
              hasNext={false}
              onPrev={() => setPreviewFlashcard(null)}
              onNext={() => setPreviewFlashcard(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
};
