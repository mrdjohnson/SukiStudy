
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Subject, Assignment } from '../types';
import { waniKaniService } from '../services/wanikaniService';
import { Icons } from '../components/Icons';
import { Button } from '../components/ui/Button';
import { Flashcard } from '../components/Flashcard';
import { toHiragana } from '../utils/kana';

export const Browse: React.FC<{ user: User }> = ({ user }) => {
  const [items, setItems] = useState<{subject: Subject, assignment?: Assignment}[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<{subject: Subject, assignment?: Assignment} | null>(null);
  
  // Filters
  const [levels, setLevels] = useState<number[]>([user.level]);
  const [onlyLearned, setOnlyLearned] = useState(false);
  const [srsFilter, setSrsFilter] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showLevelSelect, setShowLevelSelect] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      setLoading(true);
      try {
        const promises = levels.map(l => waniKaniService.getLevelSubjects(l));
        const results = await Promise.all(promises);
        
        let allSubjects: Subject[] = [];
        results.forEach(res => {
            if (res.data) {
                const subs = res.data.map(r => ({ ...r.data, id: r.id, object: r.object, url: r.url }));
                allSubjects = [...allSubjects, ...subs];
            }
        });

        const subjectIds = allSubjects.map(s => s.id!).filter(Boolean);
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

        setItems(allSubjects.map(s => ({
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
  }, [user, levels.join(',')]);

  const toggleSrsFilter = (stageGroup: number[]) => {
    const isActive = stageGroup.every(s => srsFilter.includes(s));
    if (isActive) {
      setSrsFilter(prev => prev.filter(s => !stageGroup.includes(s)));
    } else {
      setSrsFilter(prev => [...prev, ...stageGroup]);
    }
  };

  const toggleLevel = (l: number) => {
      if (levels.includes(l)) {
          if (levels.length > 1) setLevels(prev => prev.filter(x => x !== l));
      } else {
          setLevels(prev => [...prev, l]);
      }
  }

  const getFilteredItems = () => {
    return items.filter(item => {
      if (onlyLearned) {
        const stage = item.assignment?.srs_stage;
        if (stage === undefined || stage === 0) return false;
      }

      if (srsFilter.length > 0) {
        const stage = item.assignment?.srs_stage || 0; 
        if (!srsFilter.includes(stage)) return false;
      }

      if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const qKana = toHiragana(q);
          const s = item.subject;
          
          const matchMeaning = s.meanings.some(m => m.meaning.toLowerCase().includes(q));
          const matchReading = s.readings?.some(r => r.reading.includes(qKana) || r.reading.includes(q));
          const matchChar = s.characters?.includes(q) || s.characters?.includes(qKana);

          if (!matchMeaning && !matchReading && !matchChar) return false;
      }

      return true;
    });
  };

  const getTypeColor = (object: string) => {
    if (object === 'radical') return 'bg-sky-500 border-sky-600 text-white';
    if (object === 'kanji') return 'bg-pink-500 border-pink-600 text-white';
    return 'bg-purple-500 border-purple-600 text-white';
  };

  const getSRSBadge = (stage?: number) => {
    if (stage === undefined) return null;
    if (stage === 0) return <span className="absolute -top-2 -right-2 bg-gray-400 text-white text-[9px] px-1.5 py-0.5 rounded-full border border-white">Lesson</span>;
    if (stage < 5) return <span className="absolute -top-2 -right-2 bg-pink-600 text-white text-[9px] px-1.5 py-0.5 rounded-full border border-white">Appr</span>;
    if (stage < 7) return <span className="absolute -top-2 -right-2 bg-purple-600 text-white text-[9px] px-1.5 py-0.5 rounded-full border border-white">Guru</span>;
    if (stage === 7) return <span className="absolute -top-2 -right-2 bg-blue-700 text-white text-[9px] px-1.5 py-0.5 rounded-full border border-white">Master</span>;
    if (stage === 8) return <span className="absolute -top-2 -right-2 bg-sky-500 text-white text-[9px] px-1.5 py-0.5 rounded-full border border-white">Enlight</span>;
    return <span className="absolute -top-2 -right-2 bg-yellow-600 text-white text-[9px] px-1.5 py-0.5 rounded-full border border-white">Burn</span>;
  };

  const filteredItems = getFilteredItems();

  const SRS_GROUPS = [
    { label: 'Apprentice', stages: [1, 2, 3, 4], color: 'text-pink-600 bg-pink-100 border-pink-200' },
    { label: 'Guru', stages: [5, 6], color: 'text-purple-600 bg-purple-100 border-purple-200' },
    { label: 'Master', stages: [7], color: 'text-blue-600 bg-blue-100 border-blue-200' },
    { label: 'Enlightened', stages: [8], color: 'text-sky-600 bg-sky-100 border-sky-200' },
    { label: 'Burned', stages: [9], color: 'text-yellow-600 bg-yellow-100 border-yellow-200' },
  ];

  if (loading && items.length === 0) return <div className="flex h-[80vh] items-center justify-center"><div className="animate-spin text-indigo-600"><Icons.RotateCcw /></div></div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      {/* Filters Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-8 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-4">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-bold text-gray-900">Browse</h2>
            <div className="relative">
                <Button variant="outline" size="sm" onClick={() => setShowLevelSelect(!showLevelSelect)}>
                    Levels: {levels.length > 3 ? `${levels.length} selected` : levels.join(', ')}
                    <Icons.ChevronRight className={`ml-2 w-4 h-4 transition-transform ${showLevelSelect ? 'rotate-90' : ''}`} />
                </Button>
                {showLevelSelect && (
                    <div className="absolute top-10 left-0 z-20 bg-white shadow-xl border border-gray-200 rounded-xl p-4 w-72 h-64 overflow-y-auto grid grid-cols-5 gap-2">
                        {Array.from({length: 60}, (_, i) => i + 1).map(l => (
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
            {showLevelSelect && <div className="fixed inset-0 z-10" onClick={() => setShowLevelSelect(false)}></div>}
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate('/')}>Dashboard</Button>
        </div>

        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
           <div className="flex-1 w-full md:max-w-md">
               <div className="relative">
                   <Icons.Sparkles className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
                   <input 
                      type="text" 
                      placeholder="Search English, Kana, or Romaji..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                   />
               </div>
           </div>

          <div className="flex flex-col md:flex-row gap-4 items-center">
            <label className="flex items-center space-x-2 cursor-pointer select-none">
                <input 
                type="checkbox" 
                checked={onlyLearned}
                onChange={(e) => setOnlyLearned(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 border-gray-300" 
                />
                <span className="text-sm font-medium text-gray-700">Learned Only</span>
            </label>
            <div className="h-6 w-px bg-gray-200 hidden md:block"></div>
            <div className="flex flex-wrap gap-2">
                {SRS_GROUPS.map(group => {
                const isActive = group.stages.every(s => srsFilter.includes(s));
                return (
                    <button
                    key={group.label}
                    onClick={() => toggleSrsFilter(group.stages)}
                    className={`
                        px-3 py-1 rounded-full text-xs font-bold border transition-all
                        ${isActive ? group.color : 'bg-gray-50 border-gray-200 text-gray-400'}
                    `}
                    >
                    {group.label}
                    </button>
                );
                })}
                {srsFilter.length > 0 && (
                <button 
                    onClick={() => setSrsFilter([])}
                    className="px-3 py-1 text-xs text-gray-500 hover:text-gray-900 underline"
                >
                    Clear
                </button>
                )}
            </div>
          </div>
        </div>
      </div>

      {filteredItems.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <Icons.FileQuestion className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>No items match your filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
          {filteredItems.map(({subject, assignment}) => (
            <button 
              key={subject.id}
              onClick={() => setSelectedItem({subject, assignment})}
              className={`
                relative aspect-square rounded-xl p-2 flex flex-col items-center justify-center border transition-all hover:scale-105 shadow-sm hover:shadow-md
                ${getTypeColor(subject.object || 'vocabulary')}
              `}
            >
              {getSRSBadge(assignment?.srs_stage)}
              <div className="text-3xl font-bold mb-1 drop-shadow-sm">
                {subject.characters || (
                  <div className="w-8 h-8">
                     {subject.character_images?.find(i => i.content_type === 'image/svg+xml')?.url && (
                       <img src={subject.character_images?.find(i => i.content_type === 'image/svg+xml')?.url} alt="" className="w-full h-full brightness-0 invert" />
                     )}
                  </div>
                )}
              </div>
              <div className="text-xs truncate max-w-full font-medium opacity-90 px-2 bg-black/10 rounded">
                {subject.meanings?.[0]?.meaning}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Modal Overlay */}
      {selectedItem && (
        <div 
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in" 
            onClick={() => setSelectedItem(null)}
        >
          <div 
            className="w-full max-w-2xl h-full flex items-center" 
            onClick={e => e.stopPropagation()}
          >
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
