import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import pl from "../locales/pl.json";
import en from "../locales/en.json";

// Sprawdź, czy w localStorage jest zapisany język
const savedLang = typeof window !== "undefined" ? localStorage.getItem("appLang") : null;

void i18n
  .use(initReactI18next)
  .init({
    resources: {
      pl: { translation: pl },
      en: { translation: en },
    },
    lng: savedLang || "en", // domyślny język lub z localStorage
    fallbackLng: "pl",
    interpolation: { escapeValue: false },
  });

// Zapisuj język do localStorage przy każdej zmianie
i18n.on("languageChanged", (lng) => {
  if (typeof window !== "undefined") {
    localStorage.setItem("appLang", lng);
  }
});

export default i18n;
