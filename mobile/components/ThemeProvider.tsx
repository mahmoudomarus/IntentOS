import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import { darkTheme, lightTheme, ThemeColors } from '../theme';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
    mode: ThemeMode;
    isDark: boolean;
    colors: ThemeColors;
    setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType>({
    mode: 'system',
    isDark: true,
    colors: darkTheme.colors,
    setMode: () => { },
});

export const useTheme = () => useContext(ThemeContext);

interface ThemeProviderProps {
    children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
    const systemScheme = useColorScheme();
    const [mode, setMode] = useState<ThemeMode>('system');

    const resolvedIsDark = mode === 'system' ? systemScheme === 'dark' : mode === 'dark';
    const colors = resolvedIsDark ? darkTheme.colors : lightTheme.colors;

    return (
        <ThemeContext.Provider value={{ mode, setMode, isDark: resolvedIsDark, colors }}>
            {children}
        </ThemeContext.Provider>
    );
}
