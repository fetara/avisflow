'use client';

import Link from 'next/link';

import { useParams } from 'next/navigation';

import { useEffect, useState } from 'react';
import WheelPreview from '@/components/WheelPreview';

export default function ReglagesPage() {
  const { companySlug } = useParams();
  const [settings, setSettings] = useState(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [previewPrizes, setPreviewPrizes] = useState(null); // null = pas encore chargé
  const [companyInfo, setCompanyInfo] = useState(null); // fiche entreprise (nom, adresse…)
  const [tfa, setTfa] = useState(null);
  const [tfaForm, setTfaForm] = useState({ password: '', totp: '' });
  const [tfaMsg, setTfaMsg] = useState('');
  const [savingCompany, setSavingCompany] = useState(false);

  useEffect(() => {
    fetch(`/api/${companySlug}/settings`).then((r) => r.json()).then((d) => setSettings(d.settings || {})).catch(() => setError('Chargement impossible'));
    fetch(`/api/${companySlug}/twofa`).then((r) => r.json()).then(setTfa).catch(() => {});
    fetch(`/api/${companySlug}/company`).then((r) => r.json()).then((d) => setCompanyInfo(d.company || null)).catch(() => {});
    // Lots réels pour l'aperçu de la roue (repli sur des libellés de démo si non autorisé)
    fetch(`/api/${companySlug}/prizes`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setPreviewPrizes((d.prizes || []).map((p) => ({ label: p.label, photo: p.photo }))))
      .catch(() => setPreviewPrizes([{ label: 'Bon d’achat' }, { label: 'Rejouez' }, { label: 'Café offert' }, { label: 'Réduction' }]));
  }, [companySlug]);

  // Fiche entreprise : nom, adresse, téléphone, site web
  async function saveCompany(e) {
    e.preventDefault();
    setSavingCompany(true);
    const res = await fetch(`/api/${companySlug}/company`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: companyInfo.name,
        address: companyInfo.address || '',
        phone: companyInfo.phone || '',
        website: companyInfo.website || '',
      }),
    });
    const data = await res.json().catch(() => ({}));
    setSavingCompany(false);
    if (!res.ok) { show(data.error || 'Erreur', 'error'); return; }
    show('Fiche entreprise enregistrée');
  }

  async function toggle2fa(action) {
    setTfaMsg('');
    const res = await fetch(`/api/${companySlug}/twofa`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, password: tfaForm.password, totp: tfaForm.totp || undefined }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { setTfaMsg(data.error || 'Erreur'); return; }
    setTfaForm({ password: '', totp: '' });
    setTfa((prev) => ({ ...prev, userEnabled: data.twoFactorEnabled, active: action === 'enable' && prev.secretSet && prev.companyEnabled }));
    setTfaMsg(action === 'disable' ? '2FA désactivée.' : '2FA réactivée.');
  }

  async function save(e) {
    e.preventDefault();
    setError(''); setSaved(false);
    const res = await fetch(`/api/${companySlug}/settings`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    if (!res.ok) setError('Erreur lors de la sauvegarde');
    else { setSaved(true); setTimeout(() => setSaved(false), 3000); }
  }

  if (!settings) return <p className="text-gray-400">Chargement…</p>;

  // ---------- Apparence de la roue ----------
  let wheelColors = [];
  try { wheelColors = JSON.parse(settings.WHEEL_COLORS || '[]'); } catch { wheelColors = []; }
  const wheelBg = settings.WHEEL_BG_IMAGE || '';

  // lecture avec valeur par défaut (clés booléennes : activées si absentes)
  const val = (key, def = '') => (settings[key] !== undefined && settings[key] !== '' ? settings[key] : def);
  const flag = (key) => val(key, 'true') === 'true';
  function setFlag(key, checked) {
    setSettings({ ...settings, [key]: checked ? 'true' : 'false' });
  }
  function setWheelColors(list) {
    setSettings({ ...settings, WHEEL_COLORS: JSON.stringify(list) });
  }
  function onLogoPick(file) {
    if (!file) return;
    if (file.size > 1.5 * 1024 * 1024) { setError('Logo trop lourd (max 1,5 Mo).'); return; }
    const reader = new FileReader();
    reader.onload = () => setSettings({ ...settings, BRAND_LOGO: reader.result });
    reader.readAsDataURL(file);
  }
  function onBgPick(file) {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { setError('Image de fond trop lourde (max 2 Mo).'); return; }
    const reader = new FileReader();
    reader.onload = () => setSettings({ ...settings, WHEEL_BG_IMAGE: reader.result });
    reader.readAsDataURL(file);
  }

  const FIELDS = [
    ['GAME_HEADLINE', "Accroche de la page d'accueil"],
    ['GAME_SUB', 'Sous-titre de la page d\'accueil'],
    ['AUTO_APPROVE_MIN_RATING', 'Auto-publier les avis ≥ ce nombre d\'étoiles (0 = désactivé)'],
    ['GOOGLE_REVIEW_URL', 'Lien « Laisser un avis sur Google »'],
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Réglages</h1>
        <a href={`/${companySlug}/play`} target="_blank" rel="noopener noreferrer"
          className="rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-gray-700 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200">
          👁️ Voir ce que voit mon client
        </a>
      </div>
      {/* 🏢 Entreprise : fiche publique (nom, adresse, téléphone, site) */}
      {companyInfo && (
        <form onSubmit={saveCompany} className="card space-y-4">
          <h2 className="font-bold">🏢 Entreprise</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="cname">Nom *</label>
              <input id="cname" className="input" required maxLength={80} value={companyInfo.name}
                onChange={(e) => setCompanyInfo({ ...companyInfo, name: e.target.value })} />
            </div>
            <div>
              <label className="label" htmlFor="cphone">Téléphone</label>
              <input id="cphone" type="tel" className="input" maxLength={20} value={companyInfo.phone || ''}
                onChange={(e) => setCompanyInfo({ ...companyInfo, phone: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="caddress">Adresse</label>
              <input id="caddress" className="input" maxLength={200} value={companyInfo.address || ''}
                onChange={(e) => setCompanyInfo({ ...companyInfo, address: e.target.value })} />
            </div>
            <div>
              <label className="label" htmlFor="cweb">Site web</label>
              <input id="cweb" type="url" className="input" placeholder="https://…" maxLength={200} value={companyInfo.website || ''}
                onChange={(e) => setCompanyInfo({ ...companyInfo, website: e.target.value })} />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button disabled={savingCompany} className="btn-primary !py-2">
              {savingCompany ? 'Enregistrement…' : 'Enregistrer'}
            </button>
            <p className="text-xs text-gray-400">Ces informations apparaissent sur vos pages publiques.</p>
          </div>
        </form>
      )}

      {/* Apparence de la roue : couleurs des segments + image de fond + aperçu en direct */}
      <form onSubmit={save} className="card space-y-4">
        <h2 className="font-bold">🎡 Roue de la chance — apparence</h2>
        <div className="grid gap-6 lg:grid-cols-[1fr_auto]">
        <div className="space-y-4">
        <div>
          <label className="label">Couleurs des segments (alterne sur la roue)</label>
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
              className="rounded-lg border border-gray-200 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50">+ Couleur</button>
          </div>
          <p className="mt-1 text-xs text-gray-400">Astuce : 2 à 5 couleurs qui alternent rendent la roue plus lisible. Vide = palette par défaut.</p>
        </div>
        <div>
          <label className="label">Image de fond de la roue (affichée sous les segments)</label>
          <div className="flex items-center gap-3">
            {wheelBg
              ? // eslint-disable-next-line @next/next/no-img-element
                <img src={wheelBg} alt="Aperçu du fond" className="h-16 w-16 rounded-xl object-cover" />
              : <span className="flex h-16 w-16 items-center justify-center rounded-xl bg-gray-100 text-2xl">🖼️</span>}
            <label className="cursor-pointer rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50">
              {wheelBg ? 'Changer l’image' : 'Choisir une image'}
              <input type="file" accept="image/*" className="hidden"
                onChange={(e) => { onBgPick(e.target.files?.[0]); e.target.value = ''; }} />
            </label>
            {wheelBg && (
              <button type="button" onClick={() => setSettings({ ...settings, WHEEL_BG_IMAGE: '' })}
                className="text-sm text-red-500 hover:underline">Retirer</button>
            )}
          </div>
          <p className="mt-1 text-xs text-gray-400">JPG/PNG, 2 Mo max. Un voile clair est appliqué pour garder les textes lisibles.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="btn-primary !py-2">Enregistrer l'apparence</button>
          {saved && <span className="text-sm text-emerald-600">✓ Enregistré</span>}
          {error && <span className="text-sm text-red-600">{error}</span>}
        </div>
        </div>
        {/* Aperçu en direct : se met à jour à chaque changement de couleur/fond */}
        <div className="justify-self-center rounded-2xl bg-gray-50 p-4">
          <WheelPreview
            prizes={previewPrizes || [{ label: 'Lot 1' }, { label: 'Lot 2' }, { label: 'Lot 3' }, { label: 'Lot 4' }]}
            colors={wheelColors.length ? wheelColors : null}
            bgImage={wheelBg || null}
            accent={/^#[0-9a-fA-F]{6}$/.test(val('BRAND_COLOR')) ? val('BRAND_COLOR') : '#db2777'}
          />
        </div>
        </div>
      </form>


      {/* ⭐ Avis : modération + lien Google */}
      <form onSubmit={save} className="card space-y-4">
        <h2 className="font-bold">⭐ Avis</h2>
        {FIELDS.map(([key, label]) => (
          <div key={key}>
            <label className="label">{label}</label>
            <input className="input" value={settings[key] || ''} onChange={(e) => setSettings({ ...settings, [key]: e.target.value })} />
            {key === 'AUTO_APPROVE_MIN_RATING' && <p className="mt-1 text-xs text-gray-400">Ex. 4 → les avis de 4 et 5 étoiles sont publiés automatiquement.</p>}
          </div>
        ))}
        <div className="flex items-center gap-3">
          <button className="btn-primary !py-2">Enregistrer</button>
          {saved && <span className="text-sm text-emerald-600">✓ Enregistré</span>}
          {error && <span className="text-sm text-red-600">{error}</span>}
        </div>
      </form>
      {/* Formulaire joueurs + anti-abus + campagne */}
      <div className="grid gap-6 lg:grid-cols-2">
        <form onSubmit={save} className="card space-y-4">
          <h2 className="font-bold">🎮 Participation & campagne</h2>
          {[
            ['FORM_FIRSTNAME', 'Demander le prénom'],
            ['FORM_LASTNAME', 'Demander le nom'],
            ['FORM_PHONE', 'Demander le téléphone (optionnel)'],
          ].map(([key, label]) => (
            <label key={key} className="flex items-center gap-3 text-sm">
              <input type="checkbox" className="h-4 w-4 accent-brand-600" checked={flag(key)} onChange={(e) => setFlag(key, e.target.checked)} />
              {label}
            </label>
          ))}
          <div>
            <label className="label">Texte de consentement RGPD personnalisé (vide = texte par défaut)</label>
            <textarea className="input min-h-20" maxLength={400} value={val('FORM_RGPD_TEXT')}
              onChange={(e) => setSettings({ ...settings, FORM_RGPD_TEXT: e.target.value })} />
          </div>
          <div>
            <label className="label" htmlFor="winmsg">Message de victoire (écran « gagné »)</label>
            <input id="winmsg" className="input" maxLength={100} placeholder="Félicitations !"
              value={val('WIN_MESSAGE')}
              onChange={(e) => setSettings({ ...settings, WIN_MESSAGE: e.target.value })} />
          </div>
          <div>
            <label className="label" htmlFor="limitmode">Limite anti-abus</label>
            <select id="limitmode" className="input" value={val('SPIN_LIMIT_MODE', 'lifetime')}
              onChange={(e) => setSettings({ ...settings, SPIN_LIMIT_MODE: e.target.value })}>
              <option value="lifetime">1 participation par e-mail (à vie)</option>
              <option value="daily">1 participation par e-mail et par jour</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="cstart">Début de campagne</label>
              <input id="cstart" type="date" className="input" value={val('CAMPAIGN_START')}
                onChange={(e) => setSettings({ ...settings, CAMPAIGN_START: e.target.value })} />
            </div>
            <div>
              <label className="label" htmlFor="cend">Fin de campagne</label>
              <input id="cend" type="date" className="input" value={val('CAMPAIGN_END')}
                onChange={(e) => setSettings({ ...settings, CAMPAIGN_END: e.target.value })} />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="btn-primary !py-2">Enregistrer</button>
            {saved && <span className="text-sm text-emerald-600">✓ Enregistré</span>}
          </div>
        </form>

        <form onSubmit={save} className="card space-y-4">
          <h2 className="font-bold">🎨 Branding (page de jeu)</h2>
          <div>
            <label className="label">Logo (affiché au-dessus du titre)</label>
            <div className="flex items-center gap-3">
              {val('BRAND_LOGO')
                ? // eslint-disable-next-line @next/next/no-img-element
                  <img src={val('BRAND_LOGO')} alt="Logo" className="h-14 w-auto max-w-[160px] rounded-lg border object-contain p-1" />
                : <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-gray-100 text-2xl">🏷️</span>}
              <label className="cursor-pointer rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50">
                {val('BRAND_LOGO') ? 'Changer' : 'Choisir un logo'}
                <input type="file" accept="image/*" className="hidden"
                  onChange={(e) => { onLogoPick(e.target.files?.[0]); e.target.value = ''; }} />
              </label>
              {val('BRAND_LOGO') && (
                <button type="button" onClick={() => setSettings({ ...settings, BRAND_LOGO: '' })}
                  className="text-sm text-red-500 hover:underline">Retirer</button>
              )}
            </div>
          </div>
          <div>
            <label className="label" htmlFor="brandcolor">Couleur principale (roue, boutons)</label>
            <div className="flex items-center gap-2">
              <input id="brandcolor" type="color" value={/^#[0-9a-fA-F]{6}$/.test(val('BRAND_COLOR')) ? val('BRAND_COLOR') : '#db2777'}
                onChange={(e) => setSettings({ ...settings, BRAND_COLOR: e.target.value })} />
              <input className="input !w-32" placeholder="#db2777" value={val('BRAND_COLOR')}
                onChange={(e) => setSettings({ ...settings, BRAND_COLOR: e.target.value })} />
              <button type="button" onClick={() => setSettings({ ...settings, BRAND_COLOR: '' })}
                className="text-xs text-gray-500 hover:underline">Défaut</button>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="btn-primary !py-2">Enregistrer</button>
            {saved && <span className="text-sm text-emerald-600">✓ Enregistré</span>}
          </div>
        </form>
      </div>

      {/* 📱 QR codes + ✉️ Notifications : renvois vers les bons écrans */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card space-y-2">
          <h2 className="font-bold">📱 QR codes</h2>
          <p className="text-sm text-gray-500">Créez un QR par emplacement (caisse, comptoir…), téléchargez les visuels d'impression et testez le parcours.</p>
          <a href={`/${companySlug}/qr-codes`} className="inline-block text-sm font-semibold text-brand-600 hover:underline">Gérer mes QR codes →</a>
        </div>
        <div className="card space-y-2">
          <h2 className="font-bold">✉️ Notifications</h2>
          <p className="text-sm text-gray-500">
            L'envoi des e-mails (validation joueurs, codes admins) est géré de façon centrale par la plateforme.
            Le logo et l'expéditeur visible par vos clients se règlent dans « Branding » et « Avis ».
          </p>
          <Link href={`/${companySlug}/emails`} className="mt-2 inline-block text-sm font-semibold text-brand-600 hover:underline">
            Configurer l'e-mail et les templates →
          </Link>
          <p className="text-xs text-gray-400">Les notifications SMS arrivent bientôt.</p>
        </div>
      </div>

      <div className="card !p-4 text-sm text-gray-600">
        <p className="font-semibold">Rappel jeu conforme :</p>
        <p className="mt-1">Le règlement du jeu (gratuit, sans achat, probabilités) est automatiquement alimenté par vos lots : <a href={`/reglement-jeu?src=${companySlug}`} className="text-brand-600 hover:underline" target="_blank">/reglement-jeu</a>.</p>
      </div>

      {/* Double authentification : état + toggle auto-service */}
      {tfa && (
        <div className="card space-y-3">
          <h2 className="font-bold">Double authentification (2FA)</h2>
          <p className="text-sm text-gray-500">
            {tfa.active
              ? '✅ Active : un code à 6 chiffres (application d\u2019authentification) est demandé à chaque connexion.'
              : tfa.secretSet && !tfa.companyEnabled
                ? '⚠️ Désactivée au niveau de votre entreprise par le super admin.'
                : tfa.secretSet
                  ? '⛔ Désactivée pour votre compte.'
                  : 'Aucun secret TOTP configuré — la 2FA vous sera proposée à la première connexion.'}
          </p>
          {tfa.secretSet && (
            <div className="space-y-2">
              <input type="password" className="input" placeholder="Mot de passe (confirmation)"
                value={tfaForm.password} onChange={(e) => setTfaForm({ ...tfaForm, password: e.target.value })} />
              {tfa.active && (
                <input className="input text-center tracking-widest" placeholder="Code 2FA actuel (6 chiffres)" maxLength={6}
                  value={tfaForm.totp} onChange={(e) => setTfaForm({ ...tfaForm, totp: e.target.value })} />
              )}
              <div className="flex gap-2">
                {tfa.userEnabled ? (
                  <button type="button" onClick={() => toggle2fa('disable')}
                    className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500">
                    Désactiver ma 2FA
                  </button>
                ) : (
                  <button type="button" onClick={() => toggle2fa('enable')}
                    className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500">
                    Réactiver ma 2FA
                  </button>
                )}
                {tfaMsg && <span className="self-center text-sm text-gray-600">{tfaMsg}</span>}
              </div>
              <p className="text-xs text-gray-400">La désactivation est journalisée (qui, quand). Le super admin peut la forcer dans les deux sens.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
