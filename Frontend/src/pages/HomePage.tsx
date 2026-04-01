import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-3xl font-bold">{t("homePage.title")}</h1>
      <p className="text-muted-foreground">{t("homePage.subtitle")}</p>
      <Link to="/login">
        <Button>{t("homePage.login")}</Button>
      </Link>
    </div>
  );
}
