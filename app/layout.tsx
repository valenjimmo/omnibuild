import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Omnibuild · Your projects, connected",
  description: "A shared home for your ADU projects and client relationships.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
