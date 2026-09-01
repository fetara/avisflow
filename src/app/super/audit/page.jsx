'use client';

import { useEffect, useState } from 'react';

export default function AuditPage() {
  const [logs, setLogs] = useState(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetch(`/api/super/audit?page=${page}`).then((r) => r.json()).then((d) => {
      setLogs(d.logs || []);
      setTotal(d.total || 0);
    }).catch(() => setLogs([]));
  }, [page]);

  const pages = Math.max(1, Math.ceil(total / 50));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Journal d'audit</h1>
        <p className="mt-1 text-sm text-gray-400">Toutes les actions des administrateurs, entreprises comprises. {total} entrées.</p>
      </div>

      {!logs ? <p className="text-gray-500">Chargement…</p> : (
        <div className="overflow-x-auto rounded-2xl border border-gray-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-950 text-xs uppercase text-gray-500">
              <tr>
                <th className="p-3">Date</th><th className="p-3">Admin</th><th className="p-3">Action</th>
                <th className="p-3">Entité</th><th className="p-3">ID</th>
              </tr>
            </thead>
            <tbody className="bg-gray-900/50">
              {logs.map((l) => (
                <tr key={l.id} className="border-t border-gray-800">
                  <td className="whitespace-nowrap p-3 text-gray-400">{new Date(l.createdAt).toLocaleString('fr-FR')}</td>
                  <td className="p-3">{l.admin?.email || '—'} <span className="text-xs text-gray-600">({l.admin?.role || '?'})</span></td>
                  <td className="p-3 font-mono text-amber-400">{l.action}</td>
                  <td className="p-3 text-gray-300">{l.entity}</td>
                  <td className="p-3 font-mono text-xs text-gray-500">{l.entityId || '—'}</td>
                </tr>
              ))}
              {logs.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-gray-500">Aucune action enregistrée.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && (
        <div className="flex items-center justify-center gap-3 text-sm">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)}
            className="rounded-lg border border-gray-700 px-3 py-1.5 disabled:opacity-30">← Précédent</button>
          <span className="text-gray-400">Page {page} / {pages}</span>
          <button disabled={page >= pages} onClick={() => setPage(page + 1)}
            className="rounded-lg border border-gray-700 px-3 py-1.5 disabled:opacity-30">Suivant →</button>
        </div>
      )}
    </div>
  );
}
