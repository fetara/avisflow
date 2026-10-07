'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Save, Eye } from 'lucide-react';
import WheelPreview from '@/components/WheelPreview';
import { useToast } from '@/components/Toast';

/* 🎡 Roulette de la chance : apparence de la roue (couleurs, fond, aperçu en direct),
 * message de victoire et période d'activation. */
export default function RoulettePage() {
  const { companySlug } = useParams();
  const [settings, setSettings] = useState(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const { show, Toast } = useToast();

  const load = useCallback(async () => {
    const s = await fetch(`/api/${companySlug}/settings`).then((r) => r.json());
    setSettings(s.settings || {});
  }, [companySlug]);
  useEffect(() => { load(); }, [load]);

  let wheelColors = [];
  try { wheelColors = JSON.parse(settings?.WHEEL_COLORS || '[]'); } catch { wheelColors = []; }
  const wheelBg = settings?.WHEEL_BG_IMAGE || '';
  // lecture avec défaut
  const val = (k, def = '') => (settings && settings[k] !== undefined && settings[k] !== '' ? settings[k] : def);

  function setWheelColors(list) {
    setSettings({ ...settings, WHEEL_COLORS: JSON.stringify(list) });
  }
  function onBgPick(file) {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { setError('Image de fond trop lourde (max 2 Mo).'); return; }
    const reader = new FileReader();
    reader.onload = () => setSettings({ ...settings, WHEEL_BG_IMAGE: reader.result });
    reader.readAsDataURL(file);
  }

  async function save(e) {
    e.preventDefault();
    setError('');
    const payload = {};
    for (const k of ['WHEEL_COLORS', 'WHEEL_BG_IMAGE', 'WIN_MESSAGE', 'CAMPAIGN_START', 'CAMPAIGN_END']) {
      if (settings && settings[k] !== undefined) payload[k] = String(settings[k]);
    }
    const res = await fetch(`/api/${companySlug}/settings`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    });
    if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error || 'Erreur'); return; }
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  if (!settings) return <p className="text-gray-400">Chargement…</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">🎡 Roulette de la chance</h1>
          <p className="mt-1 text-sm text-gray-500">Apparence, message de victoire et période d’activation.</p>
        </div>
        <Link href={`/${companySlug}/play`} target="_blank"
          className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-gray-700 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200">
          <Eye className="h-4 w-4" /> Voir ce que voit mon client
        </Link>
      </div>

      <form onSubmit={save} className="card space-y-5">
        <h2 className="font-bold">Apparence de la roue</h2>
        <div className="grid gap-6 lg:grid-cols-[1fr_auto]">
          <div className="space-y-4">
            <div>
              <label className="label">Couleurs des segments (alternent sur la roue)</label>
              <div className="flex flex-wrap items-center gap-2">
                {(wheelColors.length ? wheelColors : ['']).map((c, i) => (
                  <div key={i} className="flex items-center gap-1">
                    <input type="color" aria-label={`Couleur ${i + 1}`}
                      value={/^#[0-9a-fA-F]{6}$/.test(c) ? c : '#f472b6'}
                      onChange={(e) => setWheelColors(wheelColors.map((x, j) => (j === i ? e.target.value : x)))} />
                    {wheelColors.length > 0 && (
                      <button type="button" aria-label="Retirer cette couleur"
                        onClick={() => setWheelColors(wheelColors.filter((_, j) => j !== i))}
                        className="text-xs text-red-500 hover:underline">✕</button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={() => setWheelColors([...wheelColors, '#f472b6'])}
                  className="rounded-lg border border-gray-200 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">+ Couleur</button>
              </div>
            </div>

            <div>
              <label className="label">Image de fond de la roue</label>
              <div className="flex items-center gap-3">
                {wheelBg
                  ? // eslint-disable-next-line @next/next/no-img-element
                    <img src={wheelBg} alt="Aperçu du fond" className="h-16 w-16 rounded-xl object-cover" />
                  : <span className="flex h-16 w-16 items-center justify-center rounded-xl bg-gray-100 text-2xl">🖼️</span>}
                <label className="cursor-pointer rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">
                  {wheelBg ? 'Changer l’image' : 'Choisir une image'}
                  <input type="file" accept="image/*" className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0]; if (!f) return;
                      if (f.size > 2 * 1024 * 1024) { setError('Image trop lourde (max 2 Mo).'); return; }
                      const reader = new FileReader();
                      reader.onload = () => setSettings({ ...settings, WHEEL_BG_IMAGE: reader.result });
                      reader.readAsDataURL(f);
                    }} />
                </label>
                {wheelBg && (
                  <button type="button" onClick={() => setSettings({ ...settings, WHEEL_BG_IMAGE: '' })}
                    className="text-sm text-red-500 hover:underline">Retirer</button>
                )}
              </div>
            </div>

            <div>
              <label className="label" htmlFor="winmsg">Message de victoire (écran « gagné »)</label>
              <input id="winmsg" className="input" maxLength={100} placeholder="Félicitations !"
                value={val('WIN_MESSAGE')}
                onChange={(e) => setSettings({ ...settings, WIN_MESSAGE: e.target.value })} />
            </div>

            <div>
              <label className="label">Période d’activation de la roulette</label>
              <div className="grid grid-cols-2 gap-3">
                <input type="date" className="input" aria-label="Début" value={val('CAMPAIGN_START')}
                  onChange={(e) => setSettings({ ...settings, CAMPAIGN_START: e.target.value })} />
                <input type="date" className="input" aria-label="Fin" value={val('CAMPAIGN_END')}
                  onChange={(e) => setSettings({ ...settings, CAMPAIGN_END: e.target.value })} />
              </div>
              <p className="mt-1 text-xs text-gray-400">Hors période, la page de jeu affiche « Revenez du [date] ».</p>
            </div>

            <div className="flex items-center gap-3">
              <button className="btn-primary !py-2"><Save className="h-4 w-4" /> Enregistrer</button>
              {saved && <span className="text-sm text-emerald-600">✓ Enregistré</span>}
              {error && <span className="text-sm text-red-600">{error}</span>}
            </div>
          </div>

          {/* Aperçu en direct */}
          <div className="justify-self-center rounded-2xl bg-gray-50 p-4 dark:bg-gray-800">
            <WheelPreview
              prizes={[{ label: 'Lot 1' }, { label: 'Lot 2' }, { label: 'Lot 3' }, { label: 'Lot 4' }]}
              colors={wheelColors.length ? wheelColors : null}
              bgImage={wheelBg || null}
            />
          </div>
        </div>
      </form>
      <Toast />
    </div>
  );
}
