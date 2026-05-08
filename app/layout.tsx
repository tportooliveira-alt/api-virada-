import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ViradaProvider } from "@/providers/virada-provider";
import { AuthGate } from "@/components/AuthGate";

export const metadata: Metadata = {
  title: "Codigo da Virada",
  description: "Metodo com ebook, app e planilha para organizar dinheiro, dividas, metas e renda extra.",
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
