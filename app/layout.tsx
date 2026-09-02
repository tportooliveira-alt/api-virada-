import type { Metadata, Viewport } from "next";
import { Instrument_Serif, Barlow } from "next/font/google";
import "./globals.css";
import { ViradaProvider } from "@/providers/virada-provider";
import { AuthGate } from "@/components/AuthGate";

// Herda a craft da landing (direção "Editorial Financeiro", anti-AI-slop):
// títulos em Instrument Serif, corpo em Barlow.
const serif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-serif",
  display: "swap",
});
const sans = Barlow({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-sans",
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
  themeColor: "#0a0a0c",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${serif.variable} ${sans.variable}`}>
      <body>
        <AuthGate>
          <ViradaProvider>{children}</ViradaProvider>
        </AuthGate>
      </body>
    </html>
  );
}
