import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import fr from "./fr.json";
import ar from "./ar.json";

const lang = localStorage.getItem("lang") || "fr";

i18n.use(initReactI18next).init({
  resources: {
    fr: { translation: fr },
    ar: { translation: ar },
  },
  lng: lang,
  fallbackLng: "fr",
  interpolation: { escapeValue: false },
});

// set initial dir
document.documentElement.lang = lang;
document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";

export default i18n;
