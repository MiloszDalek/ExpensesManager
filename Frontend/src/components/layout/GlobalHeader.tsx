import { Link, NavLink, useLocation } from "react-router-dom";
import { BarChart3, ChevronDown, Globe, LayoutDashboard, LogOut, Menu, PiggyBank, ReceiptText, Shield, Users, BookUser, X } from "lucide-react";
import { useEffect, useRef, useState, type ComponentType } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import ThemeToggle from "@/components/ThemeToggle";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";
import { prefetchRouteByPath } from "@/routes/lazyPages";
import logoTextDark from "@/assets/logo_text_dark.webp";
import logoTextLight from "@/assets/logo_text_light.webp";

type NavItem = {
  to: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
};

export default function GlobalHeader() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const { resolvedTheme } = useTheme();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsUserMenuOpen(false);
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

  useEffect(() => {
    if (!isUserMenuOpen) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (!userMenuRef.current?.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsUserMenuOpen(false);
      }
    };

    window.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isUserMenuOpen]);


  const navItems: NavItem[] = [
    { to: "/dashboard", label: t("globalHeader.navDashboard"), icon: LayoutDashboard },
    { to: "/groups", label: t("globalHeader.navGroups"), icon: Users },
    { to: "/personal", label: t("globalHeader.navPersonal"), icon: ReceiptText },
    { to: "/budgets", label: t("globalHeader.navBudgets", { defaultValue: "Budgets" }), icon: PiggyBank },    
    { to: "/contacts", label: t("globalHeader.navContacts", { defaultValue: "Contacts" }), icon: BookUser },
    { to: "/summaries", label: t("globalHeader.navSummaries"), icon: BarChart3 },
  ];

  if (user?.role === "admin") {
    navItems.push({ to: "/admin", label: t("globalHeader.navAdmin"), icon: Shield });
  }

  const homePath = user ? "/dashboard" : "/home";
  const logoText = resolvedTheme === "dark" ? logoTextDark : logoTextLight;

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto w-full max-w-7xl px-4 md:px-8">
          <div className="flex h-11 items-center justify-between gap-2 border-b border-border/70 sm:h-15">
            <Link to={homePath} className="flex items-center">
              <img
                src={logoText}
                alt="TallyUp"
                className="h-9 w-auto shrink-0 object-contain sm:h-10 md:h-14.5"
              />
            </Link>

            <div className="flex items-center gap-2">
              {user ? (
                <div className="hidden lg:flex">
                  <ThemeToggle />
                </div>
              ) : null}

              <LanguageSwitcher
                compact
                showLabel={false}
                size="sm"
                className={user ? "hidden lg:flex" : "flex"}
              />

              {user ? (
                <>
                  <div className="relative hidden lg:block" ref={userMenuRef}>
                    <button
                      type="button"
                      className="flex max-w-44 items-center gap-1 rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground transition hover:bg-accent hover:text-foreground"
                      onClick={() => setIsUserMenuOpen((previous) => !previous)}
                      aria-haspopup="menu"
                      aria-expanded={isUserMenuOpen}
                      aria-label={t("globalHeader.loggedAs", { username: user.username })}
                    >
                      <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="truncate">{user.username}</span>
                      <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", isUserMenuOpen ? "rotate-180" : "rotate-0")} />
                    </button>

                    {isUserMenuOpen ? (
                      <div
                        className="absolute right-0 top-[calc(100%+0.35rem)] z-50 w-56 rounded-md border border-border bg-popover p-1 shadow-md"
                        role="menu"
                      >
                        <button
                          type="button"
                          className="flex w-full cursor-not-allowed items-center rounded-sm px-2 py-1.5 text-left text-sm text-muted-foreground/70"
                          disabled
                        >
                          {t("globalHeader.userMenuSettings", { defaultValue: "Settings (soon)" })}
                        </button>
                        <button
                          type="button"
                          className="flex w-full cursor-not-allowed items-center rounded-sm px-2 py-1.5 text-left text-sm text-muted-foreground/70"
                          disabled
                        >
                          {t("globalHeader.userMenuProfile", { defaultValue: "User info (soon)" })}
                        </button>
                        <div className="my-1 h-px bg-border" />
                        <button
                          type="button"
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            logout();
                          }}
                          className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm text-destructive transition hover:bg-destructive/10"
                        >
                          <LogOut className="h-4 w-4" />
                          <span>{t("globalHeader.logout")}</span>
                        </button>
                      </div>
                    ) : null}
                  </div>

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

          {user ? (
            <div className="hidden h-10 items-center justify-center lg:flex">
              <nav className="flex items-center gap-1">
                {navItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onMouseEnter={() => prefetchRouteByPath(item.to)}
                    onFocus={() => prefetchRouteByPath(item.to)}
                    onTouchStart={() => prefetchRouteByPath(item.to)}
                    className={({ isActive }) =>
                      cn(
                        "inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition",
                        isActive
                          ? "bg-accent text-accent-foreground"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground"
                      )
                    }
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </NavLink>
                ))}
              </nav>
            </div>
          ) : null}
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
              "fixed right-0 top-0 z-50 h-screen w-[min(85vw,20rem)] border-l border-border bg-background shadow-xl transition-transform duration-300 ease-out lg:hidden",
              isMobileMenuOpen ? "translate-x-0" : "translate-x-full"
            )}
            aria-hidden={!isMobileMenuOpen}
          >
            <div className="h-full overflow-y-auto px-4 pb-4 pt-0">
              <div className="sticky top-0 z-10 -mx-4 mb-3 flex h-13 items-center justify-end border-b border-border bg-background/95 px-4 backdrop-blur sm:h-16">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsMobileMenuOpen(false)}
                  aria-label={t("globalHeader.closeMenu")}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <div className="mb-3 flex items-center gap-2 rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
                <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="truncate">{t("globalHeader.loggedAs", { username: user.username })}</span>
              </div>

              <div className="mb-3 flex items-center justify-between rounded-md border border-border bg-card px-3 py-2">
                <span className="text-sm font-medium text-muted-foreground">{t("languageSwitcher.selectLanguage")}</span>
                <LanguageSwitcher compact showLabel={false} size="sm" />
              </div>

              <div className="mb-3 flex items-center justify-between rounded-md border border-border bg-card px-3 py-2">
                <span className="text-sm font-medium text-muted-foreground">{t("globalHeader.theme")}</span>
                <ThemeToggle />
              </div>

              <nav className="flex flex-col gap-1">
                {navItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onMouseEnter={() => prefetchRouteByPath(item.to)}
                    onFocus={() => prefetchRouteByPath(item.to)}
                    onTouchStart={() => prefetchRouteByPath(item.to)}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition",
                        isActive
                          ? "bg-accent text-accent-foreground"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground"
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
                className="mt-3 w-full border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
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