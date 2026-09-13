import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { AppState } from '../types';
import { initialState } from '../lib/defaults';
import { clearAiSettings, loadAiSettings, saveAiSettings } from '../lib/ai/settings';
import type { AiSettings } from '../lib/ai/settings';
import { AppContext } from './context';
import type { AppContextValue } from './context';
import { checkpoint, loadState, persistState, STORAGE_KEY, RECOVERY_KEY } from '../lib/storage';

export function AppProvider({ children }: { children: ReactNode }) {
  const [loaded] = useState(loadState);
  const [state, setState] = useState<AppState>(loaded.state);
  const [saveError, setSaveError] = useState(loaded.error);
  const [saved, setSaved] = useState(false);
  const [ai, setAiState] = useState<AiSettings>(loadAiSettings);
  const [undoState, setUndoState] = useState<AppState | null>(null);
  const previous = useRef(state);
  const blocked = useRef(!!loaded.error);

  useEffect(() => {
    if (previous.current === state) return;
    previous.current = state;
    if (blocked.current) return;
    const error = persistState(state);
    setSaveError(error);
    setSaved(!error);
    const timer = window.setTimeout(() => setSaved(false), 2200);
    return () => clearTimeout(timer);
  }, [state]);
  useEffect(() => {
    document.documentElement.dataset.theme = 'light';
  }, []);

  const apply = useCallback((updater: (s: AppState) => AppState) => setState(updater), []);
  const replaceAll = useCallback((next: AppState) => {
    setState((prev) => {
      checkpoint(prev);
      setUndoState(prev);
      return next;
    });
    blocked.current = false;
    setSaveError('');
  }, []);
  const setAi = useCallback((next: AiSettings) => {
    try {
      if (next.preset) saveAiSettings(next);
      else clearAiSettings();
      setAiState(next);
    } catch {
      setSaveError('No pudimos guardar la configuración del asistente.');
    }
  }, []);
  const clearAll = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(RECOVERY_KEY);
      clearAiSettings();
      setAiState(loadAiSettings());
      setUndoState(null);
      blocked.current = false;
      setState(structuredClone(initialState));
      setSaveError('');
    } catch {
      setSaveError('No pudimos borrar los datos de este navegador.');
    }
  }, []);
  const value = useMemo<AppContextValue>(
    () => ({
      state,
      apply,
      saved,
      saveError,
      ai,
      setAi,
      replaceAll,
      clearAll,
      undoAvailable: !!undoState,
      undo: () => {
        if (undoState) {
          setState(undoState);
          setUndoState(null);
        }
      },
      retrySave: () => {
        if (blocked.current) return;
        const error = persistState(state);
        setSaveError(error);
        setSaved(!error);
      },
      patchPersonal: (patch) =>
        apply((s) => ({
          ...s,
          profile: { ...s.profile, personal: { ...s.profile.personal, ...patch } },
        })),
      setProfileList: (key, items) =>
        apply((s) => ({ ...s, profile: { ...s.profile, [key]: items } })),
      patchCv: (patch) => apply((s) => ({ ...s, cv: { ...s.cv, ...patch } })),
      setApplications: (items) => apply((s) => ({ ...s, applications: items })),
      setLetters: (items) => apply((s) => ({ ...s, letters: items })),
      setAnswers: (items) => apply((s) => ({ ...s, answers: items })),
    }),
    [state, apply, saved, saveError, ai, setAi, replaceAll, clearAll, undoState],
  );
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
