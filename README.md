# 🎡 Avis clients & Roue de la Chance

Application web complète pour un commerce local : récolte d'avis clients en boutique via **QR codes**, animation avec une **roue de la chance** (tirage au sort côté serveur), et **backoffice sécurisé** pour modérer, gérer les lots, les QR codes et suivre les statistiques.

## Sommaire
1. [Fonctionnalités](#fonctionnalités)
2. [Stack technique](#stack-technique)
3. [Installation locale](#installation-locale)
4. [Structure du projet](#structure-du-projet)
5. [Comptes de démonstration & seed](#comptes-de-démonstration--seed)
6. [Parcours complet à tester](#parcours-complet-à-tester)
7. [Déploiement gratuit pas à pas (Vercel + Neon/Supabase + Resend)](#déploiement-gratuit-pas-à-pas)
8. [Alternative : Render](#alternative--render-gratuit)
9. [Limites des offres gratuites & montée en gamme](#limites-des-offres-gratuites--montée-en-gamme)
10. [Sécurité & RGPD](#sécurité--rgpd)

---

## Fonctionnalités

### Parcours client (mobile-first)
| Étape | Description |
|---|---|
| **0. Scan QR** | URL courte `/r/{slug}` avec tracking du scan (horodatage, user-agent, IP hashée), redirection rapide vers `/jeu` |
| **1. Identification** | Prénom, nom, e-mail, téléphone (optionnel), consentement RGPD obligatoire. E-mail de validation avec lien valable 30 min |
| **2. Roue** | Roue animée en Canvas. **Tirage déterminé côté serveur** avec probabilités pondérées + gestion du stock, enregistré en base, puis animé côté client. Un seul tour par e-mail validé |
| **3. Gain** | Écran de résultat + code cadeau unique (ex. `GIFT-7K2M9QXA`) |
| **4. Avis** | Note 1–5 étoiles, commentaire, photo optionnelle. Puis bouton facultatif « Laisser un avis sur Google » (lien configuré, sans contrepartie) |

### QR codes en boutique
- Création à la demande : libellé, slug unique, destination modifiable (**QR dynamique** : réorientation sans réimprimer), dates de validité optionnelles
- Téléchargements : **PNG haute résolution (1024px)**, **SVG vectoriel** (avec logo central optionnel), **PDF**
- **Modèles d'affiches prêts à imprimer** (PDF) : affiche comptoir (A4), tenture de table (A5), autocollant rond (A5), avec accroche personnalisable
- QR désactivé/expiré → page « Opération terminée » propre (pas d'erreur)
- Rate limiting anti-bot sur les scans (30 scans / 5 min / IP)
- Entonnoir de conversion par QR : scans → inscrits → validés → parties → avis → clics Google
 
### Backoffice (authentification forte)
- Inscription avec validation d'e-mail (token hashé SHA-256, expiration 24h)
- Connexion : bcrypt (12 rounds) + **2FA** (TOTP ou code à 6 chiffres par e-mail)
- Rate limiting sur `/api/admin/login` (8 essais / 15 min / IP), journal des connexions (`LoginSession`), audit log de toutes les actions
- **Modération** : filtres (statut, note ≥ N, mot-clé, source QR), approuver/rejeter/masquer/répondre, auto-publication configurable des avis ≥ 4 étoiles
- **Clients** : recherche, filtre par source, **export CSV** (Excel-compatible), suppression RGPD par anonymisation
- **Jeu** : lots, poids (probabilités), stocks, activation
- **Statistiques** : entonnoir global, répartition des notes, lots distribués, tableau de performance par QR (meilleurs emplacements)
- Pages légales : mentions légales, règlement du jeu (avec probabilités calculées en temps réel), politique de confidentialité

---

## Stack technique

- **Front + Back** : Next.js 14 (App Router, API Routes) + Tailwind CSS
- **Base de données** : PostgreSQL + Prisma ORM
- **QR codes** : `qrcode` (génération server-side PNG/SVG) + `pdfkit` (affiches PDF)
- **E-mails** : Resend (HTTP API) avec fallback SMTP Brevo/Nodemailer — en local sans config, les e-mails sont loggés en console
- **Sécurité** : Zod (validation), JWT (jose) en cookie httpOnly, bcrypt, otplib (TOTP), rate limiting, IP hashées (HMAC-SHA256)

## Installation locale

```bash
# 1. Prérequis : Node.js 18+ et une base PostgreSQL
#    (local, Docker, ou une base gratuite Neon/Supabase — voir plus bas)

# 2. Installer les dépendances
npm install

# 3. Configurer l'environnement
cp .env.example .env
#    → renseigner DATABASE_URL (obligatoire), APP_URL, JWT_SECRET…

# 4. Créer les tables (migrations SQL dans prisma/migrations/)
npx prisma migrate deploy

# 5. Données d'exemple (admin, 6 lots, réglages, 3 QR codes de démo)
npm run seed

# 6. Lancer
npm run dev
# → http://localhost:3000
```

### Base PostgreSQL locale en 30 secondes (Docker)
```bash
docker run --name avis-pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=avis_roue -p 5432:5432 -d postgres:16
# DATABASE_URL="postgresql://postgres:postgres@localhost:5432/avis_roue"
```

## Structure du projet

```
src/
├── app/
│   ├── page.js                     # Landing + mur d'avis (carrousel, avis approuvés uniquement)
│   ├── jeu/                        # Parcours client (4 étapes)
│   ├── r/[slug]/route.js           # Redirection QR dynamique + tracking + rate limit
│   ├── operation-terminee/         # Page « opération terminée » (QR désactivé)
│   ├── mentions-legales/ · reglement-jeu/ · confidentialite/
│   ├── admin/
│   │   ├── login/                  # Connexion + 2FA + inscription
│   │   └── (protected)/            # Toutes les pages protégées par session
│   │       ├── page.jsx            # Tableau de bord
│   │       ├── avis/ · clients/ · lots/ · qr-codes/ · reglages/
│   └── api/
│       ├── identify/               # POST — inscription client + e-mail de validation
│       ├── verify/                 # GET — validation e-mail client (token 30 min)
│       ├── spin/                   # GET segments · POST tirage serveur pondéré
│       ├── review/                 # POST avis · PATCH clic Google
│       └── admin/                  # register, verify-email, login, logout,
│                                   # reviews, customers (+CSV, RGPD), prizes,
│                                   # qrcodes (+ /visual : PNG/SVG/PDF), settings, stats
├── components/                     # Wheel (Canvas), ReviewWall (carrousel)
└── lib/                            # db, auth (JWT), mailer, rate-limit, utils, admin-guard
prisma/
├── schema.prisma                   # 11 modèles (voir §6 du cahier des charges)
├── migrations/                     # SQL de migration
└── seed.js                         # Admin + 6 lots + réglages + 3 QR codes démo
```

## Comptes de démonstration & seed

| Élément | Valeur |
|---|---|
| Admin | `admin@example.com` / `ChangeMe123!` (modifiable via `ADMIN_EMAIL`/`ADMIN_PASSWORD`) |
| QR démo | `/r/caisse-1`, `/r/comptoir`, `/r/operation-noel` |
| Lots | Bon d'achat 10 €, boisson offerte, réduction 20 %, gâteau offert, jackpot, « Rejouez demain ! » |

**Mode démo sans e-mail** : mettez `DEMO_MODE="true"` dans `.env` — après l'identification, le client est validé automatiquement (l'e-mail n'est pas envoyé, le lien de validation est appliqué directement). Idéal pour tester le parcours complet sans configurer Resend.

## Parcours complet à tester

1. Ouvrez `http://localhost:3000/r/caisse-1` (simule le scan) → vous arrivez sur `/jeu?src=caisse-1`
2. Remplissez le formulaire → e-mail de validation (log console en local, ou validation directe en mode démo)
3. Cliquez le lien → roue débloquée → lancez → gain + code cadeau unique
4. Déposez un avis (note, commentaire, photo) → bouton Google
5. Connectez-vous au backoffice `/admin` (code 2FA dans les logs console en local) :
   - modérez l'avis (un avis ≥ 4 étoiles est auto-publié si le réglage est à 4)
   - consultez le tableau de bord : l'inscription et l'avis apparaissent sous le QR « Caisse 1 »
   - téléchargez les visuels du QR (PNG/SVG/PDF) depuis l'onglet QR codes
6. L'avis approuvé apparaît sur le mur de la page d'accueil

> 💡 **2FA en local sans SMTP** : le code à 6 chiffres est créé en base. En mode démo ou sans fournisseur d'e-mails, consultez-le via `npx prisma studio` (table `EmailToken`, colonne `tokenHash` = SHA-256 du code) ou configurez Resend ci-dessous.

---

## Déploiement gratuit pas à pas

Architecture 100 % gratuite pour démarrer : **Vercel** (app + HTTPS) + **Neon ou Supabase** (PostgreSQL) + **Resend** (e-mails).

### Étape 1 — Pousser le code sur GitHub
```bash
cd projet_web
git init && git add -A && git commit -m "Initial commit"
# Créez un repo vide sur github.com puis :
git remote add origin https://github.com/VOTRE-COMPTE/avis-roue.git
git push -u origin main
```

### Étape 2 — Créer la base PostgreSQL (Neon ou Supabase)
1. Créez un compte sur [neon.tech](https://neon.tech) (gratuit, ~0,5 Go) **ou** [supabase.com](https://supabase.com) (gratuit, 500 Mo)
2. Créez un projet → copiez la **connection string** PostgreSQL
3. Chez Neon : `postgresql://user:pass@ep-xxx.eu-central-1.aws.neon.tech/neondb?sslmode=require`
4. Chez Supabase : Settings → Database → URI (utilisez le **pooler** port 6543 si Vercel dépasse les connexions : `?pgbouncer=true&sslmode=require`)

### Étape 3 — Connecter le repo à Vercel
1. Créez un compte sur [vercel.com](https://vercel.com) (plan Hobby gratuit) → **Add New → Project** → importez votre repo GitHub
2. Framework preset : **Next.js** (détecté automatiquement), ne touchez pas au build
3. Dans **Environment Variables**, ajoutez :

| Variable | Valeur |
|---|---|
| `DATABASE_URL` | la connection string de l'étape 2 |
| `APP_URL` | `https://votre-projet.vercel.app` |
| `JWT_SECRET` | longue chaîne aléatoire (`openssl rand -base64 48`) |
| `IP_HASH_SECRET` | autre chaîne aléatoire (`openssl rand -hex 16`) |
| `RESEND_API_KEY` | clé de l'étape 5 |
| `MAIL_FROM` | `Avis & Roue <onboarding@resend.dev>` puis votre domaine vérifié |
| `GOOGLE_REVIEW_URL` | votre lien de collecte d'avis Google |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | pour le seed de production |

4. Cliquez **Deploy** — chaque `git push` redéploiera automatiquement le site (HTTPS inclus)

### Étape 4 — Migrations + seed en production
Depuis votre machine (en pointant vers la base de prod) :
```bash
DATABASE_URL="postgresql://…neon…" npx prisma migrate deploy
DATABASE_URL="postgresql://…neon…" ADMIN_EMAIL="vous@magasin.fr" ADMIN_PASSWORD="MotDePasseFort123!" npm run seed
```

### Étape 5 — Vérifier le parcours en production
Scannez un QR téléchargé depuis le backoffice (ou ouvrez `https://votre-projet.vercel.app/r/comptoir`) → identification → e-mail de validation → roue → avis → modération backoffice. Vérifiez que l'inscription est bien comptée sous le bon QR dans le tableau de bord.

### Étape 6 — Configurer l'envoi d'e-mails (Resend)
1. Créez un compte sur [resend.com](https://resend.com) (gratuit : **100 e-mails/jour**, 3 000/mois) → créez une **API Key**
2. Pour tester, l'expéditeur `onboarding@resend.dev` fonctionne sans domaine
3. En production : ajoutez votre domaine (`Domains` → ajoutez `monsite.fr`) et configurez les enregistrements **SPF + DKIM** fournis chez votre registrar (Ovh, Gandi…) — indispensable pour éviter les spams
4. Renseignez `RESEND_API_KEY` et `MAIL_FROM="Avis & Roue <avis@monsite.fr>"` dans Vercel

**Fallback Brevo** (gratuit : 300 e-mails/jour) : remplissez `SMTP_HOST=smtp-relay.brevo.com`, `SMTP_PORT=587`, `SMTP_USER`, `SMTP_PASS`. Si Resend échoue, l'app bascule automatiquement sur SMTP. Sans aucune clé configurée, les e-mails sont loggés en console (utile en dev).

### Étape 7 — Nom de domaine personnalisé (plus tard)
1. Achetez `monsite.fr` chez un registrar
2. Vercel → votre projet → **Settings → Domains** → ajoutez `monsite.fr`
3. Suivez les instructions : enregistrements `A`/`CNAME` à créer chez le registrar
4. HTTPS est revalidé automatiquement par Vercel
5. Mettez à jour `APP_URL` (utilisée dans les QR codes et les liens d'e-mails !) puis **régénérez/téléchargez vos QR codes**

---

## Alternative : Render (gratuit)

Si vous préférez un hébergement Node « classique » :
1. [render.com](https://render.com) → **New → Web Service** → connectez GitHub
2. Build : `npm install && npx prisma generate && npm run build` — Start : `npm start`
3. Ajoutez les mêmes variables d'environnement que sur Vercel (`APP_URL=https://votre-app.onrender.com`)
4. La base Neon/Supabase reste identique

> ⚠️ **Mise en veille Render** : le plan gratuit endort le service après ~15 min d'inactivité ; le **premier visiteur attend 30–50 s** le temps du réveil. Pour un QR code en boutique c'est rédhibitoire (le client scanne et attend devant vous) — Vercel serverless n'a pas ce problème. Utilisez un **cron de ping** (UptimeRobot gratuit toutes les 5 min) si vous restez sur Render.

---

## Limites des offres gratuites & montée en gamme

| Service | Quota gratuit | Impact quand dépassé | Montée en gamme |
|---|---|---|---|
| Vercel Hobby | Bande passante 100 Go/mois, exécutions serverless | Facturation ou blocage à 100 Go | Vercel Pro (20 $/mois) |
| Neon Free | ~0,5 Go stockage, mise en veille après 5 min d'inactivité (réveil ~0,5–2 s) | Base en lecture seule à 0,5 Go | Neon Launch (19 $/mois) |
| Supabase Free | 500 Mo, pause après 1 semaine d'inactivité | Pause = site HS jusqu'à restauration manuelle | Supabase Pro (25 $/mois) |
| Resend | 100 e-mails/jour | Les validations d'e-mail échouent en fin de journée | Resend Pro (20 $/mois) |
| Brevo | 300 e-mails/jour | Idem | Plans Brevo dès ~9 $/mois |
| Render Free | Mise en veille 15 min | Réveil 30–50 s | Render Starter (7 $/mois) |

**Estimation réaliste** : avec 100 e-mails/jour (Resend) et ~30 000 lignes en base, ces quotas couvrent confortablement un commerce faisant **~80–100 participations/jour**. Au-delà (chaîne multi-boutiques), passez à Resend Pro + Neon Launch (~40 $/mois au total).

**Recommandations à fort trafic** : remplacer le rate limiter en mémoire (`src/lib/rate-limit.js`) par [Upstash Redis](https://upstash.com) (gratuit jusqu'à 10k req/jour) pour qu'il fonctionne entre les instances serverless ; déplacer les photos d'avis vers du stockage objet (Cloudinary gratuit) au lieu de la base.

---

## Sécurité & RGPD

- **Mots de passe** : bcrypt 12 rounds ; comparaison temps-constant sur `/api/admin/login`
- **Sessions** : JWT signés (HS256, `jose`) en cookies `httpOnly` + `sameSite=lax` + `secure` en production (CSRF : pas de cookies cross-site, et les routes mutantes exigent la session)
- **2FA** : TOTP (otplib) ou code e-mail 6 chiffres ; journal des connexions + audit log
- **Validation** : Zod sur toutes les entrées API ; secrets uniquement en variables d'environnement (`.env` jamais commité)
- **RGPD** : consentement horodaté (`consentAt`), IP **hashées** (HMAC-SHA256 + `IP_HASH_SECRET`), droit à l'oubli (anonymisation du client + suppression des avis/spins), export CSV, aucune donnée cédée à des tiers
- **HTTPS** : automatique sur Vercel/Render ; les cookies `secure` l'exigent en production
- **Jeu** : gratuit sans achat, tirage serveur non falsifiable par le client, probabilités publiées sur `/reglement-jeu`, stock décrémenté de façon atomique (transaction Prisma)

---

## Scripts

```bash
npm run dev              # développement (http://localhost:3000)
npm run build            # build production (prisma generate + next build)
npm start                # serve production
npm run seed             # données d'exemple
npx prisma migrate deploy   # applique les migrations (prod)
npx prisma studio        # explorateur de base de données
```
