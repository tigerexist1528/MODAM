import React from "react";

import { GEAR_DB } from "../data";

import {
  GET_ITEM_ICON_LOCAL,
  PLACEHOLDER_IMG,
  getGradeColor,
  formatStatsToKor,
  getPrefixIconUrl,
} from "../utils/data"; // utils/data.js 또는 data.js 경로 확인!

const RichTooltip = ({ tooltipData, activeSets }) => {
  if (!tooltipData || !tooltipData.item) return null;

  const { item, blacksmith, x, y, visible, isFixed, onlySetEffect } =
    tooltipData;

  const prefixIconUrl = getPrefixIconUrl(item.name);

  const slot = item.slot || "무기";
  const isSetEffectItem = slot.includes("세트 효과");

  // 1. 색상 결정
  let nameColor = "#fff";
  let borderColor = "#5a4b35";
  if (item.grade.includes("익시드")) {
    nameColor = "var(--grade-exceed)";
    borderColor = "var(--grade-exceed)";
  } else if (item.grade.includes("에픽")) {
    nameColor = "var(--grade-epic)";
    borderColor = "var(--grade-epic)";
  } else if (item.grade.includes("유니크")) {
    nameColor = "var(--grade-unique)";
    borderColor = "var(--grade-unique)";
  } else if (item.grade.includes("레어")) nameColor = "var(--grade-rare)";

  // 2. 세트 효과 데이터 준비
  let relatedSetEffects = [];
  if (!item.groupName && item.stats && item.stats.setCode) {
    if (!isSetEffectItem || onlySetEffect) {
      const itemPrefix = item.name.includes(":")
        ? item.name.split(":")[0].trim()
        : null;
      relatedSetEffects = GEAR_DB.filter((i) => {
        if (i.stats.setCode !== item.stats.setCode) return false;
        if (!["3세트 효과", "5세트 효과"].includes(i.slot)) return false;
        if (itemPrefix) return i.name.includes(itemPrefix);
        else return !i.name.includes(":");
      }).sort((a, b) => a.slot.localeCompare(b.slot));
    }
  }
  const hasSetTooltip = relatedSetEffects.length > 0;

  // 3. 세트 활성화 체크 로직
  const isSetActive = (targetSetItem) => {
    const allActive = [
      ...(activeSets.armor || []),
      ...(activeSets.accessory || []),
      ...(activeSets.special || []),
    ];
    let targetPrefix = null;
    if (targetSetItem.name.includes(":")) {
      targetPrefix = targetSetItem.name.split(":")[0].trim();
    }
    return allActive.some((set) => {
      const prefixMatch =
        set.prefix === targetPrefix || (!set.prefix && !targetPrefix);
      const nameMatch = targetSetItem.name.includes(set.name);
      const requiredCount = targetSetItem.slot.includes("3") ? 3 : 5;
      return prefixMatch && nameMatch && set.count >= requiredCount;
    });
  };

  // 옵션 렌더링 통합 함수
  const renderOptionLines = (stats, baseColor = null) => {
    return formatStatsToKor(stats)
      .split(", ")
      .map((line, i) => {
        if (!line || line === "옵션 없음") return null;
        let customStyle = null;
        // ... (기존 스타일 로직 그대로) ...
        if (line.includes("화속성 공격"))
          customStyle = { color: "#ff5a6a", fontWeight: "bold" };
        else if (line.includes("수속성 공격"))
          customStyle = { color: "#aaddff", fontWeight: "bold" };
        else if (line.includes("명속성 공격"))
          customStyle = { color: "#ffffaa", fontWeight: "bold" };
        else if (line.includes("암속성 공격"))
          customStyle = { color: "#aa55ff", fontWeight: "bold" };
        else if (line.includes("슈퍼아머 적용"))
          customStyle = { color: "#ffcc00", fontWeight: "bold" };

        if (customStyle) {
          if (baseColor && baseColor !== "#fff") customStyle.opacity = 0.7;
          return (
            <div key={i} className="rt-option-text" style={customStyle}>
              {line}
            </div>
          );
        }
        const parts = line.match(/(.+)([+-]\d+%?)/);
        if (parts) {
          return (
            <div key={i} className="rt-stat-row">
              <span
                className="rt-option-text"
                style={baseColor ? { color: baseColor } : {}}
              >
                {parts[1]}
              </span>
              <span
                className="rt-option-val"
                style={
                  baseColor && baseColor !== "#fff" ? { color: "#888" } : {}
                }
              >
                {parts[2]}
              </span>
            </div>
          );
        }
        return (
          <div
            key={i}
            className="rt-option-text"
            style={baseColor ? { color: baseColor } : {}}
          >
            {line}
          </div>
        );
      });
  };

  // 4. 위치 계산
  const TOOLTIP_WIDTH = 380;
  const GAP = 10;
  let mainLeft = x + 20;
  let mainTop = y + 20;
  let setLeft = onlySetEffect ? mainLeft : mainLeft + TOOLTIP_WIDTH + GAP;

  if (mainTop + 400 > window.innerHeight) mainTop = window.innerHeight - 420;

  const totalWidthNeeded = onlySetEffect
    ? TOOLTIP_WIDTH
    : TOOLTIP_WIDTH * 2 + GAP;
  if (mainLeft + totalWidthNeeded > window.innerWidth) {
    mainLeft = x - TOOLTIP_WIDTH - 20;
    if (onlySetEffect) setLeft = x - TOOLTIP_WIDTH - 20;
    else setLeft = mainLeft - TOOLTIP_WIDTH - GAP;
  }

  if (isFixed) {
    mainLeft = window.innerWidth / 2 - TOOLTIP_WIDTH / 2;
    mainTop = window.innerHeight / 2 - 200;
    if (onlySetEffect) setLeft = mainLeft;
    else {
      setLeft = mainLeft + TOOLTIP_WIDTH + GAP;
      if (setLeft + TOOLTIP_WIDTH > window.innerWidth)
        setLeft = mainLeft - TOOLTIP_WIDTH - GAP;
    }
  }

  const baseStyle = {
    position: "fixed",
    top: mainTop,
    borderColor: isFixed ? "#fff" : borderColor,
    visibility: visible ? "visible" : "hidden",
    opacity: visible ? 1 : 0,
  };

  return (
    <>
      {/* === [1] 메인 툴팁 === */}
      {!onlySetEffect && (
        <div
          className={`rich-tooltip-container ${isFixed ? "tooltip-fixed" : ""}`}
          style={{ ...baseStyle, left: mainLeft }}
        >
          <div className="rt-inner">
            <div
              style={{
                textAlign: "center",
                borderBottom: "1px solid #333",
                paddingBottom: "5px",
                marginBottom: "8px",
              }}
            >
              <span style={{ fontSize: "0.7rem", color: "#666" }}>
                {isFixed
                  ? "ESC 혹은 외부 클릭 시 닫기"
                  : "휠 클릭 시 고정 (스크롤 가능)"}
              </span>
            </div>
            <div className="rt-header">
              {!isSetEffectItem && (
                <div
                  className="rt-thumb-box"
                  style={{
                    borderColor: nameColor,
                    position: "relative", // ★ relative 필수
                  }}
                >
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
                      alt=""
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        height: "100%",
                        zIndex: 2,
                      }}
                      onLoad={(e) => (e.target.style.display = "block")}
                      onError={(e) => (e.target.style.display = "none")}
                    />
                  )}
                </div>
              )}
              <div className="rt-header-info">
                <div className="rt-name" style={{ color: nameColor }}>
                  {item.name}
                </div>
                <div className="rt-grade">
                  {item.grade} {item.slot}
                </div>
              </div>
            </div>

            {/* 대장간 옵션 */}
            {blacksmith && !isSetEffectItem && (
              <div className="rt-blacksmith-section">
                <div className="rt-section-title">대장간 옵션</div>
                {blacksmith.reinforce > 0 && (
                  <div className="rt-stat-row">
                    <span>강화</span>
                    <span className="rt-bs-val">+{blacksmith.reinforce}</span>
                  </div>
                )}
                {blacksmith.polish > 0 && (
                  <div className="rt-stat-row">
                    <span>연마</span>
                    <span className="rt-bs-val" style={{ color: "#ff77ff" }}>
                      {blacksmith.polish}단계
                    </span>
                  </div>
                )}
                {blacksmith.enchant && blacksmith.enchant !== "선택 안함" && (
                  <div className="rt-stat-row">
                    <span>마법부여</span>
                    <span className="rt-bs-val" style={{ color: "#aaddff" }}>
                      {blacksmith.enchant}
                    </span>
                  </div>
                )}
                {(blacksmith.magic_unique !== "선택 안함" ||
                  blacksmith.magic_common !== "선택 안함") && (
                  <div
                    className="rt-stat-row"
                    style={{
                      flexDirection: "column",
                      gap: "2px",
                      marginTop: "4px",
                    }}
                  >
                    <span style={{ color: "#aaa" }}>마법봉인</span>
                    {blacksmith.magic_unique !== "선택 안함" && (
                      <span
                        className="rt-bs-val"
                        style={{ fontSize: "0.8rem" }}
                      >
                        U: {blacksmith.magic_unique}
                      </span>
                    )}
                    {blacksmith.magic_common !== "선택 안함" && (
                      <span
                        className="rt-bs-val"
                        style={{ fontSize: "0.8rem" }}
                      >
                        C: {blacksmith.magic_common}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="rt-base-section">
              {renderOptionLines(item.stats)}
            </div>
            {item.notice && (
              <div
                className="rt-notice-section"
                style={{
                  marginTop: "10px",
                  paddingTop: "10px",
                  borderTop: "1px solid #444",
                  color: "#ddd",
                  fontSize: "0.85rem",
                  fontStyle: "normal",
                  lineHeight: "1.5",
                }}
              >
                {item.notice}
              </div>
            )}
          </div>
        </div>
      )}

      {/* === [2] 세트 툴팁 === */}
      {hasSetTooltip && (
        <div
          className={`rich-tooltip-container ${isFixed ? "tooltip-fixed" : ""}`}
          style={{
            ...baseStyle,
            left: setLeft,
            borderColor: "var(--text-gold)",
          }}
        >
          <div className="rt-inner">
            {onlySetEffect && (
              <div
                style={{
                  textAlign: "center",
                  borderBottom: "1px solid #333",
                  paddingBottom: "5px",
                  marginBottom: "8px",
                }}
              >
                <span style={{ fontSize: "0.7rem", color: "#666" }}>
                  {isFixed
                    ? "ESC 혹은 외부 클릭 시 닫기"
                    : "휠 클릭 시 고정 (스크롤 가능)"}
                </span>
              </div>
            )}
            <div
              className="rt-header"
              style={{
                borderBottom: "2px solid var(--text-gold)",
                paddingBottom: "8px",
              }}
            >
              <div className="rt-header-info">
                <div className="rt-name" style={{ color: "var(--text-gold)" }}>
                  {item.setName} 효과
                </div>
              </div>
            </div>
            <div className="rt-base-section">
              {relatedSetEffects.map((eff) => {
                const isActive = isSetActive(eff);
                const activeColor = isActive ? "var(--grade-exceed)" : "#666";
                const baseTextColor = isActive ? "#fff" : "#666";
                return (
                  <div key={eff.id} style={{ marginBottom: "15px" }}>
                    <div
                      style={{
                        color: activeColor,
                        fontWeight: "bold",
                        fontSize: "0.9rem",
                        marginBottom: "6px",
                        textShadow: isActive
                          ? "0 0 5px rgba(0,255,255,0.6)"
                          : "none",
                      }}
                    >
                      {eff.slot} {isActive ? "Active" : "Inactive"}
                    </div>
                    <div
                      style={{
                        paddingLeft: "8px",
                        borderLeft: `2px solid ${activeColor}`,
                      }}
                    >
                      <div
                        style={{
                          fontSize: "0.85rem",
                          marginBottom: "4px",
                          lineHeight: "1.4",
                        }}
                      >
                        {renderOptionLines(eff.stats, baseTextColor)}
                      </div>
                      {eff.notice && (
                        <div
                          style={{
                            fontSize: "0.8rem",
                            marginTop: "4px",
                            color: baseTextColor,
                          }}
                        >
                          {eff.notice}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default RichTooltip;
