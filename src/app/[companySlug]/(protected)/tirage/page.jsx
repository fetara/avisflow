'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Plus, Dices, Download, Trash2, Users, Save } from 'lucide-react';
import { useToast } from '@/components/Toast';

/* Administration du tirage au sort : configuration, participants (import CSV),
 * lancement (crypto serveur), gagnants + export. */
export default function TiragePage() {
  const { companySlug } = useParams();
  const [draw, setDraw] = useState(null);
  const [gameMode, setGameMode] = useState('wheel');
  const [form, setForm] = useState({ name: 'Tirage au sort', startsAt: '', endsAt: '', winnersCount: 3, prizes: [{ rank: 1, label: 'Gros lot' }, { rank: 2, label: 'Lot n°2' }, { rank: 3, label: 'Lot n°3' }], excludePastWinners: true, open: true });
  const [csv, setCsv] = useState('');
  const [rolling, setRolling] = useState(false);
  const { show, Toast } = useToast();

  const load = useCallback(async () => {
    const d = await fetch(`/api/${companySlug}/raffle`).then((r) => r.json());
    setDraw(d.draw || null);
    setGameMode(d.gameMode || 'wheel');
    if (d.draw) {
      setForm((f) => ({
        ...f,
        name: d.draw.name,
        startsAt: d.draw.startsAt ? d.draw.startsAt.slice(0, 10) : '',
        endsAt: d.draw.endsAt ? d.draw.endsAt.slice(0, 10) : '',
        winnersCount: d.draw.winnersCount,
        prizes: Array.isArray(d.draw.prizes) && d.draw.prizes.length ? d.draw.prizes : f.prizes,
        excludePastWinners: d.draw.excludePastWinners,
        open: d.draw.status === 'OPEN',
      }));
    }
  }, [companySlug]);
  useEffect(() => { load(); }, [load]);

  async function saveConfig(e) {
    e.preventDefault();
    const res = await fetch(`/api/${companySlug}/raffle`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        prizes: form.prizes.filter((p) => p.label.trim()),
        startsAt: form.startsAt || null, endsAt: form.endsAt || null,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { show(data.error || 'Erreur', 'error'); return; }
    show('Configuration du tirage enregistrée — le mode Tirage est actif sur la page de jeu.');
    load();
  }

  async function importCsv() {
    if (!draw) { show('Enregistrez d’abord la configuration.', 'error'); return; }
    const res = await fetch(`/api/${companySlug}/raffle/import`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ drawId: draw.id, csv }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { show(data.error || 'Erreur', 'error'); return; }
    setCsv('');
    show(`${data.added} participant(s) importé(s) — ${data.total} au total.`);
    load();
  }

  async function launch() {
    if (!draw) { show('Enregistrez d’abord la configuration.', 'error'); return; }
    if (!window.confirm(`Lancer le tirage parmi ${draw.entries.length} participant(s) ?\n\nLe tirage est effectué côté serveur (aléatoire sécurisé), horodaté et journalisé.`)) return;
    setRolling(true);
    const res = await fetch(`/api/${companySlug}/raffle/draw`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ drawId: draw.id }),
    });
    const data = await res.json().catch(() => ({}));
    setRolling(false);
    if (!res.ok) { show(data.error || 'Erreur', 'error'); return; }
    show(`Tirage effectué (run ${data.run}) — ${data.winners.length} gagnant(s).`);
    load();
    window.open(`/${companySlug}/draw`, '_blank');
  }

  const prizeAt = (rank) => form.prizes.find((p) => p.rank === rank)?.label || `Lot n°${rank}`;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">🎲 Tirage au sort</h1>
        <div className="flex gap-2">
          {draw && draw.status === 'DONE' && (
            <a href={`/api/${companySlug}/raffle/export?drawId=${draw.id}`}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800">
              <Download className="h-4 w-4" /> Exporter les gagnants (CSV)
            </a>
          )}
          <button onClick={launch} disabled={rolling || !draw || draw.entries.length === 0}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-bold text-white shadow-md hover:bg-brand-700 disabled:opacity-50">
            <Dices className="h-4 w-4" /> {rolling ? 'Tirage en cours…' : 'Lancer le tirage'}
          </button>
        </div>
      </div>

      {/* Configuration */}
      <form onSubmit={saveConfig} className="card space-y-4">
        <h2 className="font-bold">Configuration</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="label" htmlFor="rname">Nom du tirage</label>
            <input id="rname" className="input" required maxLength={80} value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="label" htmlFor="rstart">Début des inscriptions</label>
            <input id="rstart" type="date" className="input" value={form.startsAt}
              onChange={(e) => setForm({ ...form, startsAt: e.target.value })} />
          </div>
          <div>
            <label className="label" htmlFor="rend">Fin des inscriptions</label>
            <input id="rend" type="date" className="input" value={form.endsAt}
              onChange={(e) => setForm({ ...form, endsAt: e.target.value })} />
          </div>
        </div>
        <div>
          <label className="label">Lots par rang</label>
          <div className="space-y-2">
            {form.prizes.map((p, i) => (
              <div key={p.rank} className="flex items-center gap-2">
                <span className="w-16 text-sm font-semibold text-gray-500">Rang {p.rank}</span>
                <input className="input !py-2" maxLength={120} value={p.label}
                  onChange={(e) => setForm({ ...form, prizes: form.prizes.map((x) => (x.rank === p.rank ? { ...x, label: e.target.value } : x)) })} />
                {form.prizes.length > 1 && (
                  <button type="button" onClick={() => setForm({ ...form, prizes: form.prizes.filter((x) => x.rank !== p.rank) })}
                    className="text-red-500 hover:underline text-xs">Retirer</button>
                )}
              </div>
            ))}
            <button type="button"
              onClick={() => setForm({ ...form, prizes: [...form.prizes, { rank: form.prizes.length + 1, label: `Lot n°${form.prizes.length + 1}` }] })}
              className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs hover:bg-gray-50 dark:hover:bg-gray-800">
              <Plus className="h-3.5 w-3.5" /> Ajouter un rang
            </button>
          </div>
        </div>
        <label className="flex items-center gap-3 text-sm">
          <input type="checkbox" className="h-4 w-4 accent-brand-600" checked={form.excludePastWinners}
            onChange={(e) => setForm({ ...form, excludePastWinners: e.target.checked })} />
          Exclure les gagnants des tirages précédents
        </label>
        <label className="flex items-center gap-3 text-sm">
          <input type="checkbox" className="h-4 w-4 accent-brand-600" checked={form.open}
            onChange={(e) => setForm({ ...form, open: e.target.checked })} />
          Inscriptions ouvertes (active le mode Tirage sur la page de jeu)
        </label>
        <button className="btn-primary !py-2"><Save className="h-4 w-4" /> Enregistrer</button>
      </form>

      {/* Participants */}
      <section className="card space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-bold inline-flex items-center gap-2"><Users className="h-4 w-4" /> Participants {draw && `(${draw.entries.length})`}</h2>
          {draw && draw.status === 'DONE' && (
            <Link href={`/${companySlug}/draw`} target="_blank" className="text-sm font-semibold text-brand-600 hover:underline">
              📺 Ouvrir l’écran de projection →
            </Link>
          )}
        </div>
        <p className="text-xs text-gray-400">
          Les participants des jeux de l’entreprise, les inscriptions sur la page de tirage et vos imports CSV sont cumulés (1 fois chacun).
        </p>
        <textarea className="input min-h-24 font-mono text-xs" placeholder={'Nom ; email\nJean Dupont ; jean@mail.fr\nMarie Martin'}
          value={csv} onChange={(e) => setCsv(e.target.value)} aria-label="Import CSV des participants" />
        <button type="button" onClick={importCsv} className="rounded-lg border px-3 py-2 text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-800">
          Importer ces participants
        </button>
        {draw && draw.entries.length > 0 && (
          <ul className="flex flex-wrap gap-1.5">
            {draw.entries.slice(0, 40).map((e) => (
              <li key={e.id} className="rounded-full bg-gray-100 px-2.5 py-1 text-xs dark:bg-gray-800">
                {e.name} <span className="text-gray-400">· {e.source === 'onsite' ? 'site' : e.source === 'imported' ? 'import' : 'jeu'}</span>
              </li>
            ))}
            {draw.entries.length > 40 && <li className="text-xs text-gray-400 self-center">+{draw.entries.length - 40} autres…</li>}
          </ul>
        )}
      </section>

      {/* Gagnants */}
      {draw && draw.winners.length > 0 && (
        <section className="card space-y-3">
          <h2 className="font-bold">🏆 Gagnants (dernier tirage : run {draw.winners[0].run})</h2>
          <ul className="space-y-2">
            {draw.winners.filter((w) => w.run === draw.winners[0].run).slice(0, 20).map((w) => (
              <li key={w.id} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm dark:bg-gray-800">
                <span><span className="font-bold text-brand-600">#{w.rank}</span> {w.name}</span>
                <span className="text-gray-500">{w.prize} · {new Date(w.drawnAt).toLocaleString('fr-FR')}</span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-gray-400">
            Équité : tirage serveur à aléa cryptographique, graine horodatée journalisée (relancer crée un nouveau run, l’historique est conservé).
          </p>
        </section>
      )}
      <Toast />
    </div>
  );
}
