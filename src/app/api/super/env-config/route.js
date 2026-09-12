import { NextResponse } from 'next/server';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { requireSuperAdmin, logAction } from '@/lib/admin-guard';

// Configuration serveur (.env) : lecture/écriture du fichier par le super admin.
// ⚠️ La plupart de ces variables ne sont lues qu'AU DÉMARRAGE du serveur :
// une sauvegarde nécessite un redémarrage pour prendre effet.

const ENV_PATH = path.join(process.cwd(), '.env');

const GROUPS = [
  {
    group: 'Base de données',
    keys: [{ key: 'DATABASE_URL', label: 'URL PostgreSQL (Neon ou local)', secret: true }],
  },
  {
    group: 'Application',
    keys: [
      { key: 'APP_URL', label: 'URL publique (sans slash final)' },
      { key: 'APP_NAME', label: "Nom de l'application (QR TOTP)" },
    ],
  },
  {
    group: 'Sécurité',
    keys: [
      { key: 'JWT_SECRET', label: 'Clé de signature des sessions (openssl rand -base64 48)', secret: true },
      { key: 'IP_HASH_SECRET', label: 'Clé de hachage des IP RGPD (openssl rand -hex 16)', secret: true },
    ],
  },
  {
    group: 'E-mail (repli si rien en base)',
    keys: [
      { key: 'RESEND_API_KEY', label: 'Clé API Resend', secret: true },
      { key: 'SMTP_HOST', label: 'Hôte SMTP (Brevo : smtp-relay.brevo.com)' },
      { key: 'SMTP_PORT', label: 'Port SMTP (587 ou 465)' },
      { key: 'SMTP_USER', label: 'Utilisateur SMTP' },
      { key: 'SMTP_PASS', label: 'Mot de passe / clé SMTP', secret: true },
      { key: 'MAIL_FROM', label: 'Expéditeur par défaut' },
      { key: 'DEMO_MODE', label: 'Mode démo (true = e-mails simulés en console)' },
    ],
  },
  {
    group: 'Compte super admin initial (seed)',
    keys: [
      { key: 'ADMIN_EMAIL', label: 'E-mail admin du seed' },
      { key: 'ADMIN_PASSWORD', label: 'Mot de passe admin du seed', secret: true },
    ],
  },
];

const ALL_KEYS = GROUPS.flatMap((g) => g.keys.map((k) => ({ ...k, group: g.group })));
const SECRET_KEYS = ALL_KEYS.filter((k) => k.secret).map((k) => k.key);

function parseEnv(text) {
  const map = {};
  for (const line of text.split(/\r?\n/)) {
    const i = line.indexOf('=');
    if (i > 0 && !line.trim().startsWith('#')) {
      const k = line.slice(0, i).trim();
      map[k] = line.slice(i + 1).trim().replace(/^"(.*)"$/s, '$1');
    }
  }
  return map;
}

function mask(v) {
  if (!v) return '';
  return v.length <= 6 ? '••••••' : `${v.slice(0, 3)}••••••••${v.slice(-4)}`;
}

// GET : état actuel du .env (valeurs masquées pour les secrets)
export async function GET(req) {
  const guard = await requireSuperAdmin(req);
  if (guard.error) return guard.error;

  let raw = '';
  try { raw = fs.readFileSync(ENV_PATH, 'utf8'); } catch { /* .env absent */ }
  const stored = parseEnv(raw);

  const groups = GROUPS.map(({ group, keys }) => ({
    group,
    fields: keys.map(({ key, label, secret }) => {
      const v = stored[key] ?? '';
      return {
        key, label, group,
        secret: Boolean(secret),
        value: secret ? mask(v) : v,
        configured: Boolean(v),
        set: key in stored,
      };
    }),
  }));

  return NextResponse.json({ groups, envPath: '.env' });
}

const patchSchema = z.record(z.string());

// PATCH : écrit les valeurs dans le .env (préserve commentaires et ordre).
// Secret vide = inchangé ; DATABASE_URL vide refusé (protège contre une panne).
export async function PATCH(req) {
  const guard = await requireSuperAdmin(req);
  if (guard.error) return guard.error;

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 });
  const updates = Object.entries(parsed.data).filter(([k]) => ALL_KEYS.some((d) => d.key === k));

  let raw = '';
  try { raw = fs.readFileSync(ENV_PATH, 'utf8'); } catch { raw = ''; }

  // Garde-fou : ne jamais vider DATABASE_URL
  const dbUpdate = updates.find(([k]) => k === 'DATABASE_URL');
  if (dbUpdate && !dbUpdate[1].trim()) {
    return NextResponse.json({ error: 'DATABASE_URL ne peut pas être vide.' }, { status: 400 });
  }
  // Validation du format de l'URL PostgreSQL avant écriture
  if (dbUpdate && dbUpdate[1].trim() && !/^postgres(ql)?:\/\//.test(dbUpdate[1].trim())) {
    return NextResponse.json({ error: 'DATABASE_URL doit commencer par postgresql://' }, { status: 400 });
  }

  const lines = raw ? raw.split(/\r?\n/) : [];
  const seen = new Set();
  const next = lines.map((line) => {
    const i = line.indexOf('=');
    if (i <= 0 || line.trim().startsWith('#')) return line;
    const k = line.slice(0, i).trim();
    const up = updates.find(([uk]) => uk === k);
    if (!up) return line;
    seen.add(k);
    const v = up[1].trim();
    if (SECRET_KEYS.includes(k) && v === '') return line; // secret vide = inchangé
    if (SECRET_KEYS.includes(k) && v.startsWith('•')) return line; // masque non modifié
    return `${k}="${v}"`;
  });
  // Clés absentes du fichier : ajoutées en fin de fichier
  for (const [k, v] of updates) {
    if (seen.has(k) || (SECRET_KEYS.includes(k) && !v.trim())) continue;
    next.push(`${k}="${v.trim()}"`);
  }

  try {
    fs.writeFileSync(ENV_PATH, next.join('\n'), 'utf8');
  } catch (e) {
    return NextResponse.json({ error: `Écriture impossible : ${e.message}` }, { status: 500 });
  }

  await logAction(guard.admin.id, 'env_config.update', 'Setting', updates.map(([k]) => k).join(',').slice(0, 200));
  return NextResponse.json({ ok: true, restartRequired: true });
}

// POST : test de connexion PostgreSQL avec l'URL fournie (sans redémarrage).
export async function POST(req) {
  const guard = await requireSuperAdmin(req);
  if (guard.error) return guard.error;

  const body = await req.json().catch(() => null);
  const url = body?.databaseUrl?.trim();
  if (!url || !/^postgres(ql)?:\/\//.test(url)) {
    return NextResponse.json({ error: 'Fournissez une URL postgresql:// valide.' }, { status: 400 });
  }

  const client = new PrismaClient({ datasources: { db: { url } } });
  try {
    await client.$queryRaw`SELECT 1`;
    const rows = await client.$queryRaw`SELECT COUNT(*)::int AS companies FROM "Company"`;
    return NextResponse.json({ ok: true, companies: rows[0]?.companies ?? 0 });
  } catch (e) {
    return NextResponse.json({ error: `Connexion échouée : ${String(e.message).slice(0, 200)}` }, { status: 502 });
  } finally {
    await client.$disconnect().catch(() => {});
  }
}
