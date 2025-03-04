import React from 'react';
import { AgencyMetrics } from '../types';
import { Search } from 'lucide-react';

interface AgencyFilterProps {
  agencies: AgencyMetrics[];
  selectedAgency: string | null;
  onAgencySelect: (agencyId: string | null) => void;
}

export function AgencyFilter({ agencies, selectedAgency, onAgencySelect }: AgencyFilterProps) {
  return (
    <div className="flex-1 sm:flex-none min-w-[200px]">
      <label htmlFor="agency-select" className="block text-sm font-medium text-gray-300 mb-2">
        Select Agency
      </label>
      <div className="relative">
        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <select
          id="agency-select"
          className="block w-full pl-10 pr-8 py-2 bg-gray-800 border border-gray-700 rounded-lg
                     text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none
                     cursor-pointer hover:bg-gray-700 transition-colors"
          value={selectedAgency || ''}
          onChange={(e) => onAgencySelect(e.target.value || null)}
        >
          <option value="">All Agencies</option>
          {agencies.map((agency) => (
            <option key={agency.id} value={agency.id}>
              {agency.name}
            </option>
          ))}
        </select>
        <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
          <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
    </div>
  );
}