import type {Metadata} from 'next';
import './globals.css';
import { SecurityGuard } from '../components/SecurityGuard';
import { GoogleTranslateScript } from '../components/GoogleTranslateScript';

export const metadata: Metadata = {
  title: 'Ágio Agenda',
  description: 'Sistema web dinâmico e integrado.',
  manifest: '/manifest.json',
  icons: {
    icon: '/33icon-agenda%20%C3%A1gio%20.png',
    shortcut: '/33icon-agenda%20%C3%A1gio%20.png',
    apple: '/33icon-agenda%20%C3%A1gio%20.png',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="pt-br" className="dark" suppressHydrationWarning>
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Public+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
      </head>
      <body suppressHydrationWarning className="bg-background text-on-background min-h-screen">
         <div id="google_translate_element" style={{ display: 'none' }}></div>
         <GoogleTranslateScript />
         <SecurityGuard>
           {children}
         </SecurityGuard>
      </body>
    </html>
  );
}
