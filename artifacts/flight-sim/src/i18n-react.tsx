import { createContext, useContext, useMemo, type ReactNode } from "react";
import { createLocalizer, type Language } from "./i18n";
const LanguageContext = createContext<Language>("de");
export function LanguageProvider({ language, children }: { language: Language; children: ReactNode }) {
  return <LanguageContext.Provider value={language}>{children}</LanguageContext.Provider>;
}
export function useLocalize() {
  const language = useContext(LanguageContext);
  return useMemo(() => createLocalizer(language), [language]);
}
