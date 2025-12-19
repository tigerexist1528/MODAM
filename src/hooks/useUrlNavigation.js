// src/hooks/useUrlNavigation.js
import { useState, useEffect } from "react";
import { getQueryParams, updateURL } from "../utils/urlHelper";

export const useUrlNavigation = (defaultMenu = "HOME") => {
  const [activeMenu, setActiveMenu] = useState(defaultMenu);

  // 1. 초기 로딩 시 URL 체크
  useEffect(() => {
    const params = getQueryParams();
    if (params.menu) {
      setActiveMenu(params.menu);
    }
  }, []);

  // 2. 뒤로가기 버튼 감지 (브라우저 -> 상태 동기화)
  useEffect(() => {
    const handlePopState = () => {
      const params = getQueryParams();
      setActiveMenu(params.menu || defaultMenu);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [defaultMenu]);

  // 3. 메뉴 이동 함수 (상태 -> URL 동기화)
  const navigateTo = (menu) => {
    if (activeMenu === menu) return;

    setActiveMenu(menu);

    // 게시판이 아니면 하위 파라미터(category, id)는 청소해주는 센스
    if (menu !== "BOARD") {
      updateURL({ menu: menu, category: null, id: null });
    } else {
      updateURL({ menu: menu });
    }
  };

  return { activeMenu, navigateTo };
};
