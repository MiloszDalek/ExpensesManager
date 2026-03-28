import { useTranslation } from "react-i18next";

export default function LanguageSwitcher() {
  const { i18n, t } = useTranslation();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    i18n.changeLanguage(e.target.value);
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <label htmlFor="lang-select">{t("ui.selectLanguage")}: </label>
      <select id="lang-select" value={i18n.language} onChange={handleChange}>
        <option value="pl">Polski</option>
        <option value="en">English</option>
      </select>
    </div>
  );
}
