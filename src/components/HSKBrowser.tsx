import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Container,
  Typography,
  Tabs,
  Tab,
  Card,
  CardContent,
  Grid,
  CircularProgress,
  Alert,
  TextField,
  InputAdornment,
} from '@mui/material';
import { Search } from 'lucide-react';
import { supabase, HSKCharacter } from '../lib/supabase';

interface HSKBrowserProps {
  onCharacterClick?: (character: HSKCharacter) => void;
}

export const HSKBrowser = ({ onCharacterClick }: HSKBrowserProps) => {
  const [selectedLevel, setSelectedLevel] = useState(1);
  const [characters, setCharacters] = useState<HSKCharacter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredCharacters, setFilteredCharacters] = useState<HSKCharacter[]>([]);
  const characterRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const isSwitchingLevelRef = useRef(false);

  useEffect(() => {
    fetchCharacters();
  }, [selectedLevel]);

  const searchAcrossAllLevels = useCallback(async (searchValue: string) => {
    try {
      // First check current level
      const exactMatch = characters.find((char) => char.hanzi === searchValue);
      if (exactMatch) {
        // Character found in current level - navigate to CharacterLookup
        onCharacterClick?.(exactMatch);
        return;
      }
      
      // Check for partial matches in current level
      const currentFiltered = characters.filter((char) =>
        char.hanzi.includes(searchValue)
      );
      if (currentFiltered.length > 0) {
        // Show all characters, but put matches first
        const sorted = [...characters].sort((a, b) => {
          const aMatches = a.hanzi.includes(searchValue);
          const bMatches = b.hanzi.includes(searchValue);
          if (aMatches && !bMatches) return -1;
          if (!aMatches && bMatches) return 1;
          return 0;
        });
        setFilteredCharacters(sorted);
        return;
      }

      // Search across all HSK levels
      for (let level = 1; level <= 6; level++) {
        // Skip current level since we already checked
        if (level === selectedLevel) continue;

        const { data, error } = await supabase
          .from('hsk_characters')
          .select('*')
          .eq('hsk_level', level)
          .order('pinyin', { ascending: true });

        if (error) continue;

        // Check if character exists in this level - look for exact match first
        const exactMatch = data?.find((char) => char.hanzi === searchValue);
        if (exactMatch) {
          // Exact match found - navigate to CharacterLookup immediately
          onCharacterClick?.(exactMatch);
          return;
        }

        // Check for partial matches
        const partialMatch = data?.find((char) => char.hanzi.includes(searchValue));
        if (partialMatch) {
          // Partial match found - switch to the level where the character was found
          isSwitchingLevelRef.current = true;
          setSelectedLevel(level);
          // The fetchCharacters will be called by the selectedLevel effect
          // and then the characters effect will filter and scroll
          return;
        }
      }

      // If not found in any level, show empty in current level
      setFilteredCharacters([]);
    } catch (err) {
      console.error('Error searching across levels:', err);
      // Fallback to current level search
      const filtered = characters.filter((char) =>
        char.hanzi.includes(searchValue)
      );
      setFilteredCharacters(filtered);
    }
  }, [characters, selectedLevel, onCharacterClick]);

  // Search across all levels when search term changes
  useEffect(() => {
    if (searchTerm.trim()) {
      const searchValue = searchTerm.trim();
      searchAcrossAllLevels(searchValue);
    } else {
      setFilteredCharacters(characters);
    }
  }, [searchTerm, searchAcrossAllLevels, characters]);

  // Sort and show characters when level changes (after level switch for search)
  useEffect(() => {
    if (isSwitchingLevelRef.current && searchTerm.trim() && characters.length > 0 && !loading) {
      // We just switched levels for a search, now sort to show matched character first
      const searchValue = searchTerm.trim();
      const exactMatch = characters.find((char) => char.hanzi === searchValue);
      
      if (exactMatch) {
        // Exact match found - navigate to CharacterLookup
        onCharacterClick?.(exactMatch);
        isSwitchingLevelRef.current = false;
        return;
      }
      
      // Show all characters, but put partial matches first
      const sorted = [...characters].sort((a, b) => {
        const aMatches = a.hanzi.includes(searchValue);
        const bMatches = b.hanzi.includes(searchValue);
        if (aMatches && !bMatches) return -1;
        if (!aMatches && bMatches) return 1;
        return 0;
      });
      setFilteredCharacters(sorted);
      isSwitchingLevelRef.current = false;
    } else if (!searchTerm.trim() && !isSwitchingLevelRef.current) {
      setFilteredCharacters(characters);
    }
  }, [characters, searchTerm, loading, onCharacterClick]);

  const fetchCharacters = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from('hsk_characters')
        .select('*')
        .eq('hsk_level', selectedLevel)
        .order('pinyin', { ascending: true }); // Sort alphabetically by pinyin

      if (error) throw error;
      const fetchedCharacters = data || [];
      setCharacters(fetchedCharacters);
      
      // If we're switching levels for a search, check for exact match
      if (isSwitchingLevelRef.current && searchTerm.trim()) {
        const searchValue = searchTerm.trim();
        const exactMatch = fetchedCharacters.find((char) => char.hanzi === searchValue);
        
        if (exactMatch) {
          // Exact match found - navigate to CharacterLookup
          onCharacterClick?.(exactMatch);
        } else {
          // Show all characters, but put partial matches first
          const sorted = [...fetchedCharacters].sort((a, b) => {
            const aMatches = a.hanzi.includes(searchValue);
            const bMatches = b.hanzi.includes(searchValue);
            if (aMatches && !bMatches) return -1;
            if (!aMatches && bMatches) return 1;
            return 0;
          });
          setFilteredCharacters(sorted);
        }
      } else if (!searchTerm.trim()) {
        setFilteredCharacters(fetchedCharacters);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch characters');
    } finally {
      setLoading(false);
    }
  };


  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setSelectedLevel(newValue);
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ mb: 3, fontWeight: 700 }}>
          HSK Character Browser
        </Typography>

      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search for a character (e.g., 学)"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search size={20} />
              </InputAdornment>
            ),
          }}
          sx={{
            mb: 2,
            '& .MuiInputBase-input': {
              fontSize: '1.2rem',
              fontFamily: searchTerm ? '"Noto Sans SC", serif' : 'inherit',
            },
          }}
        />
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 4 }}>
        <Tabs
          value={selectedLevel}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
        >
          {[1, 2, 3, 4, 5, 6].map((level) => (
            <Tab key={level} label={`HSK ${level}`} value={level} />
          ))}
        </Tabs>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : filteredCharacters.length === 0 ? (
        <Alert severity="info">
          {searchTerm.trim()
            ? `No characters found matching "${searchTerm}" in HSK Level ${selectedLevel}.`
            : `No characters found for HSK Level ${selectedLevel}. Add some characters to get started!`}
        </Alert>
      ) : (
        <Grid container spacing={2}>
          {filteredCharacters.map((char) => {
            const isMatched = searchTerm.trim() && char.hanzi === searchTerm.trim();
            return (
              <Grid {...({ item: true, xs: 6, sm: 4, md: 3, lg: 2 } as any)} key={char.id}>
              <Box
                ref={(el: HTMLDivElement | null) => {
                  if (el) {
                    characterRefs.current.set(char.id, el);
                  } else {
                    characterRefs.current.delete(char.id);
                  }
                }}
              >
                <Card
                  onClick={() => onCharacterClick?.(char)}
                  sx={{
                    height: '100%',
                    cursor: 'pointer',
                    transition: 'transform 0.2s, box-shadow 0.2s, background-color 0.3s',
                    backgroundColor: isMatched ? '#FFB3B3' : 'background.paper', // Pastel vermillion
                    border: isMatched ? '2px solid #FF6B6B' : 'none',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: 6,
                    },
                  }}
                >
                <CardContent sx={{ textAlign: 'center', p: 2 }}>
                  <Typography
                    variant="h3"
                    sx={{
                      fontFamily: '"Noto Sans SC", serif',
                      mb: 1,
                      color: 'primary.main',
                      textAlign: 'justify',
                      textAlignLast: 'center',
                    }}
                  >
                    {char.hanzi}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                    {char.pinyin || '—'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', minHeight: '2.5em' }}>
                    {char.meanings && char.meanings.length > 0 ? char.meanings[0] : '—'}
                  </Typography>
                </CardContent>
              </Card>
              </Box>
              </Grid>
            );
          })}
        </Grid>
      )}
    </Container>
  );
};
