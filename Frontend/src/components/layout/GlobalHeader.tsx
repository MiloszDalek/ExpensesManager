import { Link, NavLink, useLocation } from "react-router-dom";
import { Globe, LayoutDashboard, LogOut, Menu, ReceiptText, Shield, Users, Wallet, X } from "lucide-react";
import { useEffect, useState, type ComponentType } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

type NavItem = {
  to: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
};

export default function GlobalHeader() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!isMobileMenuOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMobileMenuOpen(false);
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMobileMenuOpen]);

  const navItems: NavItem[] = [
    { to: "/dashboard", label: t("globalHeader.navDashboard"), icon: LayoutDashboard },
    { to: "/groups", label: t("globalHeader.navGroups"), icon: Users },
    { to: "/personal", label: t("globalHeader.navPersonal"), icon: ReceiptText },
  ];

  if (user?.role === "admin") {
    navItems.push({ to: "/admin", label: t("globalHeader.navAdmin"), icon: Shield });
  }

  const homePath = user ? "/dashboard" : "/home";

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-2 px-4 md:px-8">
          <Link to={homePath} className="flex min-w-0 items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-sky-600 text-white shadow-sm">
              <Wallet className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-gray-900">{t("globalHeader.appName")}</p>
              <p className="truncate text-xs text-gray-500">{t("globalHeader.appTagline")}</p>
            </div>
          </Link>

          {user ? (
            <nav className="hidden items-center gap-1 lg:flex">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      "inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition",
                      isActive
                        ? "bg-teal-50 text-teal-700"
                        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                    )
                  }
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </nav>
          ) : null}

          <div className="flex items-center gap-2">
            <LanguageSwitcher
              compact
              showLabel={false}
              className={user ? "hidden lg:flex" : "flex"}
            />

            {user ? (
              <>
                <div className="hidden max-w-40 items-center gap-1 rounded-md bg-gray-100 px-3 py-2 text-sm text-gray-700 lg:flex">
                  <Globe className="h-3.5 w-3.5 text-gray-500" />
                  <span className="truncate">{user.username}</span>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={logout}
                  className="hidden border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 lg:inline-flex"
                >
                  <LogOut className="h-4 w-4" />
                  <span>{t("globalHeader.logout")}</span>
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden"
                  onClick={() => setIsMobileMenuOpen((previous) => !previous)}
                  aria-label={
                    isMobileMenuOpen
                      ? t("globalHeader.closeMenu")
                      : t("globalHeader.openMenu")
                  }
                  aria-expanded={isMobileMenuOpen}
                  aria-controls="mobile-header-menu"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </>
            ) : null}
          </div>
        </div>
      </header>

      {user ? (
        <>
          <div
            className={cn(
              "fixed inset-0 z-[44] bg-black/35 transition-opacity duration-300 lg:hidden",
              isMobileMenuOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
            )}
            aria-hidden="true"
          />

          <button
            type="button"
            className={cn(
              "fixed inset-0 z-[45] bg-transparent lg:hidden",
              isMobileMenuOpen ? "pointer-events-auto" : "pointer-events-none"
            )}
            onClick={() => setIsMobileMenuOpen(false)}
            aria-label={t("globalHeader.closeMenu")}
            aria-hidden={!isMobileMenuOpen}
            tabIndex={isMobileMenuOpen ? 0 : -1}
          />

          <aside
            id="mobile-header-menu"
            className={cn(
              "fixed right-0 top-0 z-50 h-screen w-[min(85vw,20rem)] border-l border-gray-200 bg-white shadow-xl transition-transform duration-300 ease-out lg:hidden",
              isMobileMenuOpen ? "translate-x-0" : "translate-x-full"
            )}
            aria-hidden={!isMobileMenuOpen}
          >
            <div className="h-full overflow-y-auto px-4 pb-4 pt-0">
              <div className="sticky top-0 z-10 -mx-4 mb-3 flex justify-end border-b border-gray-100 bg-white/95 px-4 py-3 backdrop-blur">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsMobileMenuOpen(false)}
                  aria-label={t("globalHeader.closeMenu")}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <div className="mb-3 flex items-center gap-2 rounded-md bg-gray-100 px-3 py-2 text-sm text-gray-700">
                <Globe className="h-3.5 w-3.5 text-gray-500" />
                <span className="truncate">{t("globalHeader.loggedAs", { username: user.username })}</span>
              </div>

              <div className="mb-3 flex items-center justify-between rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
                <span className="text-sm font-medium text-gray-600">{t("languageSwitcher.selectLanguage")}</span>
                <LanguageSwitcher compact showLabel={false} size="sm" />
              </div>

              <nav className="flex flex-col gap-1">
                {navItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition",
                        isActive
                          ? "bg-teal-50 text-teal-700"
                          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                      )
                    }
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </NavLink>
                ))}
              </nav>

              <Button
                variant="outline"
                size="sm"
                className="mt-3 w-full border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  logout();
                }}
              >
                <LogOut className="h-4 w-4" />
                <span>{t("globalHeader.logout")}</span>
              </Button>
            </div>
          </aside>
        </>
      ) : null}
    </>
  );
}