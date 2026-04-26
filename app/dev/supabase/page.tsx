'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';

interface ConnectionTestRow {
  id: number;
  label: string;
  created_at: string;
}

type Status = 'loading' | 'success' | 'error';

export default function SupabaseTestPage() {
  const [status, setStatus] = useState<Status>('loading');
  const [rows, setRows] = useState<ConnectionTestRow[]>([]);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    supabase
      .from('connection_test')
      .select('id, label, created_at')
      .then(({ data, error }) => {
        if (error) {
          setErrorMessage(error.message);
          setStatus('error');
        } else {
          setRows((data as ConnectionTestRow[]) ?? []);
          setStatus('success');
        }
      });
  }, []);

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="mx-auto max-w-[430px] px-4 pt-6 pb-24">
        <h1 className="text-2xl font-semibold text-neutral-900">Supabase connection test</h1>
        <p className="mt-1 text-sm text-neutral-500">Dev only — reads from public.connection_test</p>

        <div className="mt-6 rounded-xl bg-white p-5 shadow-sm">
          {status === 'loading' && (
            <p className="text-sm text-neutral-500">Loading…</p>
          )}

          {status === 'error' && (
            <div>
              <p className="text-sm font-semibold text-red-600">Error</p>
              <p className="mt-1 text-sm text-red-500">{errorMessage}</p>
            </div>
          )}

          {status === 'success' && (
            <div>
              <p className="text-sm font-semibold text-green-700">
                Connected — {rows.length} {rows.length === 1 ? 'row' : 'rows'} returned
              </p>
              {rows.length > 0 ? (
                <table className="mt-4 w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-neutral-200">
                      <th className="pb-2 pr-4 font-medium text-neutral-600">id</th>
                      <th className="pb-2 pr-4 font-medium text-neutral-600">label</th>
                      <th className="pb-2 font-medium text-neutral-600">created_at</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.id} className="border-b border-neutral-100">
                        <td className="py-2 pr-4 text-neutral-700">{row.id}</td>
                        <td className="py-2 pr-4 text-neutral-700">{row.label}</td>
                        <td className="py-2 text-neutral-500">{row.created_at}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="mt-3 text-sm text-neutral-400 italic">Table is empty.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
