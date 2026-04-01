import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await login(email, password);
      navigate("/dashboard");
    } catch (err: any) {
      setError(err.response?.data?.detail || t("authPages.login.errors.loginFailed"));
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
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder={t("authPages.login.passwordPlaceholder")}
            />
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
