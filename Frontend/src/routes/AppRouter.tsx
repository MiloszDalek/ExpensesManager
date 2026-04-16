import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { PrivateRoute } from "@/components/auth/PrivateRoute";
import { PublicRoute } from "@/components/auth/PublicRoute";
import AdminRoute from "@/components/auth/AdminRoute";
import AppLayout from "@/components/layout/AppLayout";
import {
  AdminPage,
  BudgetsPage,
  ContactsPage,
  DashboardPage,
  DetailedSummaryPage,
  GroupDetailPage,
  GroupsPage,
  HomePage,
  LoginPage,
  NotFoundPage,
  PersonalExpensesPage,
  ReceiptScannerPage,
  RegisterPage,
} from "./lazyPages";


const AppRouter = () => {
  return (
    <Router>
      <Routes>
        <Route element={<AppLayout />}>
          {/* Admin */}
          <Route path="/admin" element={<AdminRoute><AdminPage /></AdminRoute>} />

          {/* Public */}
          <Route path="/home" element={<PublicRoute><HomePage /></PublicRoute>} />
          <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />

          {/* Private */}
          <Route path="/dashboard" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
          <Route path="/groups" element={<PrivateRoute><GroupsPage /></PrivateRoute>} />
          <Route path="/groups/:id" element={<PrivateRoute><GroupDetailPage /></PrivateRoute>} />
          <Route path="/contacts" element={<PrivateRoute><ContactsPage /></PrivateRoute>} />
          <Route path="/personal" element={<PrivateRoute><PersonalExpensesPage /></PrivateRoute>} />
          <Route path="/budgets" element={<PrivateRoute><BudgetsPage /></PrivateRoute>} />
          <Route path="/recurring" element={<PrivateRoute><Navigate to="/personal" replace /></PrivateRoute>} />
          <Route path="/summaries" element={<PrivateRoute><DetailedSummaryPage /></PrivateRoute>} />
          <Route path="/receipt-scan" element={<PrivateRoute><ReceiptScannerPage /></PrivateRoute>} />

          {/* default redirect */}
          <Route path="/" element={<Navigate to="/home" replace />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </Router>
  );
};

export default AppRouter;
