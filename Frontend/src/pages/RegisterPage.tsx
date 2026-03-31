import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { register } from "@/api/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function RegisterPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setPasswordError(t("authPages.register.errors.passwordsDoNotMatch"));
      return;
    }

    setPasswordError(null);
    setLoading(true);

    try {
      await register(email, username, password);
      navigate("/login");
    } catch (err: any) {
      setError(err.response?.data?.detail || t("authPages.register.errors.registrationFailed"));
    } finally {
      setLoading(false);
    }
  };

  const passwordsMatch = password === confirmPassword;

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-gray-50 px-4 py-8">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg">
        <h1 className="text-2xl font-bold mb-6 text-center">{t("authPages.register.title")}</h1>

        {error && (
          <p className="text-red-500 text-sm mb-4 text-center">{error}</p>
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
            <Input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("authPages.register.passwordPlaceholder")}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">{t("authPages.register.confirmPasswordLabel")}</label>
            <Input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={t("authPages.register.confirmPasswordPlaceholder")}
              className={
                !passwordsMatch && confirmPassword.length > 0
                  ? "border-red-500"
                  : ""
              }
            />

            {!passwordsMatch && confirmPassword.length > 0 && (
              <p className="text-red-500 text-sm mt-1">{t("authPages.register.errors.passwordsDoNotMatch")}</p>
            )}

            {passwordError && (
              <p className="text-red-500 text-sm mt-1">{passwordError}</p>
            )}
          </div>


          <Button
            type="submit"
            className="w-full bg-purple-500 hover:bg-purple-600 text-white"
            disabled={loading}
          >
            {loading ? t("authPages.register.submitLoading") : t("authPages.register.submit")}
          </Button>
        </form>

        <p className="text-sm text-gray-500 mt-4 text-center">
          {t("authPages.register.alreadyHaveAccount")}{" "}
          <Link to="/login" className="text-purple-500 hover:underline">
            {t("authPages.register.logIn")}
          </Link>
        </p>
      </div>
    </div>
  );
}
