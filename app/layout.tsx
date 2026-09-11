import type { Metadata, Viewport } from "next";
import { Figtree, Onest } from "next/font/google";
import "./globals.css";
import { ViradaProvider } from "@/providers/virada-provider";
import { AuthGate } from "@/components/AuthGate";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";

const onest = Onest({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-onest",
  display: "swap",
});

const figtree = Figtree({
  subsets: ["latin"],
  weight: ["700", "800"],
  variable: "--font-figtree",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Código da Virada",
  description: "Método com ebook, app e planilha para organizar dinheiro, dívidas, metas e renda extra.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Virada App",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#0F172A",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${onest.variable} ${figtree.variable}`}>
        <ServiceWorkerRegister />
        <AuthGate>
          <ViradaProvider>{children}</ViradaProvider>
        </AuthGate>
      </body>
    </html>
  );
}
