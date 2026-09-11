import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { AppState } from '../types';
import { initialState } from '../lib/defaults';
import { AppContext } from './context';
import type { AppContextValue } from './context';

const STORAGE_KEY = 'impulso.state.v1';

function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialState;
    const parsed = JSON.parse(raw) as Partial<AppState>;
    return {
      ...initialState,
      ...parsed,
      profile: { ...initialState.profile, ...parsed.profile },
      cv: { ...initialState.cv, ...parsed.cv },
    };
  } catch {
    return initialState;
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(loadState);
  const [saved, setSaved] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const firstRun = useRef(true);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Cuota llena o modo privado: la app sigue funcionando en memoria.
    }
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    setSaved(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setSaved(false), 1400);
    return () => window.clearTimeout(timer.current);
  }, [state]);

  useEffect(() => {
    document.documentElement.dataset.theme = state.theme;
  }, [state.theme]);

  const apply = useCallback((updater: (s: AppState) => AppState) => {
    setState((prev) => updater(prev));
  }, []);

  const value = useMemo<AppContextValue>(
    () => ({
      state,
      apply,
      saved,
      patchPersonal: (patch) =>
        apply((s) => ({ ...s, profile: { ...s.profile, personal: { ...s.profile.personal, ...patch } } })),
      setProfileList: (key, items) => apply((s) => ({ ...s, profile: { ...s.profile, [key]: items } })),
      patchCv: (patch) => apply((s) => ({ ...s, cv: { ...s.cv, ...patch } })),
      setApplications: (items) => apply((s) => ({ ...s, applications: items })),
      setLetters: (items) => apply((s) => ({ ...s, letters: items })),
      setAnswers: (items) => apply((s) => ({ ...s, answers: items })),
      replaceAll: (next) => setState(next),
    }),
    [state, apply, saved],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
