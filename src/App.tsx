import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppProvider } from './state/AppContext';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { ProfilePage } from './pages/Profile';
import { ImportPage } from './pages/Import';
import { CvBuilder } from './pages/CvBuilder';
import { Letters } from './pages/Letters';
import { Applications } from './pages/Applications';
import { Interview } from './pages/Interview';
import { Settings } from './pages/Settings';

export default function App() {
  return (
    <AppProvider>
      <HashRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Dashboard />} />
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
