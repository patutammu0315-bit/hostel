import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Hostel Daily Count | WhatsApp Daily Count Management',
  description:
    'Production-ready WhatsApp Hostel Daily Count Management System with Supabase and Meta Cloud API.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
