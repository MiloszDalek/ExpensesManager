import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import pl from "../locales/pl.json";
import en from "../locales/en.json";

const savedLang = typeof window !== "undefined" ? localStorage.getItem("appLang") : null;

void i18n
  .use(initReactI18next)
  .init({
    resources: {
      pl: { translation: pl },
      en: { translation: en },
    },
    lng: savedLang || "en",
    fallbackLng: "pl",
    interpolation: { escapeValue: false },
  });

i18n.on("languageChanged", (lng) => {
  if (typeof window !== "undefined") {
    localStorage.setItem("appLang", lng);
  }
});

export default i18n;
