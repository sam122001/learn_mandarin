import { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Box,
  useMediaQuery,
  useTheme,
  Link,
} from '@mui/material';
import {
  Menu as MenuIcon,
  BookOpen,
  FileText,
  Search,
  Lightbulb,
  Moon,
  Sun,
} from 'lucide-react';
import { HSKBrowser } from './components/HSKBrowser';
import { PracticeSheet } from './components/PracticeSheet';
import { CharacterLookup } from './components/CharacterLookup';
import { useThemeMode } from './contexts/ThemeContext';
import { HSKCharacter } from './lib/supabase';

type View = 'browser' | 'practice' | 'lookup';

function App() {
  const [currentView, setCurrentView] = useState<View>('browser');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedCharacter, setSelectedCharacter] = useState<string | null>(null);
  const { mode, toggleTheme } = useThemeMode();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const menuItems = [
    { id: 'browser' as View, label: 'HSK Browser', icon: <BookOpen size={isMobile ? 20 : 24} /> },
    { id: 'lookup' as View, label: 'Character Details', icon: <Search size={isMobile ? 20 : 24} /> },
    { id: 'practice' as View, label: 'Practice Sheet', icon: <FileText size={isMobile ? 20 : 24} /> },
  ];

  const handleNavigation = (view: View) => {
    setCurrentView(view);
    setDrawerOpen(false);
    // Clear selected character when manually navigating
    if (view !== 'lookup') {
      setSelectedCharacter(null);
    }
  };

  const handleCharacterClick = (character: HSKCharacter) => {
    setSelectedCharacter(character.hanzi);
    setCurrentView('lookup');
    setDrawerOpen(false);
  };

  const renderView = () => {
    switch (currentView) {
      case 'browser':
        return <HSKBrowser onCharacterClick={handleCharacterClick} />;
      case 'lookup':
        return <CharacterLookup initialCharacter={selectedCharacter} />;
      case 'practice':
        return <PracticeSheet />;
      default:
        return <HSKBrowser onCharacterClick={handleCharacterClick} />;
    }
  };

  const drawer = (
    <Box sx={{ width: '100%', pt: 2 }}>
      <Box sx={{ px: 2, mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
          Let's Learn Chinese!
        </Typography>
      </Box>

      <List>
        {menuItems.map((item) => (
          <ListItem key={item.id} disablePadding>
            <ListItemButton
              selected={currentView === item.id}
              onClick={() => handleNavigation(item.id)}
            >
            <ListItemIcon sx={{ minWidth: { xs: 40, sm: 56 } }}>{item.icon}</ListItemIcon>
            <ListItemText 
              primary={item.label} 
              primaryTypographyProps={{
                fontSize: { xs: '0.875rem', sm: '1rem' }
              }}
            />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar position="fixed" sx={{ zIndex: theme.zIndex.drawer + 1 }}>
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={() => setDrawerOpen(!drawerOpen)}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon size={24} />
          </IconButton>
          <Lightbulb size={isMobile ? 24 : 28} style={{ marginRight: isMobile ? 8 : 12 }} />
          <Typography 
            variant="h6" 
            noWrap 
            component="div" 
            sx={{ 
              flexGrow: 1, 
              fontWeight: 700,
              fontSize: { xs: '0.9rem', sm: '1rem', md: '1.25rem' }
            }}
          >
            {isMobile ? 'HSK Learning' : 'HSK Chinese Learning'}
          </Typography>
          <IconButton color="inherit" onClick={toggleTheme}>
            {mode === 'light' ? <Moon size={24} /> : <Sun size={24} />}
          </IconButton>
        </Toolbar>
      </AppBar>

      {isMobile ? (
        <Drawer
          anchor="left"
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          sx={{
            '& .MuiDrawer-paper': {
              width: { xs: 240, sm: 250 },
            },
          }}
        >
          {drawer}
        </Drawer>
      ) : (
        <Drawer
          variant="permanent"
          sx={{
            width: { md: 240, lg: 250 },
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: { md: 240, lg: 250 },
              boxSizing: 'border-box',
              top: { md: 64 },
            },
          }}
        >
          {drawer}
        </Drawer>
      )}

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          pt: { xs: 7, sm: 8 },
          width: { xs: '100%', md: `calc(100% - 240px)`, lg: `calc(100% - 250px)` },
          display: 'flex',
          flexDirection: 'column',
          minHeight: { xs: 'calc(100vh - 56px)', sm: 'calc(100vh - 64px)' },
        }}
      >
        <Box sx={{ flex: 1 }}>
          {renderView()}
        </Box>
        
        {/* Footer with License Acknowledgement */}
        <Box
          component="footer"
          sx={{
            mt: 'auto',
            py: 2,
            px: 2,
            bgcolor: 'background.default',
            borderTop: 1,
            borderColor: 'divider',
            textAlign: 'center',
          }}
        >
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' }, px: { xs: 1, sm: 2 } }}>
            This project utilizes{' '}
            <Link href="#" color="primary" sx={{ textDecoration: 'none' }}>
              HSK 3.0 vocabulary data
            </Link>
            ,{' '}
            <Link href="#" color="primary" sx={{ textDecoration: 'none' }}>
              makemeahanzi character datasets
            </Link>
            , and open-source text-to-speech tools. Full acknowledgements are provided on{' '}
            <Link href="#" color="primary" sx={{ textDecoration: 'none' }}>
              this page
            </Link>
            .
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}

export default App;
