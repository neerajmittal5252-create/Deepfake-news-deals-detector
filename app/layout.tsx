import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'TrustCheck — AI & Bright Data Web Verification Engine',
  description:
    'Real-time authenticity, scam detection, and price verification powered by Bright Data Web Unlocker, SERP API, and Agentic LLM search tools.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="light">
      <body className="bg-white text-slate-900 min-h-screen antialiased selection:bg-rose-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
