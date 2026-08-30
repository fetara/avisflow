import { NextResponse } from 'next/server';
import { db, setSetting } from '@/lib/db';
import { requireAdmin, logAction } from '@/lib/admin-guard';

export async function GET(req) {
  const guard = await requireAdmin(req);
  if (guard.error) return guard.error;
  const rows = await db.setting.findMany();
  return NextResponse.json({ settings: Object.fromEntries(rows.map((r) => [r.key, r.value])) });
}

export async function PATCH(req) {
  const guard = await requireAdmin(req);
  if (guard.error) return guard.error;
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 });
  for (const [key, value] of Object.entries(body)) {
    if (typeof key !== 'string' || key.length > 60 || typeof value !== 'string') continue;
    await setSetting(key, value.slice(0, 500));
  }
  await logAction(guard.admin.id, 'settings.update', 'Setting');
  return NextResponse.json({ ok: true });
}
