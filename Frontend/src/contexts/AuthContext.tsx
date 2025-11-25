import { createContext, useState, useContext, useEffect } from "react";
import type { ReactNode } from "react";
import type { User, TokenResponse } from "@/types";
import * as authService from "@/api/auth";

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(
    localStorage.getItem("access_token")
  );

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      if (!accessToken) {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        const me = await authService.getCurrentUser();
        setUser(me);
      } catch {
        logout();
      } finally {
        setLoading(false);
      }
    }

    loadUser();
  }, [accessToken]);

  const login = async (email: string, password: string) => {
    const data: TokenResponse = await authService.login(email, password);
    setAccessToken(data.access_token);
    localStorage.setItem("access_token", data.access_token);
    const currentUser = await authService.getCurrentUser();
    setUser(currentUser);
  };

  const logout = () => {
    setUser(null);
    setAccessToken(null);
    localStorage.removeItem("access_token");
  };

  return (
    <AuthContext.Provider value={{ user, accessToken, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
