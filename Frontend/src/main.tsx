import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import "@/lib/i18n";
import App from './App.tsx'
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { AuthProvider } from './contexts/AuthContext.tsx';
import { ThemeProvider } from './contexts/ThemeContext.tsx';
import logoPicture from "@/assets/logo_picture.webp";

const queryClient = new QueryClient();

const faviconLink = document.querySelector("link[rel='icon']") ?? document.createElement("link");
faviconLink.setAttribute("rel", "icon");
faviconLink.setAttribute("type", "image/webp");
faviconLink.setAttribute("href", logoPicture);
if (!faviconLink.parentElement) {
  document.head.appendChild(faviconLink);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <App />
        </AuthProvider>
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </ThemeProvider>
  </StrictMode>,
)
