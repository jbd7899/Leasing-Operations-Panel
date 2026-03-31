import { useState, useEffect } from "react";

/**
 * Lightweight hash-based router.
 * Returns the route path for hashes starting with "#/" (e.g. "#/privacy" → "/privacy").
 * Returns null for section anchors (#features) or empty hash — meaning "show landing page".
 */
export function useHashRoute(): string | null {
  const parse = () => {
    const hash = window.location.hash;
    if (hash.startsWith("#/")) return hash.slice(1); // "#/privacy" → "/privacy"
    return null;
  };

  const [route, setRoute] = useState(parse);

  useEffect(() => {
    const onChange = () => {
      const next = parse();
      setRoute((prev) => {
        if (prev !== next) window.scrollTo(0, 0);
        return next;
      });
    };
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);

  return route;
}
