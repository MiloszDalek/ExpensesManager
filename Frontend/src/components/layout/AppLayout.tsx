import { Suspense } from "react";
import { Outlet } from "react-router-dom";
import GlobalHeader from "./GlobalHeader";

const RouteLoadingFallback = () => (
  <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
    <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
  </div>
);

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <GlobalHeader />
      <main className="min-h-[calc(100vh-4rem)]">
        <Suspense fallback={<RouteLoadingFallback />}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
}