'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Wheel from '@/components/Wheel';
import Confetti from '@/components/Confetti';

function Stars({ n }) {
  return <span className="text-amber-400">{'★'.repeat(n)}<span className="text-gray-300">{'★'.repeat(5 - n)}</span></span>;
}

export default function GameFlow({ initial, src, err, companyName = null, headline = null, sub = null, wheelColors = null, wheelBg = null, companySlug = null, brand = { logo: null, color: null }, formCfg = { firstName: true, lastName: true, phone: true, rgpdText: null } }) {
  const searchParams = useSearchParams();
  const [step, setStep] = useState(initial.step || 'identify');
  const [spin, setSpin] = useState(initial.spin);
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', consent: false });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(err === 'expired' ? 'Lien expiré : validez à nouveau votre e-mail.' : '');
  const [error, setError] = useState('');
  const [winnerId, setWinnerId] = useState(null);
  const [review, setReview] = useState({ rating: 5, comment: '', photo: null, photoName: '' });
  const [reviewSent, setReviewSent] = useState(false);
  const [googleUrl, setGoogleUrl] = useState(searchParams.get('g') || '');
  const [soundOn, setSoundOn] = useState(false); // désactivé par défaut (ambiance boutique)

  // Petite mélodie de victoire via WebAudio (uniquement si activée)
  function playWinSound() {
    if (!soundOn) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      [523, 659, 784, 1047].forEach((freq, i) => {
        const o = ctx.createOscillator(); const g = ctx.createGain();
        o.frequency.value = freq; o.type = 'sine';
        g.gain.setValueAtTime(0.0001, ctx.currentTime + i * 0.12);
        g.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + i * 0.12 + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.12 + 0.35);
        o.connect(g).connect(ctx.destination);
        o.start(ctx.currentTime + i * 0.12); o.stop(ctx.currentTime + i * 0.12 + 0.4);
      });
    } catch { /* audio indisponible */ }
  }

  async function submitIdentify(e) {
    e.preventDefault();
    setLoading(true); setError(''); setMessage('');
    try {
      const res = await fetch('/api/identify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, sourceSlug: src || searchParams.get('src') || '', companySlug: companySlug || '' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur');
      if (data.demoToken) {
        // Mode démo : pas d'e-mail réel, on valide directement
        window.location.href = `/api/verify?token=${data.demoToken}`;
        return;
      }
      setStep('check-email');
    } catch (e2) {
      setError(e2.message);
    } finally {
      setLoading(false);
    }
  }

  function onLaunch(data) {
    setWinnerId(data.prizeId);
    setSpin({ label: data.label, giftCode: data.giftCode, photo: data.photo || null });
  }

  function onWheelDone() {
    setStep('result');
    playWinSound();
  }

  function onPhotoChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2.5 * 1024 * 1024) { setError('Photo trop lourde (max 2,5 Mo).'); return; }
    const reader = new FileReader();
    reader.onload = () => setReview((r) => ({ ...r, photo: reader.result, photoName: file.name }));
    reader.readAsDataURL(file);
  }

  async function submitReview(e) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: review.rating, comment: review.comment, photo: review.photo || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur');
      setGoogleUrl(data.googleUrl || '');
      setReviewSent(true);
      setStep('done');
    } catch (e2) {
      setError(e2.message);
    } finally {
      setLoading(false);
    }
  }

  function trackGoogle() {
    fetch('/api/review', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ googleClick: true }) }).catch(() => {});
  }

  // ---------- Rendu ----------
  return (
    <main className="mx-auto min-h-screen max-w-lg px-4 py-8">
      <div className="mb-8 text-center">
        {brand.logo
          ? // eslint-disable-next-line @next/next/no-img-element
            <img src={brand.logo} alt={companyName || 'Logo'} className="mx-auto mb-3 h-16 w-auto max-w-[180px] object-contain" />
          : <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 text-3xl shadow-lg">🎡</div>}
        <h1 className="text-2xl font-extrabold">{headline || 'Scannez, jouez, gagnez !'}</h1>
        {companyName
          ? <p className="mt-1 text-sm font-semibold text-brand-600">Organisé par {companyName}</p>
          : <p className="mt-1 text-sm text-gray-400">Roue de la chance</p>}
        {sub && <p className="mt-1 text-sm text-gray-500">{sub}</p>}
      </div>

      {error && <div className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>}
      {message && <div className="mb-4 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700">{message}</div>}

      {/* Étape 1 : identification */}
      {step === 'identify' && (
        <form onSubmit={submitIdentify} className="card">
          <h2 className="text-lg font-bold">Qui êtes-vous ?</h2>
          <p className="mt-1 text-sm text-gray-500">
            {companyName ? `Un e-mail de confirmation vous sera envoyé pour débloquer la roue de ${companyName}.` : 'Un e-mail de confirmation vous sera envoyé pour débloquer le jeu.'}
          </p>
          <div className="mt-4 space-y-4">
            <div className={`grid gap-3 ${formCfg.firstName && formCfg.lastName ? 'grid-cols-2' : 'grid-cols-1'}`}>
              {formCfg.firstName && (
                <div>
                  <label className="label" htmlFor="firstName">Prénom *</label>
                  <input id="firstName" className="input" autoComplete="given-name" required maxLength={60} value={form.firstName}
                    onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
                </div>
              )}
              {formCfg.lastName && (
                <div>
                  <label className="label" htmlFor="lastName">Nom *</label>
                  <input id="lastName" className="input" autoComplete="family-name" required maxLength={60} value={form.lastName}
                    onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
                </div>
              )}
            </div>
            <div>
              <label className="label" htmlFor="email">E-mail *</label>
              <input id="email" type="email" className="input" autoComplete="email" required maxLength={120} value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            {formCfg.phone && (
              <div>
                <label className="label" htmlFor="phone">Téléphone (optionnel)</label>
                <input id="phone" type="tel" className="input" autoComplete="tel" maxLength={20} value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
            )}
            <label className="flex items-start gap-3 text-sm text-gray-600">
              <input type="checkbox" required className="mt-1 h-4 w-4 accent-pink-600" checked={form.consent}
                onChange={(e) => setForm({ ...form, consent: e.target.checked })} />
              <span>
                {formCfg.rgpdText || 'J’accepte que mes données soient utilisées pour cette opération, conformément à la politique de confidentialité.'}{' '}
                Consentement obligatoire pour participer.
              </span>
            </label>
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Envoi…' : 'Recevoir mon lien de jeu'}
            </button>
            <p className="text-center text-xs text-gray-400">Jeu gratuit, sans achat. 1 tour par e-mail validé.</p>
          </div>
        </form>
      )}

      {/* Étape 1b : attente de validation e-mail */}
      {step === 'check-email' && (
        <div className="card text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-3xl">📧</div>
          <h2 className="text-lg font-bold">Vérifiez vos e-mails !</h2>
          <p className="mt-2 text-sm text-gray-600">
            Nous venons de vous envoyer un lien de validation (valide 30 minutes).<br />
            Cliquez dessus pour débloquer la roue de la chance.
          </p>
          <p className="mt-4 text-xs text-gray-400">Pensez à vérifier vos spams.</p>
        </div>
      )}

      {/* Étape 2 : roue */}
      {step === 'wheel' && (
        <div className="card">
          <h2 className="mb-6 text-center text-lg font-bold">Tentez votre chance !</h2>
          <Wheel prizes={initial.prizes} onLaunch={onLaunch} onDone={onWheelDone} colors={wheelColors} bgImage={wheelBg} accent={brand.color || '#db2777'} />
          <p className="mt-4 text-center text-sm text-gray-500">Cliquez pour lancer — le tirage au sort est effectué instantanément côté serveur.</p>
        </div>
      )}

      {/* Étape 3 : résultat — overlay plein écran + confettis */}
      {step === 'result' && spin && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-y-auto bg-white px-4 py-8 text-center dark:bg-gray-950">
          <Confetti />
          <button onClick={() => setSoundOn(!soundOn)} aria-label={soundOn ? 'Couper le son' : 'Activer le son'}
            className="absolute right-4 top-4 inline-flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 text-xl hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800">
            {soundOn ? '🔊' : '🔇'}
          </button>
          <div className="animate-bounce text-7xl" aria-hidden="true">🎉</div>
          <h2 className="mt-3 text-3xl font-extrabold">Félicitations !</h2>
          <p className="mt-1 text-gray-600">Vous avez gagné :</p>
          {spin.photo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={spin.photo} alt={spin.label} className="mt-4 h-44 w-44 rounded-3xl object-cover shadow-xl" />
          )}
          <p className="mt-3 text-3xl font-extrabold text-brand-600">{spin.label}</p>
          <div className="mx-auto mt-5 w-full max-w-xs rounded-2xl border-2 border-dashed border-brand-300 bg-brand-50 p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Votre code cadeau</p>
            <p className="mt-1 select-all font-mono text-2xl font-bold tracking-widest">{spin.giftCode}</p>
          </div>
          <p className="mt-3 max-w-xs text-xs text-gray-500">Présentez ce code en caisse pour bénéficier de votre gain.</p>
          <button onClick={() => setStep('review')} style={brand.color ? { backgroundColor: brand.color } : undefined} className="btn-primary mt-6 w-full max-w-xs">
            Continuer : laissez-nous votre avis
          </button>
        </div>
      )}

      {/* Étape 4 : avis */}
      {step === 'review' && !reviewSent && (
        <form onSubmit={submitReview} className="card">
          <h2 className="text-lg font-bold">Votre avis compte !</h2>
          <p className="mt-1 text-sm text-gray-500">Dites-nous ce que vous avez pensé de votre visite.</p>
          <div className="mt-5 space-y-4">
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" onClick={() => setReview({ ...review, rating: n })}
                  aria-label={`${n} étoile${n > 1 ? 's' : ''}`}
                  className={`text-3xl transition hover:scale-110 ${n <= review.rating ? 'text-amber-400' : 'text-gray-300'}`}>
                  ★
                </button>
              ))}
            </div>
            <div>
              <label className="label" htmlFor="comment">Commentaire (optionnel)</label>
              <textarea id="comment" className="input min-h-28" maxLength={1000} value={review.comment}
                onChange={(e) => setReview({ ...review, comment: e.target.value })} />
            </div>
            <div>
              <label className="label" htmlFor="photo">Photo (optionnelle, max 2,5 Mo)</label>
              <input id="photo" type="file" accept="image/*" className="block w-full text-sm text-gray-500 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-4 file:py-2 file:text-brand-700"
                onChange={onPhotoChange} />
              {review.photoName && <p className="mt-1 text-xs text-emerald-600">✓ {review.photoName}</p>}
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Envoi…' : 'Envoyer mon avis'}
            </button>
            <p className="text-center text-xs text-gray-400">
              Déposer un avis ici est facultatif et sans contrepartie.
            </p>
          </div>
        </form>
      )}

      {/* Étape 5 : merci */}
      {step === 'done' && (
        <div className="card text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-3xl">✅</div>
          <h2 className="text-lg font-bold">Merci beaucoup !</h2>
          <p className="mt-2 text-sm text-gray-600">Votre avis a bien été enregistré. À très bientôt en boutique !</p>
          {googleUrl && (
            <a href={googleUrl} target="_blank" rel="noopener noreferrer" onClick={trackGoogle}
              className="btn-secondary mt-5 w-full">
              ⭐ Laisser un avis sur Google
            </a>
          )}
          <p className="mt-3 text-xs text-gray-400">Facultatif et sans condition — merci du temps pris pour nous aider.</p>
        </div>
      )}

      {spin && step === 'review' && (
        <p className="mt-4 text-center text-sm text-gray-500">
          🎁 Votre gain : <strong>{spin.label}</strong> — code <span className="font-mono">{spin.giftCode}</span>
        </p>
      )}
    </main>
  );
}
