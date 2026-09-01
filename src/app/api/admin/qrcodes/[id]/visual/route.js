import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import { db } from '@/lib/db';
import { requirePermission, companyScope } from '@/lib/admin-guard';

const APP_URL = process.env.APP_URL || 'http://localhost:3000';

const COLORS = {
  dark: '#1f2937',
  accent: '#db2777',
};

function textBytes(str) {
  return Buffer.from(str, 'utf8');
}

// Téléchargement des visuels d'impression : qr.png | qr.svg | poster.pdf
// Query : format=png|svg|pdf, poster=comptoir|tenture|sticker (pdf), text=accroche, dark=hex, light=hex, logo=1
export async function GET(req, { params }) {
  const guard = await requirePermission(req, 'manage_qrcodes');
  if (guard.error) return guard.error;

  const { id } = params;
  const qr = await db.qrCode.findFirst({ where: { id, companyId: companyScope(guard) } });
  if (!qr) return new Response('QR introuvable', { status: 404 });

  const sp = new URL(req.url).searchParams;
  const format = sp.get('format') || 'png';
  const dark = sp.get('dark') || COLORS.dark;
  const light = sp.get('light') || '#ffffff';
  const withLogo = sp.get('logo') === '1';
  const url = `${APP_URL}/r/${qr.slug}`;

  const safeName = qr.slug.replace(/[^a-z0-9-]/gi, '_');

  if (format === 'png') {
    const buffer = await QRCode.toBuffer(url, {
      type: 'png',
      errorCorrectionLevel: withLogo ? 'H' : 'M',
      margin: 2,
      width: 1024,
      color: { dark, light },
    });
    return new Response(buffer, {
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': `attachment; filename="qr-${safeName}.png"`,
      },
    });
  }

  if (format === 'svg') {
    let svg = await QRCode.toString(url, {
      type: 'svg',
      errorCorrectionLevel: withLogo ? 'H' : 'M',
      margin: 2,
      color: { dark, light },
    });
    if (withLogo) {
      // Pastille centrale blanche + initiale (SVG vectoriel, impression nette)
      const logo = `<circle cx="50%" cy="50%" r="16%" fill="#ffffff" stroke="${dark}" stroke-width="1.5"/>
  <text x="50%" y="50%" text-anchor="middle" dominant-baseline="central" font-family="Helvetica,Arial,sans-serif" font-size="18" font-weight="bold" fill="${dark}">${qr.label.slice(0, 2).toUpperCase()}</text>`;
      svg = svg.replace('</svg>', `${logo}\n</svg>`);
    }
    return new Response(svg, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Content-Disposition': `attachment; filename="qr-${safeName}.svg"`,
      },
    });
  }

  if (format === 'pdf') {
    return await buildPosterPdf({ qr, url, dark, light, poster: sp.get('poster') || 'comptoir', headline: sp.get('text'), safeName });
  }

  return new Response('Format inconnu', { status: 400 });
}

async function buildPosterPdf({ qr, url, dark, light, poster, headline, safeName }) {
  const qrPng = await QRCode.toBuffer(url, {
    type: 'png',
    errorCorrectionLevel: 'H',
    margin: 1,
    width: 900,
    color: { dark, light },
  });

  const headlineText = headline || 'Scannez ce code et tentez de gagner un cadeau !';
  const subText = '1 tour par personne, sans achat. Gratuit. Reglement disponible en magasin.';

  const sizes = {
    comptoir: [595.28, 841.89], // A4 portrait
    tenture: [419.53, 595.28],  // A5 portrait
    sticker: [419.53, 595.28],  // A5 avec cercle
  };
  const [w, h] = sizes[poster] || sizes.comptoir;

  const doc = new PDFDocument({ size: [w, h], margin: 0, info: { Title: `Affiche QR - ${qr.label}` } });
  const chunks = [];
  doc.on('data', (c) => chunks.push(c));
  const done = new Promise((resolve) => doc.on('end', resolve));

  const accent = COLORS.accent;

  // Bandeau haut
  doc.rect(0, 0, w, poster === 'sticker' ? 60 : 110).fill(accent);
  doc.fill('#ffffff').font('Helvetica-Bold').fontSize(poster === 'tenture' ? 15 : 18)
    .text(qr.label.toUpperCase(), 0, poster === 'sticker' ? 22 : 38, { width: w, align: 'center' });
  if (poster !== 'sticker') {
    doc.font('Helvetica').fontSize(10).text('Operation speciale en boutique', 0, 72, { width: w, align: 'center' });
  }

  // Titre / accroche
  let y = poster === 'sticker' ? 100 : 150;
  doc.fill(dark).font('Helvetica-Bold').fontSize(poster === 'comptoir' ? 24 : 18)
    .text(headlineText, 40, y, { width: w - 80, align: 'center', lineGap: 4 });
  y = doc.y + 24;

  // Cercle de fond pour le sticker
  const qrSize = poster === 'comptoir' ? 300 : poster === 'tenture' ? 230 : 260;
  const cx = w / 2;
  if (poster === 'sticker') {
    doc.save();
    doc.circle(cx, y + qrSize / 2, qrSize / 2 + 26).lineWidth(3).stroke(accent);
    doc.restore();
  }

  doc.image(qrPng, cx - qrSize / 2, y, { width: qrSize, height: qrSize });
  y += qrSize + 30;

  // Sous-texte
  doc.fill(dark).font('Helvetica').fontSize(poster === 'comptoir' ? 12 : 10)
    .text(subText, 50, y, { width: w - 100, align: 'center', lineGap: 3 });

  // Pied de page
  doc.fill('#9ca3af').font('Helvetica').fontSize(8)
    .text(url, 0, h - 34, { width: w, align: 'center' });

  doc.end();
  await done;

  return new Response(Buffer.concat(chunks), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="affiche-${poster}-${safeName}.pdf"`,
    },
  });
}
