'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Wheel from '@/components/Wheel';

function Stars({ n }) {
  return <span className="text-amber-400">{'★'.repeat(n)}<span className="text-gray-300">{'★'.repeat(5 - n)}</span></span>;
}

export default function GameFlow({ initial, src, err }) {
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

  async function submitIdentify(e) {
    e.preventDefault();
    setLoading(true); setError(''); setMessage('');
    try {
      const res = await fetch('/api/identify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, sourceSlug: src || searchParams.get('src') || '' }),
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
    setSpin({ label: data.label, giftCode: data.giftCode });
  }

  function onWheelDone() {
    setStep('result');
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
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 text-3xl shadow-lg">🎡</div>
        <h1 className="text-2xl font-extrabold">Roue de la chance</h1>
      </div>

      {error && <div className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>}
      {message && <div className="mb-4 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700">{message}</div>}

      {/* Étape 1 : identification */}
      {step === 'identify' && (
        <form onSubmit={submitIdentify} className="card">
          <h2 className="text-lg font-bold">Qui êtes-vous ?</h2>
          <p className="mt-1 text-sm text-gray-500">Un e-mail de confirmation vous sera envoyé pour débloquer le jeu.</p>
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label" htmlFor="firstName">Prénom *</label>
                <input id="firstName" className="input" required maxLength={60} value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
              </div>
              <div>
                <label className="label" htmlFor="lastName">Nom *</label>
                <input id="lastName" className="input" required maxLength={60} value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="label" htmlFor="email">E-mail *</label>
              <input id="email" type="email" className="input" required maxLength={120} value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <label className="label" htmlFor="phone">Téléphone (optionnel)</label>
              <input id="phone" type="tel" className="input" maxLength={20} value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <label className="flex items-start gap-3 text-sm text-gray-600">
              <input type="checkbox" required className="mt-1 h-4 w-4 accent-pink-600" checked={form.consent}
                onChange={(e) => setForm({ ...form, consent: e.target.checked })} />
              <span>
                J&apos;accepte que mes données soient utilisées pour cette opération, conformément à la
                politique de confidentialité. Consentement obligatoire pour participer.
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
          <Wheel prizes={initial.prizes} onLaunch={onLaunch} onDone={onWheelDone} />
          <p className="mt-4 text-center text-sm text-gray-500">Cliquez pour lancer — le tirage au sort est effectué instantanément côté serveur.</p>
        </div>
      )}

      {/* Étape 3 : résultat */}
      {step === 'result' && spin && (
        <div className="card text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-amber-100 text-5xl">🎁</div>
          <h2 className="text-xl font-bold">Félicitations !</h2>
          <p className="mt-2 text-gray-600">Vous avez gagné :</p>
          <p className="mt-1 text-2xl font-extrabold text-brand-700">{spin.label}</p>
          <div className="mx-auto mt-5 max-w-xs rounded-xl border-2 border-dashed border-brand-300 bg-brand-50 p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Votre code cadeau</p>
            <p className="mt-1 font-mono text-xl font-bold tracking-widest">{spin.giftCode}</p>
          </div>
          <p className="mt-3 text-xs text-gray-500">Présentez ce code en caisse pour bénéficier de votre gain.</p>
          <button onClick={() => setStep('review')} className="btn-primary mt-6 w-full">
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
