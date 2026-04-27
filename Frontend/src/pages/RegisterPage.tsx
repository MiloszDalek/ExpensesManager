import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Eye, EyeOff } from "lucide-react";
import { register } from "@/api/auth";
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

export default function RegisterPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const localizeRegisterError = (message: string | null | undefined) => {
    if (!message) {
      return t("authPages.register.errors.registrationFailed");
    }

    const normalizedMessage = message.trim();

    if (normalizedMessage.includes("at least") && normalizedMessage.includes("one letter") && normalizedMessage.includes("one digit")) {
      return t("authPages.register.errors.passwordComplexity");
    }

    if (normalizedMessage === "Network Error") {
      return t("authPages.register.errors.networkError");
    }

    return normalizedMessage;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isPasswordValid(password)) {
      setPasswordError(t("authPages.register.errors.passwordComplexity"));
      return;
    }

    if (password !== confirmPassword) {
      setPasswordError(t("authPages.register.errors.passwordsDoNotMatch"));
      return;
    }

    setPasswordError(null);
    setLoading(true);

    try {
      await register(email, username, password);
      navigate("/login?registered=true");
    } catch (err: unknown) {
      const apiDetail =
        typeof err === "object" && err !== null
          ? (err as ApiErrorWithDetail).response?.data?.detail
          : undefined;
      const message = typeof apiDetail === "string" && apiDetail.trim()
        ? apiDetail
        : (err instanceof Error ? err.message : null);

      setError(localizeRegisterError(message));
    } finally {
      setLoading(false);
    }
  };

  const passwordsMatch = password === confirmPassword;
  const passwordValidation = validatePassword(password);

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-8 text-card-foreground shadow-lg">
        <h1 className="text-2xl font-bold mb-6 text-center">{t("authPages.register.title")}</h1>

        {error && (
          <p className="text-destructive text-sm mb-4 text-center">{error}</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">

          <div>
            <label className="block text-sm font-medium mb-1">{t("authPages.register.emailLabel")}</label>
            <Input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("authPages.register.emailPlaceholder")}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">{t("authPages.register.usernameLabel")}</label>
            <Input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={t("authPages.register.usernamePlaceholder")}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">{t("authPages.register.passwordLabel")}</label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setPasswordError(null);
                }}
                placeholder={t("authPages.register.passwordPlaceholder")}
                className="pr-10"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                onClick={() => setShowPassword((previous) => !previous)}
                aria-label={showPassword ? t("authPages.register.hidePassword") : t("authPages.register.showPassword")}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            <ul className="mt-2 space-y-1 text-xs">
              <li className={passwordValidation.minLength ? "text-emerald-600" : "text-muted-foreground"}>
                {t("authPages.register.passwordRules.minLength")}
              </li>
              <li className={passwordValidation.hasLetter ? "text-emerald-600" : "text-muted-foreground"}>
                {t("authPages.register.passwordRules.letter")}
              </li>
              <li className={passwordValidation.hasDigit ? "text-emerald-600" : "text-muted-foreground"}>
                {t("authPages.register.passwordRules.digit")}
              </li>
            </ul>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">{t("authPages.register.confirmPasswordLabel")}</label>
            <div className="relative">
              <Input
                type={showConfirmPassword ? "text" : "password"}
                required
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setPasswordError(null);
                }}
                placeholder={t("authPages.register.confirmPasswordPlaceholder")}
                className={
                  !passwordsMatch && confirmPassword.length > 0
                    ? "border-destructive pr-10"
                    : "pr-10"
                }
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                onClick={() => setShowConfirmPassword((previous) => !previous)}
                aria-label={showConfirmPassword ? t("authPages.register.hidePassword") : t("authPages.register.showPassword")}
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {!passwordsMatch && confirmPassword.length > 0 && (
              <p className="text-destructive text-sm mt-1">{t("authPages.register.errors.passwordsDoNotMatch")}</p>
            )}

            {passwordError && (
              <p className="text-destructive text-sm mt-1">{passwordError}</p>
            )}
          </div>


          <Button
            type="submit"
            className="w-full"
            disabled={loading}
          >
            {loading ? t("authPages.register.submitLoading") : t("authPages.register.submit")}
          </Button>
        </form>

        <p className="text-sm text-muted-foreground mt-4 text-center">
          {t("authPages.register.alreadyHaveAccount")}{" "}
          <Link to="/login" className="text-primary hover:underline">
            {t("authPages.register.logIn")}
          </Link>
        </p>
      </div>
    </div>
  );
}
