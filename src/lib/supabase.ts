import hanziIndex from '../output/data/hanzi_index.json';

// Use Vite's glob import to preload all hanzi JSON files
const hanziModules = import.meta.glob('../output/data/hanzi/*.json', { eager: true });

// Raw data structure from output/data/hanzi/*.json
interface HanziRawData {
  hanzi: string;
  pinyin: string[];
  meanings: string[];
  hsk_level: number;
  frequency: number | null;
  structure: {
    radical: string | null;
    components: string[];
  };
  strokes: {
    count: number;
    svg: string; // Path like "strokes/svg/25105.svg"
    gif?: string; // Path like "strokes/gif/25105.gif"
  };
}

interface HanziIndexEntry {
  hanzi: string;
  id: string;
  hsk_level: number;
  frequency: number | null;
  stroke_count: number;
  detail_file: string; // Path like "hanzi/我.json"
}

interface HanziIndex {
  meta: {
    version: string;
    generated_at: string;
    hsk_version: string;
  };
  characters: HanziIndexEntry[];
}

export interface HSKCharacter {
  id: string;
  hanzi: string;
  pinyin: string; // First pinyin from array, formatted with tone marks
  pinyin_all?: string[]; // All pinyin pronunciations with tone marks
  meanings: string[]; // Array of meanings
  hsk_level: number;
  stroke_order: string; // SVG path
  stroke_order_gif?: string; // GIF path (derived from SVG path)
  stroke_count: number;
  radical: string | null;
  created_at?: string;
}

// Cache for loaded characters
const characterCache = new Map<string, HSKCharacter>();
const indexData = hanziIndex as HanziIndex;

// Tone marks mapping
const TONE_MARKS: { [key: string]: string } = {
  'a': 'āáǎà',
  'e': 'ēéěè',
  'i': 'īíǐì',
  'o': 'ōóǒò',
  'u': 'ūúǔù',
  'ü': 'ǖǘǚǜ',
  'v': 'ǖǘǚǜ', // v is sometimes used for ü
};

// Convert pinyin with tone number to pinyin with tone marks
export const numberToTone = (pinyin: string): string => {
  // Extract tone number (1-5, where 5 means no tone/neutral)
  const toneMatch = pinyin.match(/(\d)$/);
  if (!toneMatch) {
    return pinyin.toLowerCase();
  }

  const tone = parseInt(toneMatch[1]);
  if (tone === 5 || tone === 0) {
    // Neutral tone, just remove the number
    return pinyin.replace(/\d$/, '').toLowerCase();
  }

  // Remove the tone number
  let pinyinWithoutTone = pinyin.replace(/\d$/, '').toLowerCase();
  
  // Vowel priority: a > e > o > i > u > ü
  // Check for ü first (before u, since u might be part of ü)
  if (pinyinWithoutTone.includes('ü') || pinyinWithoutTone.includes('v')) {
    pinyinWithoutTone = pinyinWithoutTone.replace(/[üv]/, TONE_MARKS['ü'][tone - 1]);
    return pinyinWithoutTone;
  }
  
  // Check for a
  if (pinyinWithoutTone.includes('a')) {
    pinyinWithoutTone = pinyinWithoutTone.replace('a', TONE_MARKS['a'][tone - 1]);
    return pinyinWithoutTone;
  }
  
  // Check for e
  if (pinyinWithoutTone.includes('e')) {
    pinyinWithoutTone = pinyinWithoutTone.replace('e', TONE_MARKS['e'][tone - 1]);
    return pinyinWithoutTone;
  }
  
  // Check for o
  if (pinyinWithoutTone.includes('o')) {
    pinyinWithoutTone = pinyinWithoutTone.replace('o', TONE_MARKS['o'][tone - 1]);
    return pinyinWithoutTone;
  }
  
  // Check for i
  if (pinyinWithoutTone.includes('i')) {
    pinyinWithoutTone = pinyinWithoutTone.replace('i', TONE_MARKS['i'][tone - 1]);
    return pinyinWithoutTone;
  }
  
  // Check for u
  if (pinyinWithoutTone.includes('u')) {
    pinyinWithoutTone = pinyinWithoutTone.replace('u', TONE_MARKS['u'][tone - 1]);
    return pinyinWithoutTone;
  }
  
  // If no vowel found, return as is (shouldn't happen in valid pinyin)
  return pinyinWithoutTone;
};

// Convert pinyin number notation to tone marks
const formatPinyin = (pinyin: string): string => {
  return numberToTone(pinyin);
};

// Load a single character from its JSON file
const loadCharacter = (detailFile: string): HSKCharacter | null => {
  try {
    // Extract hanzi from path like "hanzi/我.json"
    const hanzi = detailFile.replace('hanzi/', '').replace('.json', '');
    
    // Check cache first
    if (characterCache.has(hanzi)) {
      return characterCache.get(hanzi)!;
    }

    // Get the module path - convert "hanzi/我.json" to "../output/data/hanzi/我.json"
    const modulePath = `../output/data/${detailFile}`;
    const module = hanziModules[modulePath] as { default: HanziRawData } | undefined;
    
    if (!module) {
      console.warn(`Character file not found: ${detailFile}`);
      return null;
    }

    const data = module.default;

    // Format pinyin - take first one and format it with tone marks
    const pinyin = data.pinyin && data.pinyin.length > 0 
      ? formatPinyin(data.pinyin[0]) 
      : '';
    
    // Also format all pinyin pronunciations for display
    const formattedPinyinArray = data.pinyin && data.pinyin.length > 0
      ? data.pinyin.map(p => formatPinyin(p))
      : [];

    // Convert SVG path to GIF path if SVG exists
    const svgPath = data.strokes?.svg || '';
    const gifPath = svgPath ? svgPath.replace('/svg/', '/gif/').replace('.svg', '.gif') : undefined;

    const character: HSKCharacter = {
      id: `hanzi-${hanzi}`,
      hanzi: data.hanzi,
      pinyin: pinyin,
      pinyin_all: formattedPinyinArray,
      meanings: data.meanings || [],
      hsk_level: data.hsk_level,
      stroke_order: svgPath,
      stroke_order_gif: gifPath,
      stroke_count: data.strokes?.count || 0,
      radical: data.structure?.radical || null,
      created_at: new Date().toISOString(),
    };

    // Cache it
    characterCache.set(hanzi, character);
    return character;
  } catch (error) {
    console.error(`Failed to load character from ${detailFile}:`, error);
    return null;
  }
};

// Load all characters for a specific HSK level
const loadCharactersByLevel = (level: number): HSKCharacter[] => {
  const entries = indexData.characters.filter(entry => entry.hsk_level === level);
  const characters: HSKCharacter[] = [];

  for (const entry of entries) {
    const character = loadCharacter(entry.detail_file);
    if (character) {
      characters.push(character);
    }
  }

  return characters;
};

// Load all characters (can be slow, use with caution)
const loadAllCharacters = (): HSKCharacter[] => {
  const characters: HSKCharacter[] = [];

  for (const entry of indexData.characters) {
    const character = loadCharacter(entry.detail_file);
    if (character) {
      characters.push(character);
    }
  }

  return characters;
};

// Simulate Supabase-like API for easy migration
export const supabase = {
  from: (table: string) => {
    if (table !== 'hsk_characters') {
      throw new Error(`Table ${table} not found`);
    }

    return {
      select: (_columns: string) => {
        let filtered: HSKCharacter[] = [];
        let orderBy: { column: string; ascending: boolean } | null = null;

        return {
          eq: (column: string, value: any) => {
            // Filter by column and value
            if (column === 'hsk_level') {
              filtered = loadCharactersByLevel(value);
            } else if (column === 'hanzi') {
              const searchValue = String(value).trim();
              const indexEntry = indexData.characters.find(entry => entry.hanzi === searchValue);
              if (indexEntry) {
                const character = loadCharacter(indexEntry.detail_file);
                filtered = character ? [character] : [];
              } else {
                filtered = [];
              }
            } else {
              filtered = loadAllCharacters().filter((char: any) => char[column] === value);
            }
            
            return {
              maybeSingle: async () => {
                return Promise.resolve({ data: filtered[0] || null, error: null });
              },
              order: (orderColumn: string, options?: { ascending: boolean }) => {
                orderBy = { column: orderColumn, ascending: options?.ascending ?? true };
                const sorted = [...filtered].sort((a: any, b: any) => {
                  const aVal = a[orderColumn];
                  const bVal = b[orderColumn];
                  if (orderBy!.ascending) {
                    return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
                  } else {
                    return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
                  }
                });
                return Promise.resolve({ data: sorted, error: null });
              },
            };
          },
          order: (orderColumn: string, options?: { ascending: boolean }) => {
            filtered = loadAllCharacters();
            
            orderBy = { column: orderColumn, ascending: options?.ascending ?? true };
            const sorted = [...filtered].sort((a: any, b: any) => {
              const aVal = a[orderColumn];
              const bVal = b[orderColumn];
              if (orderBy!.ascending) {
                return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
              } else {
                return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
              }
            });
            return Promise.resolve({ data: sorted, error: null });
          },
        };
      },
    };
  },
};
