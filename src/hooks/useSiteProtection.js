// src/hooks/useSiteProtection.js
import { useEffect } from "react";

export const useSiteProtection = () => {
  useEffect(() => {
    const handleContextMenu = (e) => {
      // 1. 이미지 태그 보호 (저장 방지)
      if (e.target.tagName === "IMG") {
        e.preventDefault();
        return;
      }

      // 2. 링크 태그 보호 (주소 복사 방지)
      const link = e.target.closest("a");
      if (link) {
        e.preventDefault();
        return;
      }

      // 그 외(일반 텍스트, 배경)는 우클릭 허용
    };

    // 이벤트 등록
    document.addEventListener("contextmenu", handleContextMenu);

    // 뒷정리 (Unmount 시 해제)
    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
    };
  }, []);
};
