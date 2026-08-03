import { createContext, useContext, useState } from "react";
import translations from "../translations/index.js";

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(localStorage.getItem("rm_lang") || "en");
  function toggle() {
    const next = lang === "en" ? "hi" : "en";
    setLang(next);
    localStorage.setItem("rm_lang", next);
  }
  function t(key, fallback) {
    if (!key) return fallback || "";
    const parts = key.split('.');
    let v = translations[lang] || {};
    for (const p of parts) {
      if (v && Object.prototype.hasOwnProperty.call(v, p)) v = v[p];
      else {
        return fallback || key;
      }
    }
    return v;
  }

  return (
    <LanguageContext.Provider value={{ lang, toggle, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
