import type { Metadata, Viewport } from "next";
import { Manrope, Sora } from "next/font/google";
import "./globals.css";
import { ViradaProvider } from "@/providers/virada-provider";
import { AuthGate } from "@/components/AuthGate";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-sora",
  display: "swap",
});

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
  themeColor: "#133335",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${manrope.variable} ${sora.variable}`}>
        <AuthGate>
          <ViradaProvider>{children}</ViradaProvider>
        </AuthGate>
      </body>
    </html>
  );
}
