import { type ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { Footer } from "@/components/layout/Footer";

export function LegalPageLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-navy flex flex-col">
      {/* Simplified header */}
      <header className="border-b border-border bg-navy/90 backdrop-blur-sm sticky top-0 z-50">
        <div className="mx-auto max-w-4xl flex items-center justify-between px-6 py-4">
          <a href="/" className="flex items-center gap-2" onClick={(e) => { e.preventDefault(); window.location.hash = ""; window.location.pathname = "/"; }}>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-teal to-teal-light">
              <span className="text-sm font-black text-white">M</span>
            </div>
            <span className="text-sm font-black text-text-primary tracking-tight">MyRentCard</span>
          </a>
          <a
            href="/"
            onClick={(e) => { e.preventDefault(); window.location.hash = ""; }}
            className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text-secondary transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </a>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 mx-auto max-w-4xl w-full px-6 py-16 md:py-20">
        {children}
      </main>

      <Footer />
    </div>
  );
}
