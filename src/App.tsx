import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AgenciesPage from './pages/AgenciesPage';
import AgencyDetailPage from './pages/AgencyDetailPage';
import Navbar from './components/Navbar';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-[#171c2e] text-gray-200">
        <Navbar />
        <main>
          <Routes>
            {/* Redirect root to agencies */}
            <Route path="/" element={<Navigate to="/agencies" replace />} />
            
            {/* Agencies routes */}
            <Route path="/agencies" element={<AgenciesPage />} />
            <Route path="/agencies/:agencyId" element={<AgencyDetailPage />} />
            
            {/* Fallback route */}
            <Route path="*" element={<Navigate to="/agencies" replace />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
