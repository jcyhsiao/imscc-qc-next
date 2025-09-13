import {ClientProviders} from '@/app/provider';
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Canvas Course QA Tool",
  description: "Upload an IMSCC 1.1 archive to perform quality checks.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>

        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
