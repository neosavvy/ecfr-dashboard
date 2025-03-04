import React from 'react';
import { AgenciesTable } from '../components/AgenciesTable';

const AgenciesPage: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-6 bg-[#171c2e] min-h-screen">
      <div className="bg-[#1e2538] rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-semibold text-white mb-6">Federal Agencies</h1>
        <AgenciesTable />
      </div>
    </div>
  );
};

export default AgenciesPage; 