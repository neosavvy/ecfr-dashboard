import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AppRoutes } from './routes.tsx';
import './index.css';

// Add global styles to ensure dark background throughout the app
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <div className="bg-[#171c2e] min-h-screen">
        <AppRoutes />
      </div>
    </BrowserRouter>
  </React.StrictMode>
);
