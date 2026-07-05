import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import '../styles/globals.css';
import '../styles/print.css';

export const metadata: Metadata = {
  title: 'Al Daftar',
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
