import { cookies } from 'next/headers';
import { DICTS, DEFAULT_LOCALE, LOCALES, RTL_LOCALES } from './dictionaries';

export const LANG_COOKIE = 'lang';

export function isLocale(l) {
  return LOCALES.includes(l);
}

export function isRtl(l) {
  return RTL_LOCALES.includes(l);
}

// Traduction : clé pointée ("landing.heroTitle1"), repli sur le français.
export function t(lang, key, vars = {}) {
  const dict = DICTS[lang] || DICTS[DEFAULT_LOCALE];
  let value = key.split('.').reduce((acc, k) => (acc && acc[k] != null ? acc[k] : undefined), dict);
  if (value == null) value = key.split('.').reduce((acc, k) => (acc && acc[k] != null ? acc[k] : undefined), DICTS[DEFAULT_LOCALE]);
  if (value == null) return key;
  return String(value).replace(/\{(\w+)\}/g, (_, v) => vars[v] ?? `{${v}}`);
}

// Langue côté serveur : cookie > navigateur > français
export function getLangFromRequest(req) {
  const cookie = req.cookies.get(LANG_COOKIE)?.value;
  if (isLocale(cookie)) return cookie;
  const accept = req.headers.get('accept-language') || '';
  for (const part of accept.split(',')) {
    const code = part.split(';')[0].trim().slice(0, 2).toLowerCase();
    if (isLocale(code)) return code;
  }
  return DEFAULT_LOCALE;
}

// Langue côté composants serveur (App Router : cookies() de next/headers)
export function getLangFromCookies() {
  const store = cookies();
  const cookie = store.get(LANG_COOKIE)?.value;
  return isLocale(cookie) ? cookie : DEFAULT_LOCALE;
}

export function dictFor(lang) {
  return DICTS[lang] || DICTS[DEFAULT_LOCALE];
}
