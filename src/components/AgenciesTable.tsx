import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface Agency {
  id: number;
  name: string;
  short_name: string;
  display_name: string;
  sortable_name: string;
  slug: string;
}

export function AgenciesTable() {
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAgencies() {
      try {
        setLoading(true);
        
        const { data, error } = await supabase
          .from('agencies')
          .select('id, name, short_name, display_name, sortable_name, slug')
          .order('sortable_name', { ascending: true });
        
        if (error) {
          throw error;
        }
        
        setAgencies(data || []);
      } catch (error: any) {
        console.error('Error fetching agencies:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    }

    fetchAgencies();
  }, []);

  if (loading) {
    return <div className="flex justify-center items-center p-8">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
    </div>;
  }

  if (error) {
    return <div className="p-4 text-center text-red-400 bg-[#2a1c24] rounded-md">Error: {error}</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-700">
        <thead className="bg-[#232939]">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">ID</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Name</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Short Name</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Display Name</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Slug</th>
          </tr>
        </thead>
        <tbody className="bg-[#1e2538] divide-y divide-gray-700">
          {agencies.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-400">
                No agencies found
              </td>
            </tr>
          ) : (
            agencies.map((agency) => (
              <tr key={agency.id} className="hover:bg-[#252c40] transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{agency.id}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-100">{agency.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{agency.short_name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{agency.display_name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{agency.slug}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default AgenciesTable; 