import { lazy } from "react";

const loadDashboardPage = () => import("@/pages/DashboardPage");
const loadGroupsPage = () => import("@/pages/GroupsPage");
const loadGroupDetailPage = () => import("@/pages/GroupDetailPage");
const loadContactsPage = () => import("@/pages/ContactsPage");
const loadPersonalExpensesPage = () => import("@/pages/PersonalExpensesPage");
const loadDetailedSummaryPage = () => import("@/pages/DetailedSummaryPage");
const loadBudgetsPage = () => import("@/pages/BudgetsPage");
const loadNotificationsPage = () => import("@/pages/NotificationsPage");
const loadReceiptScannerPage = () => import("@/pages/ReceiptScannerPage");
const loadLoginPage = () => import("@/pages/LoginPage");
const loadNotFoundPage = () => import("@/pages/NotFoundPage");
const loadHomePage = () => import("@/pages/HomePage");
const loadAdminPage = () => import("@/pages/AdminPage");
const loadRegisterPage = () => import("@/pages/RegisterPage");
const loadForgotPasswordPage = () => import("@/pages/ForgotPasswordPage");
const loadResetPasswordPage = () => import("@/pages/ResetPasswordPage");
const loadActivateAccountPage = () => import("@/pages/ActivateAccountPage");
const loadSettingsPage = () => import("@/pages/SettingsPage");

export const DashboardPage = lazy(loadDashboardPage);
export const GroupsPage = lazy(loadGroupsPage);
export const GroupDetailPage = lazy(loadGroupDetailPage);
export const ContactsPage = lazy(loadContactsPage);
export const PersonalExpensesPage = lazy(loadPersonalExpensesPage);
export const DetailedSummaryPage = lazy(loadDetailedSummaryPage);
export const BudgetsPage = lazy(loadBudgetsPage);
export const NotificationsPage = lazy(loadNotificationsPage);
export const ReceiptScannerPage = lazy(loadReceiptScannerPage);
export const LoginPage = lazy(loadLoginPage);
export const NotFoundPage = lazy(loadNotFoundPage);
export const HomePage = lazy(loadHomePage);
export const AdminPage = lazy(loadAdminPage);
export const RegisterPage = lazy(loadRegisterPage);
export const ForgotPasswordPage = lazy(loadForgotPasswordPage);
export const ResetPasswordPage = lazy(loadResetPasswordPage);
export const ActivateAccountPage = lazy(loadActivateAccountPage);
export const SettingsPage = lazy(loadSettingsPage);

export const prefetchGroupsPage = () => {
  void loadGroupsPage();
};

export const prefetchPersonalExpensesPage = () => {
  void loadPersonalExpensesPage();
};

const prefetchersByPath: Record<string, () => void> = {
  "/groups": prefetchGroupsPage,
  "/personal": prefetchPersonalExpensesPage,
};

export const prefetchRouteByPath = (path: string) => {
  const prefetcher = prefetchersByPath[path];
  if (prefetcher) {
    prefetcher();
  }
};
