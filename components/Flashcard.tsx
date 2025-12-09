import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Subject, SubjectType, Assignment } from '../types';
import { Icons } from './Icons';
import { generateExplanation } from '../services/geminiService';
import { waniKaniService } from '../services/wanikaniService';
import ReactMarkdown from 'react-markdown';
import { Button } from './ui/Button';
import { ARTWORK_URLS } from '../utils/artworkUrls'

interface FlashcardProps {
  subject: Subject;
  assignment?: Assignment;
  onNext?: () => void;
  onPrev: () => void;
  hasPrev: boolean;
  hasNext: boolean;
  onDrillDown?: (subject: Subject) => void;
}

// Global cache for failed image URLs to prevent flickering/re-checking in same session
const failedImages = new Set<string>();

const MnemonicImage: React.FC<{ id: string, type: SubjectType }> = ({ id, type }) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (type === SubjectType.VOCABULARY) {
      setError(true);
      return;
    }

    const url = ARTWORK_URLS[id];
    if (url) {
      if (failedImages.has(url)) {
        setError(true);
      } else {
        setImageUrl(url);
        setError(false);
      }
    } else {
        setError(true);
    }
  }, [id, type]);

  const handleError = () => {
    if (imageUrl) failedImages.add(imageUrl);
    setError(true);
  };

  if (error || !imageUrl) return null;

  return (
    <>
      <div 
        className="mt-4 mb-4 relative group cursor-zoom-in inline-block"
        onClick={() => setIsOpen(true)}
      >
        <img
          src={imageUrl}
          alt={`${id} mnemonic visualization`}
          className="rounded-lg shadow-sm border border-gray-100 max-h-64 mx-auto object-contain transition-transform group-hover:scale-[1.02]"
          onError={handleError}
        />
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/10 rounded-lg pointer-events-none">
          <Icons.Maximize2 className="w-8 h-8 text-white drop-shadow-lg" />
        </div>
        <p className="text-xs text-center text-gray-400 mt-1">Community Mnemonic Artwork (Tap to expand)</p>
      </div>

      {isOpen && (
        <div 
          className="fixed inset-0 z-[150] bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in"
          onClick={() => setIsOpen(false)}
        >
          <div className="relative max-w-5xl max-h-full w-full flex items-center justify-center">
            <button 
              className="absolute -top-12 right-0 p-2 text-white/70 hover:text-white transition-colors"
              onClick={() => setIsOpen(false)}
            >
              <Icons.X className="w-8 h-8" />
            </button>
            <img
              src={imageUrl}
              alt="Mnemonic Fullscreen"
              className="max-w-full max-h-[85vh] object-contain rounded-md shadow-2xl"
              onClick={(e) => e.stopPropagation()} // Prevent closing when clicking image
            />
          </div>
        </div>
      )}
    </>
  );
};

export const Flashcard: React.FC<FlashcardProps> = ({ subject, assignment, onNext, onPrev, hasPrev, hasNext, onDrillDown }) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [components, setComponents] = useState<Subject[]>([]);
  const [loadingComponents, setLoadingComponents] = useState(false);
  const [audioIndex, setAudioIndex] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Reset state when subject changes
  useEffect(() => {
    setIsFlipped(false);
    setAiExplanation(null);
    setLoadingAi(false);
    setAudioIndex(0);

    // Fetch components (Radicals/Kanji)
    const loadComponents = async () => {
      setComponents([]);
      if (subject.component_subject_ids && subject.component_subject_ids.length > 0) {
        setLoadingComponents(true);
        try {
          const col = await waniKaniService.getSubjects(subject.component_subject_ids);
          if (col && col.data) {
            setComponents(col.data.map(r => ({ ...r.data, id: r.id, object: r.object, url: r.url })));
          }
        } catch (e) {
          console.error("Failed to load components", e);
        } finally {
          setLoadingComponents(false);
        }
      }
    };
    loadComponents();
  }, [subject.id]);

  const getSubjectType = (s: Subject): SubjectType => {
    if (s.object === 'radical') return SubjectType.RADICAL;
    if (s.object === 'kanji') return SubjectType.KANJI;
    return SubjectType.VOCABULARY;
  };

  const type = getSubjectType(subject);

  const colors = {
    [SubjectType.RADICAL]: 'bg-sky-500 text-white',
    [SubjectType.KANJI]: 'bg-pink-500 text-white',
    [SubjectType.VOCABULARY]: 'bg-purple-500 text-white'
  };

  const borderColors = {
    [SubjectType.RADICAL]: 'border-sky-200 bg-sky-50',
    [SubjectType.KANJI]: 'border-pink-200 bg-pink-50',
    [SubjectType.VOCABULARY]: 'border-purple-200 bg-purple-50'
  };

  const handleAiExplain = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (aiExplanation) return;

    setLoadingAi(true);
    const explanation = await generateExplanation(subject, type);
    setAiExplanation(explanation);
    setLoadingAi(false);
  };

  const playAudio = (e: React.MouseEvent) => {
    e.stopPropagation();
    const audios = subject.pronunciation_audios || [];
    if (audios.length === 0) return;

    const audioUrl = audios[audioIndex % audios.length].url;
    if (audioRef.current) {
      audioRef.current.src = audioUrl;
      audioRef.current.play();
    } else {
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      audio.play();
    }

    // Rotate to next audio source for next click
    setAudioIndex(prev => prev + 1);
  };

  const getSRSLabel = (stage: number) => {
    if (stage === 0) return { label: 'Lesson', color: 'bg-gray-400' };
    if (stage < 5) return { label: `Apprentice ${stage}`, color: 'bg-pink-600' };
    if (stage < 7) return { label: 'Guru', color: 'bg-purple-600' };
    if (stage === 7) return { label: 'Master', color: 'bg-blue-700' };
    if (stage === 8) return { label: 'Enlightened', color: 'bg-sky-500' };
    return { label: 'Burned', color: 'bg-yellow-600' };
  };

  const primaryMeaning = subject.meanings.find(m => m.primary)?.meaning;
  const primaryReading = subject.readings?.find(r => r.primary)?.reading;
  const character = subject.characters;

  const renderCharacter = (className: string) => {
    if (character) {
      return <span className={className}>{character}</span>;
    } else {
      const imageUrl = subject.character_images?.find(i => i.content_type === 'image/svg+xml')?.url;
      return (
        <div className="w-full h-full p-2">
          {imageUrl ? (
            <img src={imageUrl} alt="radical" className={`w-full h-full ${className.includes('text-white') ? 'brightness-0 invert' : ''}`} />
          ) : (
            <span>?</span>
          )}
        </div>
      );
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-4 perspective-1000">
      <div
        className={`relative w-full aspect-[4/5] md:aspect-[16/10] transition-all duration-500 transform-style-3d cursor-pointer ${isFlipped ? 'rotate-y-180' : ''}`}
        onClick={() => setIsFlipped(!isFlipped)}
      >
        {/* Front */}
        <div className={`absolute inset-0 backface-hidden rounded-2xl shadow-xl flex flex-col items-center justify-center overflow-hidden border border-gray-100 bg-white`}>
          <div className={`absolute top-0 w-full py-2 text-center text-xs font-bold uppercase tracking-widest ${colors[type]}`}>
            {type}
          </div>

          <div className="flex-1 flex flex-col items-center justify-center p-8 w-full">
            {character ? (
              <span className="text-8xl md:text-9xl font-bold text-gray-800 mb-8">{character}</span>
            ) : (
              <div className="w-32 h-32 mb-8">
                {renderCharacter("")}
              </div>
            )}
            <p>{subject.id},{subject.slug}</p>
            <p className="text-gray-400 text-sm font-medium">Tap to reveal</p>
          </div>
        </div>

        {/* Back */}
        <div className={`absolute inset-0 backface-hidden rotate-y-180 rounded-2xl shadow-xl bg-white overflow-hidden border border-gray-100 flex flex-col`}>
          {/* Back Header */}
          <div className={`p-4 border-b ${borderColors[type]} flex justify-between items-center`}>
            <div className="flex items-center gap-4">
              {/* Small Origin Character on Back */}
              <div className={`w-12 h-12 flex items-center justify-center rounded-lg ${colors[type]} text-2xl font-bold`}>
                {character || (
                  <div className="w-8 h-8">
                    {subject.character_images?.find(i => i.content_type === 'image/svg+xml')?.url && (
                      <img src={subject.character_images?.find(i => i.content_type === 'image/svg+xml')?.url} alt="" className="w-full h-full brightness-0 invert" />
                    )}
                  </div>
                )}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-800 leading-tight">{primaryMeaning}</h2>
                {assignment && (
                  <div className={`inline-block px-2 py-0.5 mt-1 rounded text-[10px] font-bold text-white uppercase ${getSRSLabel(assignment.srs_stage).color}`}>
                    {getSRSLabel(assignment.srs_stage).label}
                  </div>
                )}
              </div>
            </div>

            {primaryReading && (
              <div className="text-right">
                <div className="flex items-center justify-end gap-2">
                  <p className="text-xl text-gray-700 font-medium">{primaryReading}</p>
                  {subject.pronunciation_audios && subject.pronunciation_audios.length > 0 && (
                    <button
                      onClick={playAudio}
                      className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full text-indigo-600 transition-colors"
                      title="Play Audio"
                    >
                      <Icons.Sparkles className="w-4 h-4" /> {/* Using sparkle as simplified "voice" icon representation */}
                    </button>
                  )}
                </div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Reading</p>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar text-left">

            {/* Standard WaniKani Content */}
            <div>
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Meaning Mnemonic</h3>
              <div
                className="text-gray-700 leading-relaxed"
                dangerouslySetInnerHTML={{
                  __html: subject.meaning_mnemonic
                }}
              />
            </div>

            {subject.reading_mnemonic && (
              <div>
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Reading Mnemonic</h3>
                <div
                  className="text-gray-700 leading-relaxed"
                  dangerouslySetInnerHTML={{
                    __html: subject.reading_mnemonic
                  }}
                />
              </div>
            )}

            {/* Visuals / Mnemonic Artwork */}
            {(type === SubjectType.KANJI || type === SubjectType.RADICAL) && (
              <div>
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Visuals</h3>
                <MnemonicImage id={String(subject.id)} type={type} />
              </div>
            )}

            {/* Components Section (Kanji Composition or Radicals) */}
            {components.length > 0 && (
              <div className="pt-4 border-t border-gray-100">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  {type === SubjectType.VOCABULARY ? 'Kanji Composition' : 'Radicals'}
                </h3>
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                  {components.map((comp) => {
                    const compType = getSubjectType(comp);
                    const compChar = comp.characters;
                    const compImg = comp.character_images?.find(i => i.content_type === 'image/svg+xml')?.url;
                    return (
                      <div
                        key={comp.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onDrillDown) onDrillDown(comp);
                        }}
                        className={`
                          p-2 rounded-lg border text-center cursor-pointer transition-all hover:shadow-md active:scale-95
                          ${compType === SubjectType.RADICAL ? 'bg-sky-50 border-sky-100 hover:border-sky-300' : 'bg-pink-50 border-pink-100 hover:border-pink-300'}
                        `}
                      >
                        <div className="text-2xl font-bold text-gray-800 mb-1">
                          {compChar || (
                            <div className="w-8 h-8 mx-auto">
                              {compImg && <img src={compImg} alt="" className="w-full h-full" />}
                            </div>
                          )}
                        </div>
                        <div className="text-[10px] leading-tight text-gray-600 truncate px-1">
                          {comp.meanings[0].meaning}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* AI Section */}
            <div className="pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-indigo-600 uppercase tracking-wider flex items-center gap-2">
                  <Icons.Sparkles className="w-4 h-4" />
                  AI Tutor
                </h3>
                {!aiExplanation && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAiExplain}
                    isLoading={loadingAi}
                  >
                    Ask Gemini
                  </Button>
                )}
              </div>

              {aiExplanation && (
                <div className="bg-indigo-50 rounded-lg p-4 text-sm text-gray-700 prose prose-indigo max-w-none">
                  <ReactMarkdown>{aiExplanation}</ReactMarkdown>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex justify-between items-center mt-8 px-4">
        <Button
          variant="ghost"
          onClick={(e) => { e.stopPropagation(); onPrev(); }}
          disabled={!hasPrev}
          className="gap-2"
        >
          <Icons.ChevronLeft className="w-5 h-5" />
          {hasPrev && !onNext ? 'Back' : 'Prev'}
        </Button>

        <span className="text-sm font-medium text-gray-400">Tap card to flip</span>

        <Button
          variant="ghost"
          onClick={(e) => { e.stopPropagation(); if (onNext) onNext(); }}
          disabled={!hasNext}
          className={`gap-2 ${!onNext ? 'invisible' : ''}`}
        >
          Next
          <Icons.ChevronRight className="w-5 h-5" />
        </Button>
      </div>

      <style>{`
        .rotate-y-180 {
          transform: rotateY(180deg);
        }
        .transform-style-3d {
          transform-style: preserve-3d;
        }
        .backface-hidden {
          backface-visibility: hidden;
        }
        .perspective-1000 {
          perspective: 1000px;
        }
      `}</style>
    </div>
  );
};