import { AlertTriangle, Info, AlertCircle, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { AttentionItem } from "@/types/dashboard";
import { cn } from "@/lib/utils";

interface AttentionSectionProps {
  items: AttentionItem[] | undefined;
  isLoading?: boolean;
}

export function AttentionSection({ items, isLoading }: AttentionSectionProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("dashboard.attention.title")}</CardTitle>
          <CardDescription>{t("dashboard.attention.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!items || items.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("dashboard.attention.title")}</CardTitle>
          <CardDescription>{t("dashboard.attention.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Info className="h-12 w-12 text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">
              {t("dashboard.attention.noItems")}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getIcon = (severity: string) => {
    if (severity === "urgent") {
      return <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />;
    }
    if (severity === "warning") {
      return <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400 flex-shrink-0" />;
    }
    return <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />;
  };

  const getSeverityVariant = (severity: string): "default" | "destructive" | "secondary" => {
    if (severity === "urgent") return "destructive";
    if (severity === "warning") return "secondary";
    return "default";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("dashboard.attention.title")}</CardTitle>
        <CardDescription>{t("dashboard.attention.priorityDescription")}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => item.action_url && navigate(item.action_url)}
              className={cn(
                "w-full flex items-start gap-3 rounded-lg border p-3 text-left transition-colors",
                item.action_url
                  ? "hover:bg-accent cursor-pointer"
                  : "cursor-default"
              )}
            >
              {getIcon(item.severity)}
              <div className="flex-1 min-w-0">
                <p className="font-medium">{item.title}</p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {item.description}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <Badge variant={getSeverityVariant(item.severity)}>
                  {item.severity}
                </Badge>
                {item.action_url && (
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
