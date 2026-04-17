import type { Metadata } from "next";
import "./globals.css";
import { OverrideMapProvider } from "@/components/override-map-context";
import { ThemeProvider } from "@/components/theme-provider";
import { FullLoadingOverlay } from "@/components/full-loading-overlay";
import { SensitiveProvider } from "@/components/sensitive-provider";
import { SidebarProvider } from "@/components/sidebar-provider";

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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: FOUC_SCRIPT }} />
      </head>
      <body suppressHydrationWarning>
        <ThemeProvider>
          <SensitiveProvider>
            <SidebarProvider>
              <OverrideMapProvider>
                {children}
                <FullLoadingOverlay />
              </OverrideMapProvider>
            </SidebarProvider>
          </SensitiveProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
