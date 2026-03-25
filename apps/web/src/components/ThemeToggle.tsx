import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

export const ThemeToggle = () => {
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    const saved = localStorage.getItem("unilib-theme") as "light" | "dark" | null;
    return saved ?? "dark";
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const toggle = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("unilib-theme", nextTheme);
  };

  return (
    <button onClick={toggle} className="rounded-full border border-white/20 bg-white/10 p-2 text-current backdrop-blur-md">
      {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
};
