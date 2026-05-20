import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { activateAccount } from "@/api/auth";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

type ApiErrorWithDetail = {
  response?: {
    data?: {
      detail?: unknown;
    };
  };
};

type ActivationStatus = "idle" | "loading" | "success" | "error";

export default function ActivateAccountPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();

  const token = useMemo(() => (searchParams.get("token") ?? "").trim(), [searchParams]);
  const isTokenMissing = token.length === 0;

  const [status, setStatus] = useState<ActivationStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const hasRequestedRef = useRef(false);

  const localizeActivationError = (message: string | null | undefined) => {
    if (!message) {
      return t("authPages.activateAccount.errors.activationFailed");
    }

    const normalizedMessage = message.trim();

    if (normalizedMessage === "Invalid or expired token") {
      return t("authPages.activateAccount.errors.invalidToken");
    }

    if (normalizedMessage === "Network Error") {
      return t("authPages.activateAccount.errors.networkError");
    }

    return normalizedMessage;
  };

  useEffect(() => {
    if (isTokenMissing || hasRequestedRef.current) {
      return;
    }

    hasRequestedRef.current = true;
    setStatus("loading");
    setError(null);

    activateAccount(token)
      .then(() => {
        setStatus("success");
      })
      .catch((err: unknown) => {
        const apiDetail =
          typeof err === "object" && err !== null
            ? (err as ApiErrorWithDetail).response?.data?.detail
            : undefined;
        const message = typeof apiDetail === "string" && apiDetail.trim()
          ? apiDetail
          : (err instanceof Error ? err.message : null);

        setError(localizeActivationError(message));
        setStatus("error");
      });
  }, [isTokenMissing, token, t]);

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-8 text-card-foreground shadow-lg">
        <h1 className="text-2xl font-bold mb-2 text-center">{t("authPages.activateAccount.title")}</h1>
        <p className="mb-6 text-center text-sm text-muted-foreground">
          {t("authPages.activateAccount.subtitle")}
        </p>

        {isTokenMissing ? (
          <div className="space-y-4">
            <p className="text-destructive text-sm text-center">
              {t("authPages.activateAccount.missingToken")}
            </p>
            <Button asChild className="w-full">
              <Link to="/login">{t("authPages.activateAccount.goToLogin")}</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-4 text-center">
            {status === "loading" ? (
              <div className="flex flex-col items-center gap-3">
                <LoadingSpinner className="h-10 w-10" />
                <p className="text-sm text-muted-foreground">{t("authPages.activateAccount.activating")}</p>
              </div>
            ) : null}

            {status === "success" ? (
              <p className="text-emerald-600 text-sm">
                {t("authPages.activateAccount.success")}
              </p>
            ) : null}

            {status === "error" && error ? (
              <p className="text-destructive text-sm">{error}</p>
            ) : null}

            {status !== "loading" ? (
              <Button asChild className="w-full">
                <Link to="/login">{t("authPages.activateAccount.goToLogin")}</Link>
              </Button>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
