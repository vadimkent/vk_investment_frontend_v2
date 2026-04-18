import type { Metadata } from "next";
import { cookies } from "next/headers";
import "./globals.css";
import { OverrideMapProvider } from "@/components/override-map-context";
import { ThemeProvider } from "@/components/theme-provider";
import { FullLoadingOverlay } from "@/components/full-loading-overlay";
import { SensitiveProvider } from "@/components/sensitive-provider";
import { SidebarProvider } from "@/components/sidebar-provider";
import { SnackbarProvider } from "@/components/snackbar-provider";

export const metadata: Metadata = {
  title: "vk-investment-frontend-v2",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-96x96.png", sizes: "96x96", type: "image/png" },
      { url: "/favicon.ico" },
    ],
  },
};

const FOUC_SCRIPT =
  '(function(){if(localStorage.getItem("theme")==="dark")document.documentElement.classList.add("dark")})()';

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const initialSidebarCollapsed =
    cookieStore.get("sidebar-collapsed")?.value === "true";

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: FOUC_SCRIPT }} />
      </head>
      <body
        className="bg-surface-primary text-content-primary min-h-screen flex flex-col"
        suppressHydrationWarning
      >
        <ThemeProvider>
          <SensitiveProvider>
            <SidebarProvider initialCollapsed={initialSidebarCollapsed}>
              <SnackbarProvider>
                <OverrideMapProvider>
                  {children}
                  <FullLoadingOverlay />
                </OverrideMapProvider>
              </SnackbarProvider>
            </SidebarProvider>
          </SensitiveProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
