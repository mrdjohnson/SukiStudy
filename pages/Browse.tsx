
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Subject, Assignment } from '../types';
import { waniKaniService } from '../services/wanikaniService';
import { Icons } from '../components/Icons';
import { Button } from '../components/ui/Button';
import { toHiragana } from '../utils/kana';
import { openFlashcardModal } from '../components/modals/FlashcardModal';
import { 
    TextInput, 
    Group, 
    Title, 
    Paper, 
    Chip, 
    Modal, 
    SimpleGrid, 
    Box, 
    Text, 
    UnstyledButton,
    Badge,
    Stack
} from '@mantine/core';

export const Browse: React.FC<{ user: User }> = ({ user }) => {
  const [items, setItems] = useState<{ subject: Subject, assignment?: Assignment }[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [levels, setLevels] = useState<number[]>([user.level]);
  const [onlyLearned, setOnlyLearned] = useState(false);
  const [srsFilter, setSrsFilter] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showLevelSelect, setShowLevelSelect] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      setLoading(true);
      try {
        const results = await waniKaniService.getLevelSubjects(levels);

        let allSubjects: Subject[] = [];
        if (results.data) {
          const subs = results.data.map(r => ({ ...r.data, id: r.id, object: r.object, url: r.url }));
          allSubjects = [...allSubjects, ...subs];
        }

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
        let stageLabel = 'Lesson';
        if (stage > 0 && stage < 5) stageLabel = 'Apprentice';
        else if (stage >= 5 && stage < 7) stageLabel = 'Guru';
        else if (stage === 7) stageLabel = 'Master';
        else if (stage === 8) stageLabel = 'Enlightened';
        else if (stage === 9) stageLabel = 'Burned';
        
        if (!srsFilter.includes(stageLabel)) return false;
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
    if (object === 'radical') return 'cyan';
    if (object === 'kanji') return 'pink';
    return 'grape'; // vocab
  };

  const getSRSBadge = (stage?: number) => {
    if (stage === undefined) return null;
    let label = 'Lesson';
    let color = 'gray';
    if (stage > 0 && stage < 5) { label = 'Appr'; color = 'pink'; }
    else if (stage >= 5 && stage < 7) { label = 'Guru'; color = 'grape'; }
    else if (stage === 7) { label = 'Mast'; color = 'blue'; }
    else if (stage === 8) { label = 'Enli'; color = 'cyan'; }
    else if (stage === 9) { label = 'Burn'; color = 'yellow'; }

    return (
        <Badge 
            color={color} 
            size="xs" 
            variant="filled" 
            style={{ position: 'absolute', top: -5, right: -5, zIndex: 10 }}
        >
            {label}
        </Badge>
    );
  };

  const filteredItems = getFilteredItems();

  const SRS_GROUPS = ['Apprentice', 'Guru', 'Master', 'Enlightened', 'Burned'];

  if (loading && items.length === 0) return <div className="flex h-[80vh] items-center justify-center"><div className="animate-spin text-indigo-600"><Icons.RotateCcw /></div></div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

      {/* Filters Header */}
      <Paper p="md" withBorder radius="md" mb="xl">
        <Group justify="space-between" mb="md">
            <Group>
                <Title order={2}>Browse</Title>
                <Button variant="outline" size="xs" onClick={() => setShowLevelSelect(true)} rightSection={<Icons.ChevronRight size={14} />}>
                    Levels: {levels.length > 3 ? `${levels.length} selected` : levels.join(', ')}
                </Button>
            </Group>
            <Button variant="subtle" size="sm" onClick={() => navigate('/')}>Dashboard</Button>
        </Group>
        
        <Stack gap="md">
            <TextInput 
                placeholder="Search English, Kana, or Romanji..."
                leftSection={<Icons.Sparkles size={16} />}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.currentTarget.value)}
            />

            <Group>
                <Chip checked={onlyLearned} onChange={setOnlyLearned} variant="outline" size="xs">
                    Learned Only
                </Chip>
                <div className="h-6 w-px bg-gray-200 hidden md:block"></div>
                <Chip.Group multiple value={srsFilter} onChange={setSrsFilter}>
                    <Group gap="xs">
                        {SRS_GROUPS.map(label => (
                            <Chip key={label} value={label} variant="light" size="xs">{label}</Chip>
                        ))}
                    </Group>
                </Chip.Group>
            </Group>
        </Stack>
      </Paper>

      {filteredItems.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <Icons.FileQuestion className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>No items match your filters.</p>
        </div>
      ) : (
        <SimpleGrid cols={{ base: 2, xs: 3, sm: 4, md: 6, lg: 8 }} spacing="sm">
          {filteredItems.map(({ subject, assignment }) => {
            const color = getTypeColor(subject.object || 'vocabulary');
            return (
                <UnstyledButton
                    key={subject.id}
                    onClick={() => openFlashcardModal(subject, assignment)}
                    style={(theme) => ({
                        position: 'relative',
                        aspectRatio: '1/1',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: theme.radius.md,
                        backgroundColor: theme.colors[color][6],
                        color: 'white',
                        transition: 'transform 0.2s',
                        '&:hover': { transform: 'scale(1.05)' }
                    })}
                >
                    {getSRSBadge(assignment?.srs_stage)}
                    <Text size="xl" fw={700}>
                        {subject.characters || (
                            <div className="w-8 h-8">
                                {subject.character_images?.find(i => i.content_type === 'image/svg+xml')?.url && (
                                <img src={subject.character_images?.find(i => i.content_type === 'image/svg+xml')?.url} alt="" className="w-full h-full brightness-0 invert" />
                                )}
                            </div>
                        )}
                    </Text>
                    <Box style={{ backgroundColor: 'rgba(0,0,0,0.15)', padding: '2px 6px', borderRadius: 4, maxWidth: '90%' }}>
                         <Text size="xs" truncate>{subject.meanings?.[0]?.meaning}</Text>
                    </Box>
                </UnstyledButton>
            );
          })}
        </SimpleGrid>
      )}

      {/* Level Select Modal */}
      <Modal opened={showLevelSelect} onClose={() => setShowLevelSelect(false)} title="Select Levels" centered scrollAreaComponent={Box}>
         <SimpleGrid cols={5} spacing="xs">
             {Array.from({ length: 60 }, (_, i) => i + 1).map(l => (
                  <Button 
                    key={l}
                    onClick={() => toggleLevel(l)}
                    variant={levels.includes(l) ? 'filled' : 'default'}
                    size="sm"
                    p={0}
                  >
                      {l}
                  </Button>
             ))}
         </SimpleGrid>
      </Modal>

    </div>
  );
};
