import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sha256 } from '@/lib/utils';

// Validation de l'e-mail admin via le token signé (24h).
export async function GET(req) {
  const token = new URL(req.url).searchParams.get('token');
  const row = token ? await db.emailToken.findUnique({ where: { tokenHash: sha256(token) } }) : null;

  if (!row || row.usedAt || row.expiresAt < new Date() || row.type !== 'VALIDATE_EMAIL' || !row.adminId) {
    return NextResponse.redirect(new URL('/admin/login?err=validation', req.url), 302);
  }

  await db.$transaction([
    db.admin.update({ where: { id: row.adminId }, data: { emailVerifiedAt: new Date() } }),
    db.emailToken.update({ where: { id: row.id }, data: { usedAt: new Date() } }),
  ]);

  return NextResponse.redirect(new URL('/admin/login?ok=validated', req.url), 302);
}
