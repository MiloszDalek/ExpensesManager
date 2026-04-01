import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function PolishFlag({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 16" className={className} aria-hidden="true" role="img">
      <rect width="24" height="8" fill="#FFFFFF" />
      <rect y="8" width="24" height="8" fill="#DC143C" />
      <rect width="24" height="16" fill="none" stroke="#D1D5DB" strokeWidth="1" />
    </svg>
  );
}

function UsaFlag({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 16" className={className} aria-hidden="true" role="img">
      <rect width="24" height="16" fill="#FFFFFF" />
      <rect y="0" width="24" height="1.23" fill="#B22234" />
      <rect y="2.46" width="24" height="1.23" fill="#B22234" />
      <rect y="4.92" width="24" height="1.23" fill="#B22234" />
      <rect y="7.38" width="24" height="1.23" fill="#B22234" />
      <rect y="9.84" width="24" height="1.23" fill="#B22234" />
      <rect y="12.3" width="24" height="1.23" fill="#B22234" />
      <rect y="14.76" width="24" height="1.24" fill="#B22234" />

      <rect width="10.4" height="8.62" fill="#3C3B6E" />
      <circle cx="1.4" cy="1.35" r="0.38" fill="#FFFFFF" />
      <circle cx="3.15" cy="1.35" r="0.38" fill="#FFFFFF" />
      <circle cx="4.9" cy="1.35" r="0.38" fill="#FFFFFF" />
      <circle cx="6.65" cy="1.35" r="0.38" fill="#FFFFFF" />
      <circle cx="8.4" cy="1.35" r="0.38" fill="#FFFFFF" />
      <circle cx="2.27" cy="2.55" r="0.38" fill="#FFFFFF" />
      <circle cx="4.02" cy="2.55" r="0.38" fill="#FFFFFF" />
      <circle cx="5.77" cy="2.55" r="0.38" fill="#FFFFFF" />
      <circle cx="7.52" cy="2.55" r="0.38" fill="#FFFFFF" />
      <circle cx="1.4" cy="3.75" r="0.38" fill="#FFFFFF" />
      <circle cx="3.15" cy="3.75" r="0.38" fill="#FFFFFF" />
      <circle cx="4.9" cy="3.75" r="0.38" fill="#FFFFFF" />
      <circle cx="6.65" cy="3.75" r="0.38" fill="#FFFFFF" />
      <circle cx="8.4" cy="3.75" r="0.38" fill="#FFFFFF" />
      <circle cx="2.27" cy="4.95" r="0.38" fill="#FFFFFF" />
      <circle cx="4.02" cy="4.95" r="0.38" fill="#FFFFFF" />
      <circle cx="5.77" cy="4.95" r="0.38" fill="#FFFFFF" />
      <circle cx="7.52" cy="4.95" r="0.38" fill="#FFFFFF" />
      <circle cx="1.4" cy="6.15" r="0.38" fill="#FFFFFF" />
      <circle cx="3.15" cy="6.15" r="0.38" fill="#FFFFFF" />
      <circle cx="4.9" cy="6.15" r="0.38" fill="#FFFFFF" />
      <circle cx="6.65" cy="6.15" r="0.38" fill="#FFFFFF" />
      <circle cx="8.4" cy="6.15" r="0.38" fill="#FFFFFF" />
      <circle cx="2.27" cy="7.35" r="0.38" fill="#FFFFFF" />
      <circle cx="4.02" cy="7.35" r="0.38" fill="#FFFFFF" />
      <circle cx="5.77" cy="7.35" r="0.38" fill="#FFFFFF" />
      <circle cx="7.52" cy="7.35" r="0.38" fill="#FFFFFF" />

      <rect width="24" height="16" fill="none" stroke="#D1D5DB" strokeWidth="1" />
    </svg>
  );
}

type LanguageSwitcherProps = {
  compact?: boolean;
  showLabel?: boolean;
  size?: "default" | "sm";
  className?: string;
};

export default function LanguageSwitcher({
  compact = false,
  showLabel = !compact,
  size = "default",
  className,
}: LanguageSwitcherProps) {
  const { i18n, t } = useTranslation();

  const activeLanguage: "pl" | "en" = i18n.resolvedLanguage?.startsWith("pl") ? "pl" : "en";

  const handleChange = (value: string) => {
    i18n.changeLanguage(value);
  };

  const triggerPadding = compact
    ? size === "sm"
      ? "pl-7 pr-2"
      : "pl-8 pr-2"
    : size === "sm"
      ? "px-2"
      : "px-3";

  const triggerWidth = compact
    ? size === "sm"
      ? "min-w-[84px]"
      : "min-w-[96px]"
    : size === "sm"
      ? "min-w-[112px]"
      : "min-w-[130px]";

  return (
    <div className={cn("flex items-center", size === "sm" ? "gap-1.5" : "gap-2", className)}>
      {showLabel ? (
        <label className={cn("text-muted-foreground", "text-sm")}>
          {t("languageSwitcher.selectLanguage")}
        </label>
      ) : null}

      <div className="relative">
        {compact ? (
          <span
            className={cn(
              "pointer-events-none absolute top-1/2 -translate-y-1/2",
              size === "sm" ? "left-1.5" : "left-2"
            )}
            aria-hidden="true"
          >
            {activeLanguage === "pl" ? (
              <PolishFlag className={cn(size === "sm" ? "h-3.5 w-[1.1rem]" : "h-4 w-5", "rounded-[2px]")} />
            ) : (
              <UsaFlag className={cn(size === "sm" ? "h-3.5 w-[1.1rem]" : "h-4 w-5", "rounded-[2px]")} />
            )}
          </span>
        ) : null}

        <Select value={activeLanguage} onValueChange={handleChange}>
          <SelectTrigger
            size={size}
            className={cn(
              triggerWidth,
              triggerPadding,
              "text-muted-foreground hover:text-foreground"
            )}
            aria-label={t("languageSwitcher.selectLanguage")}
            title={t("languageSwitcher.selectLanguage")}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pl">Polski</SelectItem>
            <SelectItem value="en">English</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
