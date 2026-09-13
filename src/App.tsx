import { lazy } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppProvider } from './state/AppContext';
import { Layout } from './components/Layout';
const Dashboard = lazy(() => import('./pages/Dashboard').then((m) => ({ default: m.Dashboard })));
const ProfilePage = lazy(() => import('./pages/Profile').then((m) => ({ default: m.ProfilePage })));
const ImportPage = lazy(() => import('./pages/Import').then((m) => ({ default: m.ImportPage })));
const CvBuilder = lazy(() => import('./pages/CvBuilder').then((m) => ({ default: m.CvBuilder })));
const Letters = lazy(() => import('./pages/Letters').then((m) => ({ default: m.Letters })));
const Applications = lazy(() =>
  import('./pages/Applications').then((m) => ({ default: m.Applications })),
);
const Interview = lazy(() => import('./pages/Interview').then((m) => ({ default: m.Interview })));
const Settings = lazy(() => import('./pages/Settings').then((m) => ({ default: m.Settings })));
const Onboarding = lazy(() =>
  import('./pages/Onboarding').then((m) => ({ default: m.Onboarding })),
);
const SearchJobs = lazy(() =>
  import('./pages/SearchJobs').then((m) => ({ default: m.SearchJobs })),
);
const AdvancedSettings = lazy(() =>
  import('./pages/AdvancedSettings').then((m) => ({ default: m.AdvancedSettings })),
);

export default function App() {
  return (
    <AppProvider>
      <HashRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="empezar" element={<Onboarding />} />
            <Route path="buscar" element={<SearchJobs />} />
            <Route path="asistente" element={<AdvancedSettings />} />
            <Route path="perfil" element={<ProfilePage />} />
            <Route path="importar" element={<ImportPage />} />
            <Route path="cv" element={<CvBuilder />} />
            <Route path="cartas" element={<Letters />} />
            <Route path="postulaciones" element={<Applications />} />
            <Route path="entrevistas" element={<Interview />} />
            <Route path="ajustes" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </HashRouter>
    </AppProvider>
  );
}
