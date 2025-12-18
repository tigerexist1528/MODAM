import React from "react";

// -----------------------------------------------------------------------------
// 스탯 행 컴포넌트
// -----------------------------------------------------------------------------
export const StatRowWithSource = React.memo(
  ({
    label,
    val,
    sourceList,
    isPercent = false,
    color = null,
    isHighlight = false,
    onHover,
    onMove,
    onLeave,
    onClick,
  }) => {
    return (
      <div
        className={`stat-row ${isHighlight ? "highlight" : ""}`}
        style={{ cursor: "pointer", position: "relative" }}
        // Props로 전달받은 핸들러 실행
        onMouseEnter={(e) => onHover(e, sourceList, isPercent)}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        onClick={(e) => {
          e.stopPropagation();
          if (onClick) onClick(label, sourceList, isPercent);
        }}
      >
        <span>{label}</span>
        <span style={{ color: color || "inherit" }}>{val}</span>

        {/* 소스 표시 점 */}
        {sourceList && sourceList.length > 0 && (
          <div
            style={{
              position: "absolute",
              left: "-8px",
              top: "50%",
              transform: "translateY(-50%)",
              width: "3px",
              height: "3px",
              borderRadius: "50%",
              background: "#666",
            }}
          ></div>
        )}
      </div>
    );
  }
);
