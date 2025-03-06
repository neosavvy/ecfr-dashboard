import { Routes, Route } from 'react-router-dom';
import App from './App';
import AgenciesPage from './pages/AgenciesPage';
import AgencyDetailPage from './pages/AgencyDetailPage';

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<AgenciesPage />} />
      <Route path="/agencies" element={<AgenciesPage />} />
      <Route path="/agencies/:agencyId" element={<AgencyDetailPage />} />
      <Route path="/:metric" element={<App />} />
    </Routes>
  );
} 