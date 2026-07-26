import { useEffect, useMemo, useState } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import ThemeContext from '../contexts/ThemeContext';
import buildTheme from '../theme';
import themes, { defaultThemeId, applyCssVariables } from '../themes';

const STORAGE_KEY = 'sb-theme-id';

function readStoredThemeId() {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored && themes[stored] ? stored : defaultThemeId;
}

function ThemeModeProvider({ children }) {
  const [themeId, setThemeIdState] = useState(readStoredThemeId);

  const activePalette = themes[themeId] ?? themes[defaultThemeId];
  const muiTheme = useMemo(() => buildTheme(activePalette.colors), [activePalette]);

  useEffect(() => {
    applyCssVariables(activePalette.colors);
  }, [activePalette]);

  function setThemeId(id) {
    if (!themes[id]) {
      return;
    }
    localStorage.setItem(STORAGE_KEY, id);
    setThemeIdState(id);
  }

  const themeOptions = Object.entries(themes).map(([id, { label, colors }]) => ({
    id,
    label,
    colors,
  }));

  return (
    <ThemeContext.Provider value={{ themeId, setThemeId, themeOptions }}>
      <ThemeProvider theme={muiTheme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeContext.Provider>
  );
}

export default ThemeModeProvider;
