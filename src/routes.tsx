import { Routes, Route } from 'react-router-dom';
import App from './App';
import AgenciesPage from './pages/AgenciesPage';

export function AppRoutes() {
  return (
    <Routes>      
      <Route path="/agencies" element={<AgenciesPage />} />
      <Route path="/:metric" element={<App />} />
      <Route path="/" element={<App />} />
    </Routes>
  );
} 