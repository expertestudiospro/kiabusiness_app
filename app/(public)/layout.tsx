import { type ReactNode } from 'react';
import Script from 'next/script';
import { Header } from '@/components/site/header';
import { Footer } from '@/components/site/footer';
import { InstallPwaPrompt } from '@/components/InstallPwaPrompt';
import { TelegramChatWidget } from '@/components/site/TelegramChatWidget';
import { CalendlyBadge } from '@/components/site/CalendlyBadge';
import { CartProvider } from '@/contexts/CartContext';
import { CartSidebar } from '@/components/cart/CartSidebar';

const RECAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <CartProvider>
      {RECAPTCHA_SITE_KEY && (
        <Script
          id="recaptcha-v3"
          src={`https://www.google.com/recaptcha/api.js?render=${RECAPTCHA_SITE_KEY}`}
          strategy="afterInteractive"
        />
      )}
      <Header />
      {children}
      <div className="h-[3px] w-full bg-gradient-to-r from-transparent via-[#D4A017] to-transparent" />
      <Footer />
      <InstallPwaPrompt variant="banner" />
      {/* Floating action buttons — bottom-right */}
      <div className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+1rem)] right-4 z-[70] flex flex-col items-center gap-3 sm:bottom-5 sm:right-5">
        <TelegramChatWidget />
      </div>
      {/* Cal.com badge — bottom-left */}
      <div className="fixed bottom-5 left-5 z-[70] hidden sm:block">
        <CalendlyBadge />
      </div>
      {/* Cart sidebar — rendered above floating buttons */}
      <CartSidebar />
    </CartProvider>
  );
}
