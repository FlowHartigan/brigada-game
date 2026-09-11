import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import "./combat-ui.css";
import "./art-direction.css";
import "./sprites/hartz-idle.css";
import "./sprites/hartz-defend.css";
import "./sprites/hartz-dodge.css";
import "./sprites/hartz-special.css";
import "./sprites/petoux-idle.css";
import "./sprites/nexmos-idle.css";
import "./sprites/kavaleur-idle.css";
import "./sprites/korsair-idle.css";
import "./sprite-fighters.css";
import "./pixel-rave.css";

export const metadata: Metadata = {
  title: "BRIGADA FIGHT",
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
