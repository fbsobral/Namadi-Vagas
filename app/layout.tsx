import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { ptBR } from "@clerk/localizations";
import "./globals.css";

const sans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const mono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const serif = Instrument_Serif({ variable: "--font-serif", subsets: ["latin"], weight: "400", style: ["normal", "italic"] });

export const metadata: Metadata = {
  title: "Namadi Vagas — o radar das suas próximas oportunidades",
  description: "Buscas personalizadas de vagas, um robô que vigia o Google por você e os contatos certos no LinkedIn quando você favorita.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f3ec" },
    { media: "(prefers-color-scheme: dark)", color: "#0f0e0c" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider
      localization={ptBR}
      appearance={{
        variables: { colorPrimary: "#e8501f", borderRadius: "0.75rem", fontFamily: "var(--font-geist-sans)" },
      }}
    >
      <html lang="pt-BR" className={`${sans.variable} ${mono.variable} ${serif.variable}`}>
        <body className="min-h-dvh">{children}</body>
      </html>
    </ClerkProvider>
  );
}
