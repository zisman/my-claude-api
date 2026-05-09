import './globals.css';
import Sidebar from '../components/Sidebar';

export const metadata = {
  title: 'Marketing AI Suite',
  description: 'Professional AI-powered marketing tools — landing page analysis, ad copy, SEO, email sequences, and more.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <body className="flex h-screen overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-surface">
          {children}
        </main>
      </body>
    </html>
  );
}
