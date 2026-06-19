import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MboaSchool Cameroun - Gestion Scolaire",
  description: "Prototype de SaaS de gestion scolaire pour les établissements d'enseignement secondaire au Cameroun.",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col bg-slate-50">
        {children}
      </body>
    </html>
  );
}
