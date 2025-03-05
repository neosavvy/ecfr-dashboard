import React from 'react';
import { AgenciesGrid } from '../components/AgenciesTable';

const AgenciesPage: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-6 bg-[#171c2e] min-h-screen">
      <div className="bg-[#1e2538] rounded-lg shadow-md p-6 mb-6">
        <h1 className="text-2xl font-semibold text-white mb-2">Electronic Code of Federal Regulations Dashboard</h1>
        <p className="text-gray-300 mb-4">
          Explore federal agencies and their regulatory documents. View metrics on document complexity, 
          readability, and structure. Select different metrics using the dropdown below.
        </p>
      </div>
      
      <div className="bg-[#1e2538] rounded-lg shadow-md p-6">
        <AgenciesGrid />
      </div>
    </div>
  );
};

export default AgenciesPage; 