import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center h-screen gap-4">
      <h1 className="text-3xl font-bold">Welcome to Expenses Manager</h1>
      <p className="text-gray-600">Track your personal and group expenses easily</p>
      <Link to="/login">
        <Button>Login</Button>
      </Link>
    </div>
  );
}
