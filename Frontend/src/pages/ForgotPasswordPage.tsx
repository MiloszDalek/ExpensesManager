import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { requestPasswordReset } from "@/api/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ApiErrorWithDetail = {
  response?: {
    data?: {
      detail?: unknown;
    };
  };
};

export default function ForgotPasswordPage() {
  const { t } = useTranslation();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const localizeRequestError = (message: string | null | undefined) => {
    if (!message) {
      return t("authPages.forgotPassword.errors.requestFailed");
    }

    const normalizedMessage = message.trim();

    if (normalizedMessage === "Network Error") {
      return t("authPages.forgotPassword.errors.networkError");
    }

    return normalizedMessage;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await requestPasswordReset(email.trim());
      setSuccess(t("authPages.forgotPassword.success"));
    } catch (err: unknown) {
      const apiDetail =
        typeof err === "object" && err !== null
          ? (err as ApiErrorWithDetail).response?.data?.detail
          : undefined;
      const message = typeof apiDetail === "string" && apiDetail.trim()
        ? apiDetail
        : (err instanceof Error ? err.message : null);

      setError(localizeRequestError(message));
    } finally {
      setLoading(false);
    }
  };

  const isSubmitDisabled = loading || !email.trim();

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-8 text-card-foreground shadow-lg">
        <h1 className="text-2xl font-bold mb-2 text-center">{t("authPages.forgotPassword.title")}</h1>
        <p className="mb-6 text-center text-sm text-muted-foreground">{t("authPages.forgotPassword.subtitle")}</p>

        {error && (
          <p className="text-destructive text-sm mb-4 text-center">{error}</p>
        )}
        {success && (
          <p className="text-emerald-600 text-sm mb-4 text-center">{success}</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">{t("authPages.forgotPassword.emailLabel")}</label>
            <Input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              autoComplete="email"
              placeholder={t("authPages.forgotPassword.emailPlaceholder")}
            />
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitDisabled}>
            {loading ? t("authPages.forgotPassword.submitLoading") : t("authPages.forgotPassword.submit")}
          </Button>
        </form>

        <p className="text-sm text-muted-foreground mt-4 text-center">
          <Link to="/login" className="text-primary hover:underline">
            {t("authPages.forgotPassword.backToLogin")}
          </Link>
        </p>
      </div>
    </div>
  );
}
