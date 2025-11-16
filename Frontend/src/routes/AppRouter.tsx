import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import DashboardPage from "@/pages/DashboardPage";
import GroupsPage from "@/pages/GroupsPage";
import PersonalExpensesPage from "@/pages/PersonalExpensesPage";
import LoginPage from "@/pages/LoginPage";
import NotFoundPage from "@/pages/NotFoundPage";
import HomePage from "@/pages/HomePage";
import AdminPage from "@/pages/AdminPage";
import RegisterPage from "@/pages/RegisterPage";
import { PrivateRoute } from "@/components/auth/PrivateRoute";
import { PublicRoute } from "@/components/auth/PublicRoute";
import AdminRoute from "@/components/auth/AdminRoute";


const AppRouter = () => {
  return (
    <Router>
      <Routes>
        {/* Admin */}
        <Route path="/admin" element={<AdminRoute><AdminPage /></AdminRoute>} />

         {/* Public */}
        <Route path="/home" element={<PublicRoute><HomePage /></PublicRoute>} />
        <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />

        {/* Private */}
        <Route path="/dashboard" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
        <Route path="/groups" element={<PrivateRoute><GroupsPage /></PrivateRoute>} />
        <Route path="/personal" element={<PrivateRoute><PersonalExpensesPage /></PrivateRoute>} />

        {/* default redirect */}
        <Route path="/" element={<Navigate to="/home" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Router>
  );
};

export default AppRouter;
