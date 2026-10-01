import { PropsWithChildren, useEffect } from "react";
import { useThemeStore } from "./themeStore";

export function ThemeProvider({ children }: PropsWithChildren) {
  const theme = useThemeStore((state) => state.theme);

  useEffect(() => {
    const getResolvedDark = () => {
      if (theme === "dark") return true;
      if (theme === "light") return false;
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    };

    const isDark = getResolvedDark();
    document.documentElement.dataset.theme = isDark ? "dark" : "light";
    document.documentElement.classList.toggle("dark", isDark);

    if (theme === "system") {
      const media = window.matchMedia("(prefers-color-scheme: dark)");
      const listener = (e: MediaQueryListEvent) => {
        document.documentElement.dataset.theme = e.matches ? "dark" : "light";
        document.documentElement.classList.toggle("dark", e.matches);
      };
      media.addEventListener("change", listener);
      return () => {
        media.removeEventListener("change", listener);
      };
    }
    return undefined;
  }, [theme]);

  return children;
}
