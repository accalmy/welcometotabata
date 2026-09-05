import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], display: 'swap', variable: '--font-inter' });

export const metadata = {
  title: 'Welcome to Tabata — Timer sport & méditation',
  description:
    'Timer Tabata, intervalles, gongs à la minute et méditation guidée par ambiances naturelles. Sans compte, sans pub, utilisable en silence.',
  applicationName: 'Welcome to Tabata',
};

export const viewport = {
  themeColor: '#05060a',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr" className={inter.variable}>
      <body className="min-h-full font-sans antialiased">
        <div className="aurora" />
        {children}
      </body>
    </html>
  );
}
