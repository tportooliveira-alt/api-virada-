import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ViradaProvider } from "@/providers/virada-provider";
import { AuthGate } from "@/components/AuthGate";

export const metadata: Metadata = {
  title: "Virada App",
  description: "App mobile de gestão financeira com fluxo de caixa e planilhas estruturadas.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Virada App",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#22C55E",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>
        <AuthGate>
          <ViradaProvider>{children}</ViradaProvider>
        </AuthGate>
      </body>
    </html>
  );
}
