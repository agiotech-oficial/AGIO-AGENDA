import type {Metadata} from 'next';
import './globals.css';
import { SecurityGuard } from '../components/SecurityGuard';
import { GoogleTranslateScript } from '../components/GoogleTranslateScript';

export const metadata: Metadata = {
  title: 'Ágio Agenda',
  description: 'Sistema web dinâmico e integrado.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Ágio Agenda',
    startupImage: '/segunda%20Tela.jpeg',
  },
  icons: {
    icon: '/aba-%C3%ADcon.png',
    shortcut: '/aba-%C3%ADcon.png',
    apple: '/%C3%ADcone-%C3%A1rea%20de%20trabalho.png',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="pt-br" className="dark" suppressHydrationWarning>
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Public+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
        <link rel="apple-touch-startup-image" href="/segunda%20Tela.jpeg" />
        <link rel="apple-touch-icon" href="/%C3%ADcone-%C3%A1rea%20de%20trabalho.png" />
        <link rel="icon" type="image/png" href="/aba-%C3%ADcon.png" />
        <link rel="shortcut icon" href="/aba-%C3%ADcon.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
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
