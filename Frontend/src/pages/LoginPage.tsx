import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ApiErrorWithDetail = {
  response?: {
    data?: {
      detail?: unknown;
    };
  };
};

export default function LoginPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const localizeLoginError = (message: string | null | undefined) => {
    if (!message) {
      return t("authPages.login.errors.loginFailed");
    }

    const normalizedMessage = message.trim();

    if (normalizedMessage === "Inactive user" || normalizedMessage === "User not found or inactive") {
      return t("authPages.login.errors.inactiveUser");
    }

    if (normalizedMessage === "Incorect email or password" || normalizedMessage === "Incorrect email or password") {
      return t("authPages.login.errors.invalidCredentials");
    }

    return normalizedMessage;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await login(email, password);
      navigate("/dashboard");
    } catch (err: unknown) {
      const apiDetail =
        typeof err === "object" && err !== null
          ? (err as ApiErrorWithDetail).response?.data?.detail
          : undefined;
      const message = typeof apiDetail === "string" && apiDetail.trim()
        ? apiDetail
        : (err instanceof Error ? err.message : null);

      setError(localizeLoginError(message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-8 text-card-foreground shadow-lg">
        <h1 className="text-2xl font-bold mb-6 text-center">{t("authPages.login.title")}</h1>
        {error && (
          <p className="text-destructive text-sm mb-4 text-center">{error}</p>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">{t("authPages.login.emailLabel")}</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder={t("authPages.login.emailPlaceholder")}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t("authPages.login.passwordLabel")}</label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder={t("authPages.login.passwordPlaceholder")}
                className="pr-10"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                onClick={() => setShowPassword((previous) => !previous)}
                aria-label={showPassword ? t("authPages.login.hidePassword") : t("authPages.login.showPassword")}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <Button
            type="submit"
            className="w-full"
            disabled={loading}
          >
            {loading ? t("authPages.login.submitLoading") : t("authPages.login.submit")}
          </Button>
        </form>
        <p className="text-sm text-muted-foreground mt-4 text-center">
          {t("authPages.login.noAccount")} <Link to="/register" className="text-primary hover:underline">{t("authPages.login.signUp")}</Link>
        </p>
      </div>
    </div>
  );
}
