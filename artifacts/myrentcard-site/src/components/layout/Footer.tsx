export function Footer() {
  return (
    <footer className="border-t border-border bg-navy py-8 px-6">
      <div className="mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-teal to-teal-light">
            <span className="text-xs font-black text-white">M</span>
          </div>
          <span className="text-sm font-black text-text-primary">MyRentCard</span>
        </div>
        <p className="text-xs text-text-muted">© 2025 MyRentCard. Built for landlords who mean business.</p>
        <div className="flex gap-5 text-xs text-text-muted">
          <a href="#" className="hover:text-text-secondary transition-colors">Privacy</a>
          <a href="#" className="hover:text-text-secondary transition-colors">Terms</a>
          <a href="mailto:hello@myrentcard.com" className="hover:text-text-secondary transition-colors">Contact</a>
        </div>
      </div>
    </footer>
  );
}
