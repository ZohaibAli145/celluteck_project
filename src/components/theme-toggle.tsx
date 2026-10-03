"use client";

import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

// Pure CSS icon swap + class toggle on <html>: no React state, so no hydration mismatch.
export function ThemeToggle({ className }: { className?: string }) {
  function toggle() {
    const root = document.documentElement;
    const dark = root.classList.toggle("dark");
    root.style.colorScheme = dark ? "dark" : "light";
    try {
      localStorage.setItem("theme", dark ? "dark" : "light");
    } catch {
      /* storage blocked: theme just won't persist */
    }
  }

  return (
    <Button type="button" variant="ghost" size="icon" className={className} onClick={toggle} aria-label="Toggle dark mode">
      <Sun className="hidden h-5 w-5 dark:block" />
      <Moon className="h-5 w-5 dark:hidden" />
    </Button>
  );
}
