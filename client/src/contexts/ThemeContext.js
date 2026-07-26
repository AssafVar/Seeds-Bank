import { createContext } from 'react';

// { themeId, setThemeId, themeOptions } - see ThemeModeProvider.
const ThemeContext = createContext(null);

export default ThemeContext;
