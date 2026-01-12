import { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  TextField,
  Button,
  Card,
  CardContent,
  Alert,
} from '@mui/material';
import { Download, Plus } from 'lucide-react';
import { supabase, HSKCharacter } from '../lib/supabase';

type GridType = 'cross' | 'diagonal' | 'tianzi' | 'plain';

export const PracticeSheet = () => {
  const [input, setInput] = useState('');
  const [characters, setCharacters] = useState<HSKCharacter[]>([]);
  const [notFound, setNotFound] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [gridType, setGridType] = useState<GridType>('cross');

  const handleGenerate = async () => {
    if (!input.trim()) return;

    setLoading(true);
    const inputChars = input.trim().split('').filter(char => char.trim());
    const foundChars: HSKCharacter[] = [];
    const missingChars: string[] = [];

    // Look up each character using the supabase service
    for (const char of inputChars) {
      try {
        const { data, error } = await supabase
          .from('hsk_characters')
          .select('*')
          .eq('hanzi', char)
          .maybeSingle();

        if (error) throw error;

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
    setNotFound(missingChars);
    setLoading(false);
  };

  const handlePrint = () => {
    window.print();
  };

  // Get grid styles based on type
  const getGridStyles = (type: GridType) => {
    const baseStyles: any = {
      width: { xs: 50, sm: 55, md: 60 },
      height: { xs: 50, sm: 55, md: 60 },
      border: type === 'tianzi' ? '2px solid #000' : '1px solid #000',
      borderColor: '#000',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
    };

    switch (type) {
      case 'cross':
        return {
          ...baseStyles,
          '&::before, &::after': {
            content: '""',
            position: 'absolute',
            backgroundColor: '#000',
            opacity: 0.3,
            printColorAdjust: 'exact',
            WebkitPrintColorAdjust: 'exact',
            colorAdjust: 'exact',
          },
          '&::before': {
            width: '1px',
            height: '100%',
            left: '50%',
          },
          '&::after': {
            width: '100%',
            height: '1px',
            top: '50%',
          },
        };
      case 'diagonal':
        return {
          ...baseStyles,
          '&::before, &::after': {
            content: '""',
            position: 'absolute',
            backgroundColor: '#000',
            opacity: 0.3,
            width: '1px',
            height: '141%',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%) rotate(45deg)',
            printColorAdjust: 'exact',
            WebkitPrintColorAdjust: 'exact',
            colorAdjust: 'exact',
          },
          '&::after': {
            transform: 'translate(-50%, -50%) rotate(-45deg)',
          },
        };
      case 'tianzi':
        return {
          ...baseStyles,
          border: '2px solid #000',
          '&::before, &::after': {
            content: '""',
            position: 'absolute',
            backgroundColor: '#000',
            opacity: 0.3,
            printColorAdjust: 'exact',
            WebkitPrintColorAdjust: 'exact',
            colorAdjust: 'exact',
          },
          '&::before': {
            width: '1px',
            height: '100%',
            left: '50%',
          },
          '&::after': {
            width: '100%',
            height: '1px',
            top: '50%',
          },
        };
      case 'plain':
      default:
        return baseStyles;
    }
  };

  // Render a grid preview based on type
  const renderGridPreview = (type: GridType) => {
    return (
      <Box
        sx={{
          width: 50,
          height: 50,
          ...getGridStyles(type),
        }}
      />
    );
  };

  return (
    <>
      <style>
        {`
          @media print {
            body * {
              visibility: hidden;
            }
            .practice-sheet-content,
            .practice-sheet-content * {
              visibility: visible;
            }
            .practice-sheet-content {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
            }
            .no-print {
              display: none !important;
            }
            .practice-sheet-content *::before,
            .practice-sheet-content *::after {
              visibility: visible !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color-adjust: exact !important;
              display: block !important;
            }
            @page {
              size: A4;
              margin: 1cm;
            }
          }
        `}
      </style>
      <Container maxWidth="lg" sx={{ py: { xs: 2, sm: 3, md: 4 }, px: { xs: 2, sm: 3 } }}>
        <Box className="no-print">
          <Typography 
            variant="h4" 
            gutterBottom 
            sx={{ 
              mb: { xs: 2, sm: 3 }, 
              fontWeight: 700,
              fontSize: { xs: '1.5rem', sm: '2rem', md: '2.125rem' }
            }}
          >
            Practice Sheet Generator
          </Typography>

          <Card sx={{ mb: 4 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Enter Chinese Characters
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Type or paste the Chinese characters you want to practice
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, mb: { xs: 2, sm: 3 } }}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="e.g., 你好世界"
                  sx={{
                    '& .MuiInputBase-input': {
                      fontSize: { xs: '1.2rem', sm: '1.35rem', md: '1.5rem' },
                      fontFamily: '"Noto Sans SC", serif',
                    },
                  }}
                />
              </Box>
              
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Select Grid Type
                </Typography>
                <Box sx={{ display: 'flex', gap: { xs: 1, sm: 2 }, flexWrap: 'wrap' }}>
                  {[
                    { value: 'cross' as GridType, label: 'Cross Lines' },
                    { value: 'diagonal' as GridType, label: 'Diagonal Lines' },
                    { value: 'tianzi' as GridType, label: 'Tianzi Ge (田字格)' },
                    { value: 'plain' as GridType, label: 'Plain Grid' },
                  ].map((option) => (
                    <Box
                      key={option.value}
                      onClick={() => setGridType(option.value)}
                      sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 1,
                        p: { xs: 1.5, sm: 2 },
                        border: gridType === option.value ? '2px solid' : '1px solid',
                        borderColor: gridType === option.value ? 'primary.main' : 'divider',
                        borderRadius: 2,
                        cursor: 'pointer',
                        bgcolor: gridType === option.value ? 'primary.50' : 'transparent',
                        transition: 'all 0.2s',
                        flex: { xs: '1 1 calc(50% - 8px)', sm: '0 1 auto' },
                        minWidth: { xs: 'calc(50% - 8px)', sm: 'auto' },
                        '&:hover': {
                          borderColor: 'primary.main',
                          bgcolor: 'action.hover',
                        },
                      }}
                    >
                      {renderGridPreview(option.value)}
                      <Typography variant="caption" sx={{ fontSize: '0.75rem' }}>
                        {option.label}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Box>

              <Button
                variant="contained"
                onClick={handleGenerate}
                disabled={loading || !input.trim()}
                startIcon={<Plus size={20} />}
              >
                Generate Practice Sheet
              </Button>
            </CardContent>
          </Card>

          {notFound.length > 0 && (
            <Alert severity="warning" sx={{ mb: 3 }}>
              Characters not found: {notFound.join(', ')}
            </Alert>
          )}

          {characters.length > 0 && (
            <Box sx={{ 
              display: 'flex', 
              flexDirection: { xs: 'column', sm: 'row' },
              justifyContent: 'space-between', 
              alignItems: { xs: 'stretch', sm: 'center' },
              gap: { xs: 1.5, sm: 0 },
              mb: { xs: 2, sm: 3 } 
            }}>
              <Typography 
                variant="h5" 
                sx={{ 
                  fontWeight: 600,
                  fontSize: { xs: '1.25rem', sm: '1.5rem' }
                }}
              >
                Your Practice Sheet
              </Typography>
              <Button
                variant="outlined"
                startIcon={<Download size={20} />}
                onClick={handlePrint}
                sx={{ width: { xs: '100%', sm: 'auto' } }}
              >
                Print / Save as PDF
              </Button>
            </Box>
          )}
        </Box>

        {characters.length > 0 && (
          <Box className="practice-sheet-content">
            {characters.map((char, index) => (
              <Box
                key={index}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: { xs: 1, sm: 1.5 },
                  mb: { xs: 2, sm: 2.5 },
                  pageBreakInside: 'avoid',
                  minHeight: { xs: '120px', sm: '140px' },
                }}
              >
                {/* Pinyin on the left */}
                <Box sx={{ 
                  minWidth: { xs: '40px', sm: '50px' }, 
                  textAlign: 'left' 
                }}>
                  <Typography
                    variant="body1"
                    sx={{
                      fontSize: { xs: '0.8rem', sm: '0.9rem', md: '0.95rem' },
                      fontWeight: 500,
                      fontFamily: 'monospace',
                    }}
                  >
                    {char.pinyin}
                  </Typography>
                </Box>

                

                {/* Grids in two rows */}
                <Box sx={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: { xs: 0.25, sm: 0.5 }, 
                  flex: 1,
                  overflow: { xs: 'auto', sm: 'visible' }
                }}>
                  {/* First row: 10 grids */}
                  <Box sx={{ 
                    display: 'flex', 
                    gap: { xs: 0.25, sm: 0.5 }, 
                    alignItems: 'center',
                    flexWrap: { xs: 'nowrap', sm: 'nowrap' }
                  }}>
                    {[...Array(10)].map((_, i) => (
                      <Box
                        key={`row1-${i}`}
                        sx={getGridStyles(gridType)}
                      >
                        {i === 0 && (
                          <Typography
                            sx={{
                              fontFamily: '"Noto Sans SC", serif',
                              fontSize: { xs: '1.5rem', sm: '1.75rem', md: '2rem' },
                              color: '#000',
                              fontWeight: 'bold',
                              zIndex: 1,
                            }}
                          >
                            {char.hanzi}
                          </Typography>
                        )}
                        {i >= 1 && i <= 3 && (
                          <Typography
                            sx={{
                              fontFamily: '"Noto Sans SC", serif',
                              fontSize: { xs: '1.1rem', sm: '1.3rem', md: '1.5rem' },
                              color: 'rgba(0, 0, 0, 0.4)',
                              zIndex: 1,
                            }}
                          >
                            {char.hanzi}
                          </Typography>
                        )}
                      </Box>
                    ))}
                  </Box>

                  {/* Second row: 10 grids */}
                  <Box sx={{ 
                    display: 'flex', 
                    gap: { xs: 0.25, sm: 0.5 }, 
                    alignItems: 'center',
                    flexWrap: { xs: 'nowrap', sm: 'nowrap' }
                  }}>
                    {[...Array(10)].map((_, i) => (
                      <Box
                        key={`row2-${i}`}
                        sx={getGridStyles(gridType)}
                      />
                    ))}
                  </Box>
                </Box>
              </Box>
            ))}
          </Box>
        )}
      </Container>
    </>
  );
};
