
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CultivaDatos",
  description: "Experimento ciudadano masivo de agricultura",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="antialiased min-h-screen bg-gray-50 text-slate-900">
        {children}
      </body>
    </html>
  );
}
