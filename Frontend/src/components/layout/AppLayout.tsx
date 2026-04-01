import { Outlet } from "react-router-dom";
import GlobalHeader from "./GlobalHeader";

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <GlobalHeader />
      <main className="min-h-[calc(100vh-4rem)]">
        <Outlet />
      </main>
    </div>
  );
}