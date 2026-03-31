export function Footer() {
  return (
    <footer className="border-t border-border bg-navy py-12 px-6">
      <div className="mx-auto max-w-7xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-teal to-teal-light">
            <span className="text-sm font-black text-white">M</span>
          </div>
          <span className="text-base font-black text-text-primary tracking-tight">MyRentCard</span>
        </div>
        <p className="text-sm text-text-muted text-center">
          © 2025 MyRentCard. All rights reserved. Built for landlords who mean business.
        </p>
        <div className="flex gap-6 text-sm text-text-muted">
          <a href="#" className="hover:text-text-secondary transition-colors">Privacy</a>
          <a href="#" className="hover:text-text-secondary transition-colors">Terms</a>
          <a href="mailto:hello@myrentcard.com" className="hover:text-text-secondary transition-colors">Contact</a>
        </div>
      </div>
    </footer>
  );
}
