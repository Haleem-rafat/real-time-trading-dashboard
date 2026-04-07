import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  ThemeContext,
  type Theme,
  type ThemePreference,
} from './theme-context';

const STORAGE_KEY = 'trading_theme_pref';

function readStoredPreference(): ThemePreference {
  if (typeof window === 'undefined') return 'system';
  const raw = window.localStorage.getItem(STORAGE_KEY);
  return raw === 'light' || raw === 'dark' || raw === 'system' ? raw : 'system';
}

function getSystemTheme(): Theme {
  if (typeof window === 'undefined' || !window.matchMedia) return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

interface Props {
  children: ReactNode;
}

/**
 * Persists the user's theme choice to localStorage and applies the
 * resolved theme to <html data-theme="…">. When the choice is `system`,
 * it watches `prefers-color-scheme` and updates live as the OS toggles
 * dark mode (e.g. macOS sunset auto-switch).
 *
 * Implementation notes:
 * - `theme` is *derived* during render from `preference` + `systemTheme`
 *   so we never call `setState` inside an effect body. The OS listener
 *   only writes to state inside its event callback, which is allowed.
 * - The actual color tokens live in app.css; this provider just flips
 *   the `data-theme` attribute that those CSS variables key off of.
 */
export function ThemeProvider({ children }: Props) {
  const [preference, setPreferenceState] = useState<ThemePreference>(() =>
    readStoredPreference(),
  );
  const [systemTheme, setSystemTheme] = useState<Theme>(() => getSystemTheme());

  // Derived during render — no setState needed.
  const theme: Theme = preference === 'system' ? systemTheme : preference;

  // Apply the resolved theme to the <html> element so the CSS variables
  // re-skin the entire UI in one go. The matching boot script in
  // index.html runs the same logic before first paint to avoid a flash.
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Subscribe to OS-level dark mode changes. setState lives only inside
  // the listener callback (allowed), the effect body itself is just the
  // subscribe/unsubscribe pair.
  //
  // Older WebKit (iOS Safari < 14, macOS Safari < 14) doesn't have
  // `addEventListener` on MediaQueryList — it only ships the deprecated
  // `addListener`. We feature-detect both so the listener actually fires
  // on those devices instead of silently no-op'ing.
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');

    const handler = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? 'dark' : 'light');
    };

    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', handler);
      return () => mq.removeEventListener('change', handler);
    }
    // Legacy Safari fallback
    mq.addListener(handler);
    return () => mq.removeListener(handler);
  }, []);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // localStorage may be unavailable in private modes — non-fatal.
    }
  }, []);

  const toggle = useCallback(() => {
    // Explicit pick (drops out of `system` follow-mode).
    setPreference(theme === 'dark' ? 'light' : 'dark');
  }, [theme, setPreference]);

  const value = useMemo(
    () => ({ theme, preference, setPreference, toggle }),
    [theme, preference, setPreference, toggle],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}
