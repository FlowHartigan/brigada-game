import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import "./combat-ui.css";
import "./art-direction.css";
import "./sprites/hartz-idle.css";
import "./sprites/petoux-idle.css";
import "./sprites/nexmos-idle.css";
import "./sprites/kavaleur-idle.css";
import "./sprites/korsair-idle.css";
import "./sprite-fighters.css";

export const metadata: Metadata = {
  title: "La Brigade — 0+0=FIGHT",
  description: "Mobile-first 2D fighting game by La Brigade.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#0b0b0d",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
