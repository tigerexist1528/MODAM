import { useEffect } from "react";

export const useTooltipControl = (tooltipData, setTooltipData) => {
  useEffect(() => {
    const handleGlobalEvents = (e) => {
      // 1. 휠 클릭 (Middle Click) -> 고정 모드 토글
      if (tooltipData?.visible && e.type === "mousedown" && e.button === 1) {
        e.preventDefault(); // 기본 스크롤 방지
        setTooltipData((prev) =>
          prev ? { ...prev, isFixed: !prev.isFixed } : null
        );
        return;
      }

      // 2. 고정 모드일 때: ESC 키 or 외부 클릭 -> 닫기
      if (tooltipData?.isFixed) {
        if (e.type === "keydown" && e.key === "Escape") {
          setTooltipData(null);
        } else if (e.type === "mousedown" && e.button === 0) {
          // 툴팁 내부 클릭은 무시 (스크롤 등을 위해)
          if (e.target.closest(".rich-tooltip-container")) return;
          setTooltipData(null);
        }
      }
    };

    window.addEventListener("mousedown", handleGlobalEvents);
    window.addEventListener("keydown", handleGlobalEvents);

    // Cleanup 함수
    return () => {
      window.removeEventListener("mousedown", handleGlobalEvents);
      window.removeEventListener("keydown", handleGlobalEvents);
    };
  }, [tooltipData, setTooltipData]); // 의존성 배열 확인
};
