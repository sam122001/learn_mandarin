import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Container,
  Typography,
  TextField,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  CircularProgress,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Search } from 'lucide-react';
import { supabase, HSKCharacter, numberToTone } from '../lib/supabase';

interface CharacterLookupProps {
  initialCharacter?: string | null;
}

export const CharacterLookup = ({ initialCharacter }: CharacterLookupProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [characters, setCharacters] = useState<HSKCharacter[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notFoundChars, setNotFoundChars] = useState<string[]>([]);
  const svgRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const gifRefs = useRef<Map<string, HTMLImageElement>>(new Map());

  const handleSearch = useCallback(async (searchValue?: string) => {
    const valueToSearch = searchValue !== undefined ? searchValue : searchTerm.trim();
    if (!valueToSearch) return;

    setLoading(true);
    setError(null);
    setCharacters([]);
    setNotFoundChars([]);

    try {
      // Split input into individual characters, filtering out spaces and keeping only Chinese characters
      // Match Chinese characters (CJK Unified Ideographs)
      const chineseCharRegex = /[\u4e00-\u9fff]/g;
      const inputChars = valueToSearch.match(chineseCharRegex) || [];
      
      if (inputChars.length === 0) {
        setError('Please enter at least one Chinese character');
        setLoading(false);
        return;
      }

      const foundChars: HSKCharacter[] = [];
      const missingChars: string[] = [];

      // Look up each character
      for (const char of inputChars) {
        try {
          const result = await supabase
            .from('hsk_characters')
            .select('*')
            .eq('hanzi', char)
            .maybeSingle();

          const { data, error: fetchError } = result;

          if (fetchError) {
            console.error(`Error fetching character ${char}:`, fetchError);
            missingChars.push(char);
            continue;
          }

          if (data) {
            foundChars.push(data);
          } else {
            missingChars.push(char);
          }
        } catch (err) {
          console.error(`Error loading character ${char}:`, err);
          missingChars.push(char);
        }
      }

      setCharacters(foundChars);
      setNotFoundChars(missingChars);

      if (foundChars.length === 0 && missingChars.length > 0) {
        setError(`No characters found. Missing: ${missingChars.join(', ')}`);
      } else if (missingChars.length > 0) {
        setError(`Some characters not found: ${missingChars.join(', ')}`);
      } else {
        setError(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search characters');
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-search when initialCharacter prop changes (only on mount or when initialCharacter actually changes)
  const prevInitialCharacterRef = useRef<string | null | undefined>(undefined);
  
  useEffect(() => {
    // Only auto-search if initialCharacter changed from previous value
    if (initialCharacter !== prevInitialCharacterRef.current) {
      prevInitialCharacterRef.current = initialCharacter;
      
      if (initialCharacter) {
        setSearchTerm(initialCharacter);
        handleSearch(initialCharacter);
      } else {
        // Clear search when initialCharacter is cleared
        setSearchTerm('');
        setCharacters([]);
        setError(null);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCharacter]); // Only depend on initialCharacter

  // Load and display SVG with animation support for auto-play and looping
  const loadSVGForCharacter = async (char: HSKCharacter, containerRef: HTMLDivElement) => {
    if (!char.stroke_order || char.stroke_order_gif) return;
    
    try {
      const response = await fetch(char.stroke_order);
      if (response.ok) {
        let svgText = await response.text();
        containerRef.innerHTML = svgText;
        // Set size
        const svgElement = containerRef.querySelector('svg');
        if (svgElement) {
          svgElement.setAttribute('width', '200');
          svgElement.setAttribute('height', '200');
          svgElement.style.width = '200px';
          svgElement.style.height = '200px';
        }
        // After DOM is updated, modify CSS to add infinite looping
        setTimeout(() => {
          if (svgElement) {
            const styleSheet = svgElement.querySelector('style');
            if (styleSheet && styleSheet.textContent) {
              let styleText = styleSheet.textContent;
              // Replace animation declarations to add infinite
              styleText = styleText.replace(
                /animation:\s*([^\s]+\s+[\d.]+s)\s+([^;]+?);/gi,
                (match, animName, rest) => {
                  if (match.includes('infinite')) {
                    return match;
                  }
                  const trimmed = rest.trim();
                  const fillModes = ['both', 'forwards', 'backwards', 'none'];
                  const hasFillMode = fillModes.some(mode => trimmed.endsWith(mode));
                  
                  if (hasFillMode) {
                    const parts = trimmed.split(/\s+/);
                    const lastPart = parts[parts.length - 1];
                    if (fillModes.includes(lastPart)) {
                      parts[parts.length - 1] = `infinite ${lastPart}`;
                      return `animation: ${animName} ${parts.join(' ')};`;
                    }
                  }
                  return `animation: ${animName} ${trimmed} infinite;`;
                }
              );
              styleText = styleText.replace(
                /animation-iteration-count:\s*[\d]+;/gi,
                'animation-iteration-count: infinite;'
              );
              styleText = styleText.replace(
                /(#[a-zA-Z0-9-]+\s*\{[^}]*?animation[^}]*?)(?!.*animation-iteration-count)([^}]*?\})/gi,
                (match, before, after) => {
                  if (match.includes('infinite')) {
                    return match;
                  }
                  return `${before} animation-iteration-count: infinite; ${after}`;
                }
              );
              styleSheet.textContent = styleText;
            }
          }
        }, 10);
      } else {
        throw new Error('Failed to load SVG');
      }
    } catch (err) {
      console.error('Failed to load SVG:', err);
      if (containerRef) {
        containerRef.innerHTML = `<img src="${char.stroke_order}" style="width: 200px; height: 200px; object-fit: contain;" onerror="this.style.display='none'" />`;
      }
    }
  };


  const handleSearchClick = () => {
    const trimmed = searchTerm.trim();
    if (trimmed) {
      handleSearch(trimmed);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearchClick();
    }
  };

  // Convert pinyin in meanings from number notation to tone marks
  // Handles patterns like [ba1], [yao1], etc.
  const formatMeaningWithPinyin = (meaning: string): string => {
    // Match pinyin patterns like [ba1], [yao1], [ma3], etc.
    return meaning.replace(/\[([a-züv]+)(\d)\]/gi, (match, pinyin, tone) => {
      const formattedPinyin = numberToTone(pinyin + tone);
      return `[${formattedPinyin}]`;
    });
  };

  return (
    <Container maxWidth="md" sx={{ py: { xs: 2, sm: 3, md: 4 }, px: { xs: 2, sm: 3 } }}>
      <Typography 
        variant="h4" 
        gutterBottom 
        sx={{ 
          mb: { xs: 2, sm: 3 }, 
          fontWeight: 700,
          fontSize: { xs: '1.5rem', sm: '2rem', md: '2.125rem' }
        }}
      >
        Character Lookup
      </Typography>

      <Card sx={{ mb: { xs: 2, sm: 3, md: 4 } }}>
        <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
          <Typography 
            variant="h6" 
            gutterBottom
            sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}
          >
            Search for a Character
          </Typography>
          <Typography 
            variant="body2" 
            color="text.secondary" 
            sx={{ 
              mb: { xs: 1.5, sm: 2 },
              fontSize: { xs: '0.8rem', sm: '0.875rem' }
            }}
          >
            Enter one or more Chinese characters to see their details
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: { xs: 1.5, sm: 2 } }}>
            <TextField
              fullWidth
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="e.g., 学"
              sx={{
                '& .MuiInputBase-input': {
                  fontSize: { xs: '1.5rem', sm: '1.75rem', md: '2rem' },
                  fontFamily: '"Noto Sans SC", serif',
                  py: { xs: 1, sm: 1.5 },
                },
              }}
            />
            <Button
              variant="contained"
              onClick={handleSearchClick}
              disabled={loading || !searchTerm.trim()}
              startIcon={<Search size={20} />}
              sx={{ 
                minWidth: { xs: '100%', sm: 120 },
                py: { xs: 1.5, sm: 1 }
              }}
            >
              Search
            </Button>
          </Box>
        </CardContent>
      </Card>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {error && (
        <Alert severity={notFoundChars.length > 0 && characters.length > 0 ? 'warning' : 'error'} sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {characters.length > 0 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {characters.map((character, index) => {
            const svgRefKey = `svg-${character.id}`;
            const gifRefKey = `gif-${character.id}`;
            
            return (
              <Accordion key={character.id} defaultExpanded={index === 0}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: { xs: 1, sm: 2 }, 
                    width: '100%',
                    flexWrap: { xs: 'wrap', sm: 'nowrap' }
                  }}>
                    <Typography
                      variant="h3"
                      sx={{
                        fontFamily: '"Noto Sans SC", serif',
                        color: 'primary.main',
                        minWidth: { xs: '60px', sm: '80px' },
                        fontSize: { xs: '2rem', sm: '3rem' },
                      }}
                    >
                      {character.hanzi}
                    </Typography>
                    <Chip 
                      label={`HSK ${character.hsk_level}`} 
                      color="primary" 
                      size="small"
                      sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}
                    />
                    <Typography 
                      variant="h6" 
                      color="text.secondary" 
                      sx={{ 
                        ml: { xs: 'auto', sm: 'auto' },
                        fontSize: { xs: '1rem', sm: '1.25rem' }
                      }}
                    >
                      {character.pinyin}
                    </Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails sx={{ p: { xs: 1, sm: 2 } }}>
                  <Card>
                    <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                      <Box sx={{ textAlign: 'center', py: { xs: 1, sm: 2 } }}>
                        <Typography
                          variant="h1"
                          sx={{
                            fontFamily: '"Noto Sans SC", serif',
                            color: 'primary.main',
                            fontSize: { xs: '4rem', sm: '5rem', md: '6rem' },
                            mb: { xs: 1, sm: 2 },
                          }}
                        >
                          {character.hanzi}
                        </Typography>
                        <Chip
                          label={`HSK ${character.hsk_level}`}
                          color="primary"
                          sx={{ mb: 2 }}
                        />
                      </Box>

                      <Divider sx={{ my: { xs: 1.5, sm: 2 } }} />

                      <Box sx={{ mb: { xs: 2, sm: 3 } }}>
                        <Typography 
                          variant="h6" 
                          gutterBottom 
                          sx={{ 
                            fontWeight: 600,
                            fontSize: { xs: '1rem', sm: '1.25rem' }
                          }}
                        >
                          Pronunciation
                        </Typography>
                        {character.pinyin_all && character.pinyin_all.length > 1 ? (
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
                            {character.pinyin_all.map((p, idx) => (
                              <Chip
                                key={idx}
                                label={p}
                                variant={idx === 0 ? 'filled' : 'outlined'}
                                color={idx === 0 ? 'primary' : 'default'}
                                sx={{ 
                                  fontSize: { xs: '0.9rem', sm: '1rem', md: '1.1rem' }, 
                                  height: { xs: '32px', sm: '36px' }
                                }}
                              />
                            ))}
                          </Box>
                        ) : (
                          <Typography variant="h5" color="text.secondary">
                            {character.pinyin}
                          </Typography>
                        )}
                      </Box>

                      <Box sx={{ mb: { xs: 2, sm: 3 } }}>
                        <Typography 
                          variant="h6" 
                          gutterBottom 
                          sx={{ 
                            fontWeight: 600,
                            fontSize: { xs: '1rem', sm: '1.25rem' }
                          }}
                        >
                          Meanings
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                          {character.meanings && character.meanings.length > 0 ? (
                            character.meanings.map((meaning, idx) => (
                              <Chip 
                                key={idx} 
                                label={formatMeaningWithPinyin(meaning)} 
                                variant="outlined" 
                              />
                            ))
                          ) : (
                            <Typography variant="body1" color="text.secondary">
                              No meanings available
                            </Typography>
                          )}
                        </Box>
                      </Box>

                      {character.stroke_count > 0 && (
                        <Box sx={{ mb: { xs: 2, sm: 3 } }}>
                          <Typography 
                            variant="h6" 
                            gutterBottom 
                            sx={{ 
                              fontWeight: 600,
                              fontSize: { xs: '1rem', sm: '1.25rem' }
                            }}
                          >
                            Stroke Count
                          </Typography>
                          <Typography variant="body1" color="text.secondary">
                            {character.stroke_count} strokes
                          </Typography>
                        </Box>
                      )}

                      {(character.stroke_order || character.stroke_order_gif) && (
                        <Box sx={{ mb: { xs: 2, sm: 3 } }}>
                          <Typography 
                            variant="h6" 
                            gutterBottom 
                            sx={{ 
                              fontWeight: 600,
                              fontSize: { xs: '1rem', sm: '1.25rem' }
                            }}
                          >
                            Stroke Order
                          </Typography>
                          <Box
                            sx={{
                              display: 'flex',
                              justifyContent: 'center',
                              alignItems: 'center',
                              bgcolor: 'background.default',
                              borderRadius: 2,
                              p: { xs: 1, sm: 2 },
                            }}
                            onMouseEnter={() => {
                              const gifRef = gifRefs.current.get(gifRefKey);
                              if (gifRef && character.stroke_order_gif) {
                                const currentSrc = gifRef.src.split('?')[0];
                                gifRef.src = '';
                                setTimeout(() => {
                                  if (gifRef) {
                                    gifRef.src = currentSrc + '?t=' + Date.now();
                                  }
                                }, 10);
                              }
                            }}
                          >
                            {character.stroke_order_gif ? (
                              <img
                                ref={(el) => {
                                  if (el) gifRefs.current.set(gifRefKey, el);
                                }}
                                src={character.stroke_order_gif}
                                alt={`Stroke order for ${character.hanzi}`}
                                style={{
                                  width: '100%',
                                  maxWidth: '200px',
                                  height: 'auto',
                                  aspectRatio: '1',
                                  objectFit: 'contain',
                                  cursor: 'pointer',
                                }}
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  if (character.stroke_order) {
                                    target.src = character.stroke_order;
                                  } else {
                                    target.style.display = 'none';
                                  }
                                }}
                              />
                            ) : character.stroke_order ? (
                              <Box
                                ref={(el: HTMLDivElement | null) => {
                                  if (el) {
                                    svgRefs.current.set(svgRefKey, el);
                                    loadSVGForCharacter(character, el);
                                  }
                                }}
                                sx={{
                                  width: '100%',
                                  maxWidth: '200px',
                                  aspectRatio: '1',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  '& svg': {
                                    width: '100%',
                                    height: '100%',
                                  },
                                }}
                              />
                            ) : null}
                          </Box>
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                </AccordionDetails>
              </Accordion>
            );
          })}
        </Box>
      )}
    </Container>
  );
};
