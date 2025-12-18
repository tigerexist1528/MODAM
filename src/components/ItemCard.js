import React from "react";

// 1. [리소스] src/data.js 에 있는 친구들 (이미지 등)
import { PLACEHOLDER_IMG } from "../data";

// 2. [유틸/함수] src/utils/data.js 에 있는 친구들 (로직)
import { GET_ITEM_ICON_LOCAL, getGradeColor } from "../utils/data";

// =========================================================
// [최적화] ItemCard 컴포넌트 분리 & Memoization
// 리스트가 아무리 길어도 렉이 걸리지 않게 만듭니다.
// =========================================================
export const ItemCard = React.memo(
  ({ item, slot, onClick, isVariant = false, colorVar = "" }) => {
    // 1. 이름 및 등급 처리
    let cleanName = item.name;
    let label = "일반";
    let borderColor = colorVar || "var(--grade-epic)";
    let bgColor = "transparent";
    const prefixIconUrl = getPrefixIconUrl(item.name);

    if (isVariant) {
      const rawGrade = item.grade || "";
      if (rawGrade.includes(":")) label = rawGrade.split(":")[1].trim();
      else if (rawGrade.includes("익시드")) label = "익시드";
      else if (rawGrade.includes("유니크")) label = "유니크";
      else if (rawGrade.includes("레어")) label = "레어";

      if (rawGrade.includes("익시드")) {
        borderColor = "var(--grade-exceed)";
        bgColor = "rgba(0, 255, 255, 0.08)";
      } else if (rawGrade.includes("유니크")) {
        borderColor = "var(--grade-unique)";
      } else if (rawGrade.includes("레어")) {
        borderColor = "var(--grade-rare)";
      }
    } else {
      cleanName = item.name.includes(":")
        ? item.name.split(":")[1].trim()
        : item.name;
      borderColor = getGradeColor(item.grade);
    }

    // 2. 렌더링 (칩 형태 vs 카드 형태)
    if (isVariant) {
      return (
        <button
          className="grade-chip"
          style={{ borderColor, color: borderColor, background: bgColor }}
          onClick={(e) => {
            e.stopPropagation();
            onClick(item);
          }}
        >
          {label}
        </button>
      );
    }

    return (
      <div className="item-card">
        <div className="card-thumb">
          <img
            src={GET_ITEM_ICON_LOCAL(item.name, slot)}
            alt=""
            onError={(e) => (e.target.src = PLACEHOLDER_IMG)}
          />
          {/* ★ [NEW] 접두사 아이콘 오버레이 */}
          {prefixIconUrl && (
            <img
              key={prefixIconUrl}
              src={prefixIconUrl}
              alt="prefix"
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                pointerEvents: "none", // 클릭 통과
                zIndex: 2, // 기본 아이콘보다 위에
              }}
              onLoad={(e) => (e.target.style.display = "block")}
              onError={(e) => (e.target.style.display = "none")} // 이미지 없으면 숨김
            />
          )}
        </div>
        <div className="card-info">
          <div className="card-set">{item.setName || "단일"}</div>
          <div className="card-name" style={{ color: borderColor }}>
            {cleanName}
          </div>
          <div className="grade-chips">{item.children}</div>
        </div>
      </div>
    );
  },
  (prev, next) => prev.item.id === next.item.id
); // ID가 같으면 리렌더링 방지
