import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Eye, EyeOff } from "lucide-react";

import { resetPassword } from "@/api/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { isPasswordValid, validatePassword } from "@/utils/passwordValidation";

type ApiErrorWithDetail = {
  response?: {
    data?: {
      detail?: unknown;
    };
  };
};

export default function ResetPasswordPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const token = useMemo(() => (searchParams.get("token") ?? "").trim(), [searchParams]);
  const isTokenMissing = token.length === 0;

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const localizeResetError = (message: string | null | undefined) => {
    if (!message) {
      return t("authPages.resetPassword.errors.resetFailed");
    }

    const normalizedMessage = message.trim();

    if (normalizedMessage === "Invalid or expired token") {
      return t("authPages.resetPassword.errors.invalidToken");
    }

    if (normalizedMessage === "Network Error") {
      return t("authPages.resetPassword.errors.networkError");
    }

    return normalizedMessage;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!isPasswordValid(newPassword)) {
      setError(t("authPages.resetPassword.errors.passwordComplexity"));
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(t("authPages.resetPassword.errors.passwordsDoNotMatch"));
      return;
    }

    setLoading(true);

    try {
      await resetPassword(token, newPassword);
      navigate("/login?reset=true", { replace: true });
    } catch (err: unknown) {
      const apiDetail =
        typeof err === "object" && err !== null
          ? (err as ApiErrorWithDetail).response?.data?.detail
          : undefined;
      const message = typeof apiDetail === "string" && apiDetail.trim()
        ? apiDetail
        : (err instanceof Error ? err.message : null);

      setError(localizeResetError(message));
    } finally {
      setLoading(false);
    }
  };

  const passwordValidation = validatePassword(newPassword);
  const passwordsMatch = newPassword === confirmPassword;
  const isSubmitDisabled =
    loading ||
    !newPassword ||
    !confirmPassword ||
    !passwordsMatch ||
    !isPasswordValid(newPassword);

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-8 text-card-foreground shadow-lg">
        <h1 className="text-2xl font-bold mb-2 text-center">{t("authPages.resetPassword.title")}</h1>
        <p className="mb-6 text-center text-sm text-muted-foreground">{t("authPages.resetPassword.subtitle")}</p>

        {isTokenMissing ? (
          <div className="space-y-4">
            <p className="text-destructive text-sm text-center">
              {t("authPages.resetPassword.missingToken")}
            </p>
            <Button asChild className="w-full">
              <Link to="/forgot-password">
                {t("authPages.resetPassword.requestNewLink")}
              </Link>
            </Button>
          </div>
        ) : (
          <>
            {error && (
              <p className="text-destructive text-sm mb-4 text-center">{error}</p>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">{t("authPages.resetPassword.newPasswordLabel")}</label>
                <div className="relative">
                  <Input
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(event) => {
                      setNewPassword(event.target.value);
                      setError(null);
                    }}
                    required
                    disabled={loading}
                    placeholder={t("authPages.resetPassword.newPasswordPlaceholder")}
                    className="pr-10"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowNewPassword((previous) => !previous)}
                    aria-label={showNewPassword ? t("authPages.resetPassword.hidePassword") : t("authPages.resetPassword.showPassword")}
                    disabled={loading}
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                <ul className="mt-2 space-y-1 text-xs">
                  <li className={passwordValidation.minLength ? "text-emerald-600" : "text-muted-foreground"}>
                    {t("authPages.resetPassword.passwordRules.minLength")}
                  </li>
                  <li className={passwordValidation.hasLetter ? "text-emerald-600" : "text-muted-foreground"}>
                    {t("authPages.resetPassword.passwordRules.letter")}
                  </li>
                  <li className={passwordValidation.hasDigit ? "text-emerald-600" : "text-muted-foreground"}>
                    {t("authPages.resetPassword.passwordRules.digit")}
                  </li>
                </ul>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">{t("authPages.resetPassword.confirmPasswordLabel")}</label>
                <div className="relative">
                  <Input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(event) => {
                      setConfirmPassword(event.target.value);
                      setError(null);
                    }}
                    required
                    disabled={loading}
                    placeholder={t("authPages.resetPassword.confirmPasswordPlaceholder")}
                    className={!passwordsMatch && confirmPassword.length > 0 ? "border-destructive pr-10" : "pr-10"}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowConfirmPassword((previous) => !previous)}
                    aria-label={showConfirmPassword ? t("authPages.resetPassword.hidePassword") : t("authPages.resetPassword.showPassword")}
                    disabled={loading}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                {!passwordsMatch && confirmPassword.length > 0 && (
                  <p className="text-destructive text-sm mt-1">{t("authPages.resetPassword.errors.passwordsDoNotMatch")}</p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitDisabled}>
                {loading ? t("authPages.resetPassword.submitLoading") : t("authPages.resetPassword.submit")}
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
