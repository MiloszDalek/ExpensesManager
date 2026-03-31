import { Outlet } from "react-router-dom";
import GlobalHeader from "./GlobalHeader";

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <GlobalHeader />
      <main>
        <Outlet />
      </main>
    </div>
  );
}