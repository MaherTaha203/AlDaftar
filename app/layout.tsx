import type { Metadata } from 'next';
import type { ReactNode } from 'react';
// Self-hosted Arabic-first face (Royal Emerald typography stage): the exact
// weights the UI uses — regular, medium, semibold, bold. Served from our own
// origin by the bundler; no font CDN at runtime.
import '@fontsource/ibm-plex-sans-arabic/400.css';
import '@fontsource/ibm-plex-sans-arabic/500.css';
import '@fontsource/ibm-plex-sans-arabic/600.css';
import '@fontsource/ibm-plex-sans-arabic/700.css';
import '../styles/globals.css';
import '../styles/print.css';

export const metadata: Metadata = {
  title: 'Al Daftar',
};

// No-flash density init: apply the saved interface-density preset before the
// first paint so a compact/spacious layout never flashes at comfortable first.
// Static developer-authored script over a fixed localStorage key — no user data.
const DENSITY_INIT = `try{var d=localStorage.getItem('aldaftar.density');if(d==='compact'||d==='spacious'||d==='comfortable')document.documentElement.dataset.density=d;}catch(e){}`;

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <script dangerouslySetInnerHTML={{ __html: DENSITY_INIT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
