import { Monitor, Moon, Sun } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { type Theme, useTheme } from "@/contexts/ThemeContext";

export default function ThemeToggle() {
  const { t } = useTranslation();
  const { theme, resolvedTheme, setTheme } = useTheme();

  const icon =
    theme === "system" ? <Monitor className="h-4 w-4" /> : resolvedTheme === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />;

  return (
    <Select value={theme} onValueChange={(value) => setTheme(value as Theme)}>
      <SelectTrigger
        size="sm"
        className="px-2 text-muted-foreground hover:text-foreground"
        aria-label={t("globalHeader.theme")}
        title={t("globalHeader.theme")}
      >
        <span className="inline-flex items-center gap-2">
          {icon}
          <SelectValue />
        </span>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="light">{t("globalHeader.themeLight")}</SelectItem>
        <SelectItem value="dark">{t("globalHeader.themeDark")}</SelectItem>
        <SelectItem value="system">{t("globalHeader.themeSystem")}</SelectItem>
      </SelectContent>
    </Select>
  );
}
