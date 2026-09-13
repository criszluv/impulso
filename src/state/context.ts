import { createContext, useContext } from 'react';
import type { AiSettings } from '../lib/ai/settings';
import type {
  AppState,
  Application,
  CoverLetter,
  CvConfig,
  PersonalInfo,
  Profile,
  StarAnswer,
} from '../types';

export type ProfileListKey =
  | 'experience'
  | 'education'
  | 'skills'
  | 'languages'
  | 'projects'
  | 'certifications';

export interface AppContextValue {
  state: AppState;
  apply: (updater: (state: AppState) => AppState) => void;
  patchPersonal: (patch: Partial<PersonalInfo>) => void;
  setProfileList: <K extends ProfileListKey>(key: K, items: Profile[K]) => void;
  patchCv: (patch: Partial<CvConfig>) => void;
  setApplications: (items: Application[]) => void;
  setLetters: (items: CoverLetter[]) => void;
  setAnswers: (items: StarAnswer[]) => void;
  replaceAll: (next: AppState) => void;
  saved: boolean;
  /** Config del asistente con IA. Vive aparte del estado para que la clave no viaje en las copias de seguridad. */
  ai: AiSettings;
  setAi: (next: AiSettings) => void;
}

export const AppContext = createContext<AppContextValue | null>(null);

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp debe usarse dentro de <AppProvider>');
  return ctx;
}
