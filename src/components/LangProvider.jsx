'use client';

import { createContext, useContext } from 'react';
import { DICTS, DEFAULT_LOCALE, RTL_LOCALES } from '@/i18n/dictionaries';

// Contexte de langue pour les composants clients (reçoit la langue du layout serveur).
const LangContext = createContext({ lang: DEFAULT_LOCALE });

export function LangProvider({ lang = DEFAULT_LOCALE, children }) {
  return <LangContext.Provider value={{ lang }}>{children}</LangContext.Provider>;
}

// Hook client : t(lang-appelé depuis le contexte) — clé pointée, repli fr.
export function useT() {
  const { lang } = useContext(LangContext);
  const dict = DICTS[lang] || DICTS[DEFAULT_LOCALE];
  const dictDefault = DICTS[DEFAULT_LOCALE];
  const t = (key, vars = {}) => {
    let value = key.split('.').reduce((acc, k) => (acc && acc[k] != null ? acc[k] : undefined), dict);
    if (value == null) value = key.split('.').reduce((acc, k) => (acc && acc[k] != null ? acc[k] : undefined), dictDefault);
    if (value == null) return key;
    return String(value).replace(/\{(\w+)\}/g, (_, v) => vars[v] ?? `{${v}}`);
  };
  const isRtl = RTL_LOCALES.includes(lang);
  return { lang, t, isRtl };
}
