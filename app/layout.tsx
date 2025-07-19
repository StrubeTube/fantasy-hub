"use client";
import './globals.css';
import { SessionContextProvider } from '@supabase/auth-helpers-react';
import { supabase } from '../lib/supabaseClient';
import Header from '../components/Header';
import { usePathname } from 'next/navigation';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '';
  const showHeader = !pathname.startsWith('/auth');
  return (
    <html lang="en">
      <body style={{ 
        backgroundColor: '#000000',
        margin: 0, 
        padding: 0,
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
      }}>
        <SessionContextProvider supabaseClient={supabase}>
          {showHeader && <Header />}
          {children}
        </SessionContextProvider>
      </body>
    </html>
  );
}