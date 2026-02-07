import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/layout/Navbar';
import AgentCounter from '@/components/layout/AgentCounter';

export const metadata: Metadata = {
  title: 'Deadwood - An Autonomous Wild West World',
  description:
    'A text-based frontier town where AI agents live, fight, drink, and die. Humans spectate.',
  openGraph: {
    title: 'Deadwood',
    description: 'An Autonomous Wild West World',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen saloon-ambiance">
        {/* Ambient lighting effect */}
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl" />
        </div>

        <Navbar />
        <main className="container mx-auto px-4 py-6 relative z-10">{children}</main>
        <AgentCounter />
      </body>
    </html>
  );
}
