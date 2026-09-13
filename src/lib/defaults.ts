import type { AppState, Profile } from '../types';
import { uid } from './utils';

export const emptyProfile: Profile = {
  personal: {
    fullName: '',
    headline: '',
    email: '',
    phone: '',
    city: '',
    country: '',
    linkedin: '',
    github: '',
    website: '',
    summary: '',
    photo: '',
  },
  experience: [],
  education: [],
  skills: [],
  languages: [],
  projects: [],
  certifications: [],
};

export const initialState: AppState = {
  version: 1,
  preferences: {
    country: '',
    role: '',
    city: '',
    travel: '',
    schedule: '',
    experience: '',
    step: 0,
    completed: false,
  },
  profile: emptyProfile,
  applications: [],
  cv: {
    template: 'ats',
    font: 'calibri',
    accent: '#3d7dff',
    fontScale: 1,
    showPhoto: false,
    showSummary: true,
    showProjects: true,
    showCertifications: true,
    showLanguages: true,
    targetJobId: null,
  },
  letters: [],
  answers: [],
  theme: 'light',
};

/** Perfil de ejemplo para ver la app funcionando sin escribir nada. */
export function demoState(): AppState {
  const now = new Date().toISOString();
  return {
    ...initialState,
    profile: {
      personal: {
        fullName: 'Camila Rojas Fuentes',
        headline: 'Desarrolladora Front-End · React y TypeScript',
        email: 'camila.rojas@ejemplo.cl',
        phone: '+56 9 8765 4321',
        city: 'Osorno',
        country: 'Chile',
        linkedin: 'linkedin.com/in/camilarojas',
        github: 'github.com/camilarojas',
        website: 'camilarojas.dev',
        summary:
          'Desarrolladora front-end con 5 años construyendo interfaces con React y TypeScript. Lideré la migración de un portal con 40.000 usuarios mensuales, reduciendo el tiempo de carga en un 45%. Busco un equipo donde la accesibilidad y el diseño de producto pesen tanto como el código.',
        photo: '',
      },
      experience: [
        {
          id: uid('exp'),
          role: 'Desarrolladora Front-End Senior',
          company: 'Nodo Digital',
          location: 'Santiago (remoto)',
          startDate: '2022-03',
          endDate: '',
          current: true,
          bullets: [
            'Lideré la migración del portal de clientes de jQuery a React + TypeScript, reduciendo el tiempo de carga de 4,2 s a 2,3 s (-45%) para 40.000 usuarios mensuales.',
            'Diseñé un sistema de componentes reutilizables que recortó el tiempo de desarrollo de nuevas pantallas de 5 a 2 días.',
            'Mentoricé a 3 desarrolladoras junior con revisiones de código semanales; las 3 pasaron a autonomía completa en 6 meses.',
          ],
          tech: ['React', 'TypeScript', 'Vite', 'Testing Library', 'Figma'],
        },
        {
          id: uid('exp'),
          role: 'Desarrolladora Web',
          company: 'Agencia Latitud',
          location: 'Puerto Montt',
          startDate: '2020-01',
          endDate: '2022-02',
          current: false,
          bullets: [
            'Desarrollé 14 sitios corporativos con puntaje Lighthouse superior a 95 en rendimiento y accesibilidad.',
            'Automaticé el despliegue con GitHub Actions, bajando el tiempo de publicación de 40 a 6 minutos.',
          ],
          tech: ['JavaScript', 'Next.js', 'CSS', 'GitHub Actions'],
        },
      ],
      education: [
        {
          id: uid('edu'),
          degree: 'Ingeniería en Informática',
          institution: 'Universidad de Los Lagos',
          location: 'Osorno',
          startDate: '2015-03',
          endDate: '2019-12',
          current: false,
          detail: 'Título con distinción. Tesis sobre accesibilidad web en servicios públicos.',
        },
      ],
      skills: [
        {
          id: uid('sk'),
          name: 'Lenguajes',
          items: ['TypeScript', 'JavaScript', 'HTML', 'CSS', 'SQL'],
        },
        { id: uid('sk'), name: 'Frameworks', items: ['React', 'Next.js', 'Node.js', 'Vitest'] },
        {
          id: uid('sk'),
          name: 'Herramientas',
          items: ['Git', 'Figma', 'Docker', 'GitHub Actions'],
        },
      ],
      languages: [
        { id: uid('lang'), name: 'Español', level: 'Nativo' },
        { id: uid('lang'), name: 'Inglés', level: 'Avanzado' },
      ],
      projects: [
        {
          id: uid('prj'),
          name: 'Osornodle',
          url: 'github.com/camilarojas/osornodle',
          description:
            'Juego diario de adivinanzas sobre la ciudad de Osorno. 1.200 jugadores en el primer mes, sin backend ni costos de servidor.',
          tech: ['React', 'TypeScript', 'Vite'],
        },
      ],
      certifications: [
        {
          id: uid('cert'),
          name: 'Accesibilidad Web (WCAG 2.2)',
          issuer: 'Deque University',
          date: '2024-06',
          url: '',
        },
      ],
    },
    applications: [
      {
        id: uid('app'),
        company: 'Fintual',
        role: 'Front-End Engineer',
        location: 'Remoto · Chile',
        url: '',
        source: 'LinkedIn',
        salary: '$2.800.000 - $3.400.000',
        status: 'entrevista',
        appliedAt: new Date(Date.now() - 12 * 86_400_000).toISOString().slice(0, 10),
        nextStep: 'Entrevista técnica con el equipo',
        nextStepDate: new Date(Date.now() + 3 * 86_400_000).toISOString().slice(0, 10),
        contact: 'Paula Méndez · paula@ejemplo.cl',
        notes: 'Preguntaron por experiencia con testing. Repasar Testing Library.',
        jobDescription:
          'Buscamos un Front-End Engineer con experiencia sólida en React y TypeScript. Trabajarás con Next.js, GraphQL y un design system propio. Valoramos testing automatizado, accesibilidad y experiencia liderando proyectos de migración. Inglés intermedio deseable.',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: uid('app'),
        company: 'Buk',
        role: 'Desarrollador React',
        location: 'Santiago híbrido',
        url: '',
        source: 'Getonboard',
        salary: '',
        status: 'postulada',
        appliedAt: new Date(Date.now() - 4 * 86_400_000).toISOString().slice(0, 10),
        nextStep: 'Hacer seguimiento por correo',
        nextStepDate: new Date(Date.now() + 1 * 86_400_000).toISOString().slice(0, 10),
        contact: '',
        notes: '',
        jobDescription: '',
        createdAt: now,
        updatedAt: now,
      },
    ],
  };
}
