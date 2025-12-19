// src/hooks/useTheme.js
import { useState, useEffect } from "react";

export const useTheme = (defaultTheme = "dark") => {
  const [theme, setTheme] = useState(defaultTheme);

  // 테마 변경 시 body 클래스 조작
  useEffect(() => {
    if (theme === "light") {
      document.body.classList.add("light-mode");
    } else {
      document.body.classList.remove("light-mode");
    }
  }, [theme]);

  // 토글 함수
  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  return { theme, toggleTheme };
};
