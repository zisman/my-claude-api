import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SkyClub — Paragliding Club Management',
  description: 'Complete management system for paragliding clubs',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
