import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Diagnostic : état de la connexion base + tables récentes. Aucune donnée sensible.
export async function GET() {
  const checks = {};
  try {
    checks.database = 'ok';
    checks.companies = await db.company.count();
  } catch (e) {
    return NextResponse.json({ ok: false, database: 'unreachable', error: String(e.message).slice(0, 150) }, { status: 500 });
  }
  try {
    checks.isPublicColumn = (await db.$queryRawUnsafe(`SELECT 1 FROM information_schema.columns WHERE table_name='Company' AND column_name='isPublic'`)).length > 0;
    checks.serverConfig = (await db.$queryRawUnsafe(`SELECT 1 FROM information_schema.tables WHERE table_name='ServerConfig'`)).length > 0;
    checks.subscriptionTables = (await db.$queryRawUnsafe(`SELECT 1 FROM information_schema.tables WHERE table_name='Subscription'`)).length > 0;
    checks.marketingTables = (await db.$queryRawUnsafe(`SELECT 1 FROM information_schema.tables WHERE table_name='Campaign'`)).length > 0;
    checks.companySlugUniqueIndex = (await db.$queryRawUnsafe(`SELECT 1 FROM pg_indexes WHERE tablename='Company' AND indexdef LIKE '%slug%'`)).length > 0;
  } catch (e) {
    checks.schemaCheck = `error: ${String(e.message).slice(0, 100)}`;
  }
  return NextResponse.json({ ok: true, checks });
}
