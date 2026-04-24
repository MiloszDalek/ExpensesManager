import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  const { t } = useTranslation();

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background px-4 py-10 text-foreground md:py-16">
      <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-8 text-center">
        <div className="space-y-3">
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
            {t("homePage.title")}
          </h1>
          <p className="mx-auto max-w-2xl text-base text-muted-foreground md:text-lg">
            {t("homePage.subtitle")}
          </p>
        </div>

        <div className="mx-auto grid w-full max-w-3xl grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-border bg-card/60 p-4 text-left">
            <p className="text-sm font-semibold">{t("globalHeader.navPersonal", { defaultValue: "Personal" })}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t("homePage.bullets.personal")}</p>
          </div>
          <div className="rounded-lg border border-border bg-card/60 p-4 text-left">
            <p className="text-sm font-semibold">{t("globalHeader.navGroups", { defaultValue: "Groups" })}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t("homePage.bullets.groups")}</p>
          </div>
          <div className="rounded-lg border border-border bg-card/60 p-4 text-left">
            <p className="text-sm font-semibold">{t("globalHeader.navBudgets", { defaultValue: "Budgets" })}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t("homePage.bullets.budgets")}</p>
          </div>
          <div className="rounded-lg border border-border bg-card/60 p-4 text-left">
            <p className="text-sm font-semibold">{t("globalHeader.navSummaries", { defaultValue: "Summaries" })}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t("homePage.bullets.summaries")}</p>
          </div>
        </div>

        <div className="flex flex-col items-center gap-3 sm:flex-row">
          <Button asChild size="lg" className="shadow-lg">
            <Link to="/register">{t("homePage.ctaRegister")}</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link to="/login">{t("homePage.ctaLogin")}</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
