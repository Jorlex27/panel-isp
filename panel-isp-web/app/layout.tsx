import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from 'sonner';
import { Providers } from './providers';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
    title: 'Panel ISP',
    description: 'Admin panel ISP RT/RW',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="id">
            <body className={inter.className}>
                <Providers>{children}</Providers>
                <Toaster position="top-right" richColors />
            </body>
        </html>
    );
}
