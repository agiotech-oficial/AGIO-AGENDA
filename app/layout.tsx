import type {Metadata} from 'next';
import './globals.css';
import { SecurityGuard } from '../components/SecurityGuard';
import { GoogleTranslateScript } from '../components/GoogleTranslateScript';

export const metadata: Metadata = {
  title: 'AGENDA ÁGIO',
  description: 'Sistema web dinâmico e integrado.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'AGENDA ÁGIO',
    startupImage: '/segunda%20Tela.jpeg',
  },
  icons: {
    icon: '/aba-%C3%ADcone_agenda_%C3%A1gio___100.png',
    shortcut: '/aba-%C3%ADcone_agenda_%C3%A1gio___100.png',
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
        <link rel="icon" type="image/png" href="/aba-%C3%ADcone_agenda_%C3%A1gio___100.png" />
        <link rel="shortcut icon" href="/aba-%C3%ADcone_agenda_%C3%A1gio___100.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body suppressHydrationWarning className="bg-background text-on-background min-h-screen">
         <div id="google_translate_element" suppressHydrationWarning style={{ position: 'fixed', top: '-9999px', left: '-9999px', width: '1px', height: '1px', overflow: 'hidden', opacity: 0, pointerEvents: 'none' }}></div>
         <GoogleTranslateScript />
         <SecurityGuard>
           {children}
         </SecurityGuard>
      </body>
    </html>
  );
}
