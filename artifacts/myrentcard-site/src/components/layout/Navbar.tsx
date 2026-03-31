import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const links = [
  { label: "Features", href: "#features" },
  { label: "Analytics", href: "#analytics" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <>
      <header
        className={cn(
          "fixed top-2 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-6xl rounded-2xl transition-all duration-300",
          scrolled
            ? "bg-navy/80 backdrop-blur-xl border border-border shadow-2xl shadow-black/20"
            : "bg-transparent"
        )}
      >
        <div className="flex items-center justify-between px-5 py-3">
          {/* Logo */}
          <a href="#" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-teal to-teal-light">
              <span className="text-sm font-black text-white">M</span>
            </div>
            <span className="text-base font-black text-text-primary tracking-tight">
              MyRentCard
            </span>
          </a>

          {/* Desktop links */}
          <nav className="hidden md:flex items-center gap-1">
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="px-4 py-1.5 text-sm font-medium text-text-secondary hover:text-text-primary rounded-lg hover:bg-surface transition-all duration-150"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* CTA */}
          <div className="hidden md:block">
            <Button size="sm" asChild>
              <a href="#pricing">Get Early Access</a>
            </Button>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 text-text-secondary hover:text-text-primary"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </header>

      {/* Mobile menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="fixed top-20 left-4 right-4 z-40 rounded-2xl bg-navy-light border border-border shadow-2xl p-4"
          >
            <nav className="flex flex-col gap-1 mb-4">
              {links.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="px-4 py-3 text-sm font-medium text-text-secondary hover:text-text-primary rounded-xl hover:bg-surface transition-all"
                  onClick={() => setMenuOpen(false)}
                >
                  {link.label}
                </a>
              ))}
            </nav>
            <Button className="w-full" asChild>
              <a href="#pricing" onClick={() => setMenuOpen(false)}>
                Get Early Access
              </a>
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
