import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Eye, EyeOff } from "lucide-react";

import { usersApi } from "@/api/usersApi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { isPasswordValid, validatePassword } from "@/utils/passwordValidation";

type ApiErrorWithDetail = {
  response?: {
    data?: {
      detail?: unknown;
    };
  };
};

export default function SettingsPage() {
  const { t } = useTranslation();
  const { user, refreshUser } = useAuth();

  const [username, setUsername] = useState(user?.username ?? "");
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  useEffect(() => {
    setUsername(user?.username ?? "");
  }, [user?.username]);

  const localizeProfileError = (message: string | null | undefined) => {
    if (!message) {
      return t("settingsPage.profileErrors.updateFailed");
    }

    const normalizedMessage = message.trim();

    if (normalizedMessage === "Username cannot be empty") {
      return t("settingsPage.profileErrors.required");
    }

    if (normalizedMessage === "Network Error") {
      return t("authPages.login.errors.networkError");
    }

    return normalizedMessage;
  };

  const localizePasswordError = (message: string | null | undefined) => {
    if (!message) {
      return t("settingsPage.passwordErrors.changeFailed");
    }

    const normalizedMessage = message.trim();

    if (normalizedMessage === "Current password is incorrect") {
      return t("settingsPage.passwordErrors.incorrectCurrent");
    }

    if (normalizedMessage === "New password must be different from the current one") {
      return t("settingsPage.passwordErrors.sameAsCurrent");
    }

    if (normalizedMessage === "Network Error") {
      return t("authPages.login.errors.networkError");
    }

    return normalizedMessage;
  };

  const handleProfileSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setProfileError(null);
    setProfileSuccess(null);

    const trimmedUsername = username.trim();
    if (!trimmedUsername) {
      setProfileError(t("settingsPage.profileErrors.required"));
      return;
    }

    setProfileLoading(true);

    try {
      await usersApi.updateMe(trimmedUsername);
      await refreshUser();
      setProfileSuccess(t("settingsPage.profileSuccess"));
    } catch (err: unknown) {
      const apiDetail =
        typeof err === "object" && err !== null
          ? (err as ApiErrorWithDetail).response?.data?.detail
          : undefined;
      const message = typeof apiDetail === "string" && apiDetail.trim()
        ? apiDetail
        : (err instanceof Error ? err.message : null);

      setProfileError(localizeProfileError(message));
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!isPasswordValid(newPassword)) {
      setPasswordError(t("settingsPage.passwordErrors.passwordComplexity"));
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError(t("settingsPage.passwordErrors.passwordsDoNotMatch"));
      return;
    }

    setPasswordLoading(true);

    try {
      await usersApi.changeMyPassword(currentPassword, newPassword);
      setPasswordSuccess(t("settingsPage.passwordSuccess"));
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      const apiDetail =
        typeof err === "object" && err !== null
          ? (err as ApiErrorWithDetail).response?.data?.detail
          : undefined;
      const message = typeof apiDetail === "string" && apiDetail.trim()
        ? apiDetail
        : (err instanceof Error ? err.message : null);

      setPasswordError(localizePasswordError(message));
    } finally {
      setPasswordLoading(false);
    }
  };

  const trimmedUsername = username.trim();
  const isProfileDisabled =
    profileLoading || !trimmedUsername || trimmedUsername === user?.username;

  const passwordValidation = validatePassword(newPassword);
  const passwordsMatch = newPassword === confirmPassword;
  const isPasswordDisabled =
    passwordLoading ||
    !currentPassword ||
    !newPassword ||
    !confirmPassword ||
    !isPasswordValid(newPassword) ||
    !passwordsMatch;

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground md:text-4xl">
            {t("settingsPage.title")}
          </h1>
          <p className="mt-2 text-muted-foreground">{t("settingsPage.subtitle")}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t("settingsPage.profileTitle")}</CardTitle>
            <CardDescription>{t("settingsPage.profileDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {profileError ? (
              <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
                {profileError}
              </div>
            ) : null}
            {profileSuccess ? (
              <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/5 p-3 text-sm text-emerald-700">
                {profileSuccess}
              </div>
            ) : null}

            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">{t("settingsPage.usernameLabel")}</label>
                <Input
                  type="text"
                  value={username}
                  onChange={(event) => {
                    setUsername(event.target.value);
                    setProfileError(null);
                  }}
                  placeholder={t("settingsPage.usernamePlaceholder")}
                  autoComplete="username"
                />
              </div>

              <Button type="submit" disabled={isProfileDisabled}>
                {profileLoading ? t("settingsPage.saveProfileLoading") : t("settingsPage.saveProfile")}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("settingsPage.passwordTitle")}</CardTitle>
            <CardDescription>{t("settingsPage.passwordDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {passwordError ? (
              <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
                {passwordError}
              </div>
            ) : null}
            {passwordSuccess ? (
              <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/5 p-3 text-sm text-emerald-700">
                {passwordSuccess}
              </div>
            ) : null}

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">{t("settingsPage.currentPasswordLabel")}</label>
                <div className="relative">
                  <Input
                    type={showCurrentPassword ? "text" : "password"}
                    value={currentPassword}
                    onChange={(event) => {
                      setCurrentPassword(event.target.value);
                      setPasswordError(null);
                    }}
                    required
                    autoComplete="current-password"
                    placeholder={t("settingsPage.currentPasswordPlaceholder")}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowCurrentPassword((previous) => !previous)}
                    aria-label={showCurrentPassword ? t("settingsPage.hidePassword") : t("settingsPage.showPassword")}
                    disabled={passwordLoading}
                  >
                    {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">{t("settingsPage.newPasswordLabel")}</label>
                <div className="relative">
                  <Input
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(event) => {
                      setNewPassword(event.target.value);
                      setPasswordError(null);
                    }}
                    required
                    autoComplete="new-password"
                    placeholder={t("settingsPage.newPasswordPlaceholder")}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowNewPassword((previous) => !previous)}
                    aria-label={showNewPassword ? t("settingsPage.hidePassword") : t("settingsPage.showPassword")}
                    disabled={passwordLoading}
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                <ul className="mt-2 space-y-1 text-xs">
                  <li className={passwordValidation.minLength ? "text-emerald-600" : "text-muted-foreground"}>
                    {t("settingsPage.passwordRules.minLength")}
                  </li>
                  <li className={passwordValidation.hasLetter ? "text-emerald-600" : "text-muted-foreground"}>
                    {t("settingsPage.passwordRules.letter")}
                  </li>
                  <li className={passwordValidation.hasDigit ? "text-emerald-600" : "text-muted-foreground"}>
                    {t("settingsPage.passwordRules.digit")}
                  </li>
                </ul>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">{t("settingsPage.confirmPasswordLabel")}</label>
                <div className="relative">
                  <Input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(event) => {
                      setConfirmPassword(event.target.value);
                      setPasswordError(null);
                    }}
                    required
                    autoComplete="new-password"
                    placeholder={t("settingsPage.confirmPasswordPlaceholder")}
                    className={!passwordsMatch && confirmPassword.length > 0 ? "border-destructive pr-10" : "pr-10"}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowConfirmPassword((previous) => !previous)}
                    aria-label={showConfirmPassword ? t("settingsPage.hidePassword") : t("settingsPage.showPassword")}
                    disabled={passwordLoading}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                {!passwordsMatch && confirmPassword.length > 0 && (
                  <p className="text-destructive text-sm mt-1">{t("settingsPage.passwordErrors.passwordsDoNotMatch")}</p>
                )}
              </div>

              <Button type="submit" disabled={isPasswordDisabled}>
                {passwordLoading ? t("settingsPage.savePasswordLoading") : t("settingsPage.savePassword")}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
