import Link from 'next/link';
import { getUsage } from '@/lib/subscription';

// Barres d'utilisation vs limites du plan (composant serveur, via la lib centralisée).
export default async function Usage({ companyId }) {
  const data = await getUsage(companyId);
  if (!data) return null;
  const { usage, plan } = data;

  return (
    <div className="space-y-4">
      <Bar label="QR codes" used={usage.qrCodes.used} max={usage.qrCodes.max} />
      <Bar label="Clients" used={usage.customers.used} max={usage.customers.max} />
      <Bar label="Participations ce mois-ci" used={usage.spinsThisMonth.used} max={usage.spinsThisMonth.max} />
      <p className="text-xs text-gray-400">
        Plan {plan?.name} — les limites « ∞ » sont illimitées.
        {plan?.maxQrCodes != null && usage.qrCodes.used >= plan.maxQrCodes && (
          <> Limite atteinte : <Link href="/tarifs" className="font-semibold text-brand-600 hover:underline">voir les plans supérieurs</Link>.</>
        )}
      </p>
    </div>
  );
}

function Bar({ label, used, max }) {
  const unlimited = max == null;
  const pct = unlimited ? 0 : Math.min(100, Math.round((used / max) * 100));
  return (
    <div>
      <p className="flex justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-gray-500">{used}{unlimited ? ' / ∞' : ` / ${max}`}</span>
      </p>
      {!unlimited && (
        <div className="mt-1 h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
          <div className={`h-full rounded-full ${pct >= 100 ? 'bg-red-500' : pct >= 80 ? 'bg-amber-500' : 'bg-brand-500'}`} style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  );
}
