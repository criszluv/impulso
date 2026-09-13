export type Id = string;

export type LanguageLevel = 'Básico' | 'Intermedio' | 'Avanzado' | 'Nativo';

export interface PersonalInfo {
  fullName: string;
  headline: string;
  email: string;
  phone: string;
  city: string;
  country: string;
  linkedin: string;
  github: string;
  website: string;
  summary: string;
  photo: string;
}

export interface Experience {
  id: Id;
  role: string;
  company: string;
  location: string;
  startDate: string;
  endDate: string;
  current: boolean;
  bullets: string[];
  tech: string[];
}

export interface Education {
  id: Id;
  degree: string;
  institution: string;
  location: string;
  startDate: string;
  endDate: string;
  current: boolean;
  detail: string;
}

export interface SkillGroup {
  id: Id;
  name: string;
  items: string[];
}

export interface LanguageItem {
  id: Id;
  name: string;
  level: LanguageLevel;
}

export interface Project {
  id: Id;
  name: string;
  url: string;
  description: string;
  tech: string[];
}

export interface Certification {
  id: Id;
  name: string;
  issuer: string;
  date: string;
  url: string;
}

export interface Profile {
  personal: PersonalInfo;
  experience: Experience[];
  education: Education[];
  skills: SkillGroup[];
  languages: LanguageItem[];
  projects: Project[];
  certifications: Certification[];
}

export type ApplicationStatus = 'guardada' | 'postulada' | 'entrevista' | 'oferta' | 'rechazada';

export interface Application {
  id: Id;
  company: string;
  role: string;
  location: string;
  url: string;
  source: string;
  salary: string;
  status: ApplicationStatus;
  appliedAt: string;
  nextStep: string;
  nextStepDate: string;
  contact: string;
  notes: string;
  jobDescription: string;
  createdAt: string;
  updatedAt: string;
}

export type TemplateId = 'ats' | 'clasico' | 'compacto' | 'moderno';

/** Tipografías que los lectores automáticos de CV parsean sin problemas. */
export type CvFont = 'calibri' | 'arial' | 'georgia' | 'times';

export interface CvConfig {
  template: TemplateId;
  font: CvFont;
  accent: string;
  fontScale: number;
  showPhoto: boolean;
  showSummary: boolean;
  showProjects: boolean;
  showCertifications: boolean;
  showLanguages: boolean;
  targetJobId: Id | null;
}

export interface CoverLetter {
  id: Id;
  title: string;
  company: string;
  role: string;
  recipient: string;
  body: string;
  /** Texto del aviso al que se postula. La carta puede tenerlo aunque no haya postulación. */
  jobDescription: string;
  applicationId: Id | null;
  createdAt: string;
  updatedAt: string;
}

export interface StarAnswer {
  id: Id;
  question: string;
  situation: string;
  task: string;
  action: string;
  result: string;
}

export interface SearchPreferences {
  role: string;
  city: string;
  travel: string;
  schedule: string;
  experience: 'si' | 'no' | '';
  step: number;
  completed: boolean;
}

export interface AppState {
  preferences: SearchPreferences;
  version: number;
  profile: Profile;
  applications: Application[];
  cv: CvConfig;
  letters: CoverLetter[];
  answers: StarAnswer[];
  theme: 'dark' | 'light';
}
