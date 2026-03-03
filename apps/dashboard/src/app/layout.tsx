import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ToasterClient } from '@/components/toaster-client';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'SismovBE - Dashboard',
  description: 'Dashboard do SismovBE',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        {children}
        <ToasterClient />
      </body>
    </html>
  );
}
