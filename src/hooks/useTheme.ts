import { useEffect, useState } from "react";

export type Theme = "light" | "dark";

export function useTheme() {
  const [theme, setTheme] = useState<Theme>("light");
  
  useEffect(() => { 
    document.documentElement.setAttribute("data-theme", theme); 
  }, [theme]);
  
  const toggle = () => setTheme(t => (t === "dark" ? "light" : "dark"));
  
  return { theme, toggle };
}
