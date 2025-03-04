import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase.ts'

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
    <div className="w-full">
      <table className="w-full table-auto divide-y divide-gray-700">
        <thead className="bg-[#232939]">
          <tr>
            <th scope="col" className="px-2 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider w-12 hidden sm:table-cell">ID</th>
            <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Name</th>
            <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider hidden md:table-cell">Short Name</th>
            <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider hidden lg:table-cell">Display Name</th>
            <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider hidden xl:table-cell">Slug</th>
          </tr>
        </thead>
        <tbody className="bg-[#1e2538] divide-y divide-gray-700">
          {agencies.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-3 py-4 text-center text-sm text-gray-400">
                No agencies found
              </td>
            </tr>
          ) : (
            agencies.map((agency) => (
              <tr key={agency.id} className="hover:bg-[#252c40] transition-colors">
                <td className="px-2 py-3 whitespace-nowrap text-sm text-gray-300 hidden sm:table-cell">{agency.id}</td>
                <td className="px-3 py-3 text-sm font-medium text-gray-100 truncate max-w-[200px]">{agency.name}</td>
                <td className="px-3 py-3 text-sm text-gray-300 truncate max-w-[150px] hidden md:table-cell">{agency.short_name}</td>
                <td className="px-3 py-3 text-sm text-gray-300 truncate max-w-[200px] hidden lg:table-cell">{agency.display_name}</td>
                <td className="px-3 py-3 text-sm text-gray-300 truncate max-w-[150px] hidden xl:table-cell">{agency.slug}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default AgenciesTable; 