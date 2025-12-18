import React, { useState } from "react";

// 1. DB 데이터
import { SKILL_RUNE_DB, PLACEHOLDER_IMG } from "../../data";

// 2. 유틸/상수
import { IMAGE_BASE_URL, formatStatsToKor } from "../../utils/data";

const SkillRuneModal = ({
  userStats,
  close,
  backToMain,
  editBuffer,
  setEditBuffer,
  handleApply,
}) => {
  // ★ [NEW] 룬 각인용 로컬 UI 상태 (모달 열림 여부: null | 'NAME' | 'OPTION')
  const [engraveModal, setEngraveModal] = useState(null);

  const { special, general, engrave } =
    editBuffer.skillRunes || userStats.skillRunes;
  const currentSlots = editBuffer.skillRunes?.slots || Array(20).fill(null);

  // 현재 선택된 각인 정보 (없으면 빈 객체)
  const currentEngrave = engrave || { name: null, index: null };

  // --------------------------------------------------------------------------
  // [1] 데이터 가공 Helper
  // --------------------------------------------------------------------------

  // (A) 일반/특수 룬 그룹화
  const groupedGeneralRunes = {};
  const specialRunesList = [];

  // (B) ★ [NEW] 룬 각인 목록 필터링
  // 구조: { "왕의 위상": [ {index:1, stats...}, {index:2...} ], "알라시아": ... }
  const engraveMap = {};

  SKILL_RUNE_DB.forEach((rune) => {
    // 1. 각인 (Engrave)
    if (rune.type === "engrave") {
      if (!engraveMap[rune.name]) {
        engraveMap[rune.name] = [];
      }
      engraveMap[rune.name].push(rune);
    }
    // 2. 특수 룬
    else if (rune.type === "special") {
      if (!specialRunesList.find((r) => r.name === rune.name)) {
        specialRunesList.push(rune);
      }
    }
    // 3. 일반 룬
    else {
      if (!groupedGeneralRunes[rune.name]) {
        groupedGeneralRunes[rune.name] = { 3: [], 4: [] };
      }
      if (groupedGeneralRunes[rune.name][rune.level]) {
        groupedGeneralRunes[rune.name][rune.level].push(rune);
      }
    }
  });

  // 각인 데이터 정렬 (Index 오름차순 1->5)
  Object.values(engraveMap).forEach((list) =>
    list.sort((a, b) => a.index - b.index)
  );

  // 일반 룬 정렬
  Object.keys(groupedGeneralRunes).forEach((name) => {
    [3, 4].forEach((grade) => {
      groupedGeneralRunes[name][grade].sort(
        (a, b) => a.targetSkillLevel - b.targetSkillLevel
      );
    });
  });

  // --------------------------------------------------------------------------
  // [2] 핸들러 (Handler)
  // --------------------------------------------------------------------------

  // 룬 장착 헬퍼
  const getRuneCount = (name, list = currentSlots) =>
    list.filter((r) => r && r.name === name).length;

  const equipRune = (runeData, isBatch = false) => {
    let nextSlots = [...currentSlots];
    const coreName = runeData.name.replace("의 룬", "");
    let maxLimit = 99;

    if (runeData.type === "special") {
      if (coreName === "왜곡") maxLimit = 1;
      else maxLimit = 2; // 가호, 지혜
    }

    if (isBatch) {
      let currentCount = getRuneCount(runeData.name, nextSlots);
      for (let i = 0; i < nextSlots.length; i++) {
        if (currentCount >= maxLimit) break;
        if (nextSlots[i] === null) {
          nextSlots[i] = { ...runeData };
          currentCount++;
        }
      }
    } else {
      const currentCount = getRuneCount(runeData.name, nextSlots);
      if (currentCount >= maxLimit)
        return alert(
          `${runeData.name}은 최대 ${maxLimit}개까지만 장착 가능합니다.`
        );
      const emptyIdx = nextSlots.findIndex((s) => s === null);
      if (emptyIdx === -1) return alert("룬 슬롯이 가득 찼습니다. (최대 20개)");
      nextSlots[emptyIdx] = { ...runeData };
    }

    setEditBuffer((prev) => ({
      ...prev,
      skillRunes: { ...prev.skillRunes, slots: nextSlots },
    }));
  };

  const unequipRune = (idx) => {
    const nextSlots = [...currentSlots];
    nextSlots[idx] = null;
    setEditBuffer((prev) => ({
      ...prev,
      skillRunes: { ...prev.skillRunes, slots: nextSlots },
    }));
  };

  // ★ [NEW] 룬 각인 업데이트 핸들러
  const handleEngraveUpdate = (key, value) => {
    // key: 'name' or 'index'
    setEditBuffer((prev) => {
      const nextEngrave = { ...(prev.skillRunes?.engrave || {}) };

      if (key === "name") {
        nextEngrave.name = value;
        nextEngrave.index = null; // 이름 바뀌면 옵션 초기화
      } else if (key === "index") {
        nextEngrave.index = value;
      }

      return {
        ...prev,
        skillRunes: { ...prev.skillRunes, engrave: nextEngrave },
      };
    });
    setEngraveModal(null); // 선택 후 모달 닫기
  };

  // ★ [수정] 현재 옵션 텍스트 생성 (한글 스탯 변환 적용)
  const getCurrentOptionText = () => {
    if (!currentEngrave.name || !currentEngrave.index) return "옵션 선택";
    const target = engraveMap[currentEngrave.name]?.find(
      (r) => r.index === currentEngrave.index
    );

    if (target) {
      // formatStatsToKor를 사용하여 "스킬 공격력 +5%" 형태로 변환
      return (
        formatStatsToKor(target.stats) || target.notice || `${target.index}단계`
      );
    }
    return "옵션 선택";
  };

  // --------------------------------------------------------------------------
  // [3] 렌더링 (Rendering)
  // --------------------------------------------------------------------------

  // ★ [수정] 서브 모달 렌더러 (리스트 아이템 한글화)
  const renderEngraveSelector = () => {
    if (!engraveModal) return null;

    const isNameMode = engraveModal === "NAME";
    const list = isNameMode
      ? Object.keys(engraveMap)
      : engraveMap[currentEngrave.name] || [];

    return (
      <div
        className="sub-modal-overlay"
        onClick={(e) => {
          e.stopPropagation();
          setEngraveModal(null);
        }}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          background: "rgba(0,0,0,0.7)",
          zIndex: 100,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          className="sub-modal-content"
          style={{
            background: "#1a1a1a",
            border: "1px solid #444",
            borderRadius: "12px",
            width: "320px",
            maxHeight: "500px",
            overflowY: "auto",
            padding: "10px",
          }}
        >
          <h4 style={{ textAlign: "center", margin: "10px 0", color: "#fff" }}>
            {isNameMode ? "각인 선택" : "옵션 수치 선택"}
          </h4>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {list.map((item, idx) => {
              let label = "";
              let val = null;

              if (isNameMode) {
                label = item; // "왕의 위상" 등 이름
                val = item;
              } else {
                // ★ 옵션 모드일 때: 스탯을 한글로 변환하여 표시
                // item은 DB의 룬 객체 { index: 1, stats: {...} }
                const statText = formatStatsToKor(item.stats);
                label = statText || item.notice || `${item.index}단계`;
                val = item.index;
              }

              return (
                <button
                  key={idx}
                  className="bs-option-btn"
                  style={{
                    padding: "12px",
                    textAlign: "left",
                    background: "#222",
                    border: "1px solid #333",
                    color: "#ddd",
                    fontSize: "0.9rem",
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEngraveUpdate(isNameMode ? "name" : "index", val);
                  }}
                >
                  {/* 옵션 텍스트 강조 */}
                  {label}
                </button>
              );
            })}
            {list.length === 0 && (
              <div style={{ padding: 20, textAlign: "center" }}>
                선택 가능한 옵션이 없습니다.
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    // ★ 1. 모달 배경 (Overlay)
    <div className="item-picker-modal" onClick={close}>
      {/* ★ 2. 모달 컨텐츠 박스 (Centered Box) */}
      <div
        className="picker-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: "800px",
          width: "95%",
          height: "85vh",
          display: "flex",
          flexDirection: "column",
          position: "relative", // 서브 모달 배치를 위해 relative
        }}
      >
        {/* 서브 모달 렌더링 */}
        {renderEngraveSelector()}

        {/* ★ 3. 헤더 */}
        <div className="picker-header">
          <h3 style={{ margin: 0 }}>스킬룬 설정</h3>
          <button className="picker-close-btn" onClick={close}>
            ✕
          </button>
        </div>

        {/* ★ 4. 본문 */}
        <div
          className="modal-body-transition"
          style={{ flex: 1, overflowY: "auto", padding: "20px" }}
        >
          <div
            style={{ display: "flex", flexDirection: "column", height: "100%" }}
          >
            {/* 상단 안내 메시지 */}
            <div
              style={{
                textAlign: "center",
                fontSize: "0.75rem",
                color: "#888",
                marginBottom: "10px",
              }}
            >
              <span style={{ marginRight: "15px" }}>
                🖱️ 좌클릭: 장착 / 해제
              </span>
              <span style={{ color: "var(--text-gold)" }}>
                ⇧ Shift + 좌클릭: 빈 칸 모두 채우기
              </span>
            </div>

            {/* 1. 20칸 육각형 슬롯 그리드 */}
            <div className="rune-slot-container">
              {currentSlots.map((rune, idx) => {
                let imgFileName = "empty";
                let label = "";
                if (rune) {
                  const coreName = rune.name.replace("의 룬", "");
                  imgFileName = coreName;
                  if (rune.type === "special") {
                    label = `${coreName}IV`;
                  } else {
                    const gradeRoman = rune.level === 3 ? "III" : "IV";
                    label = `${coreName}${gradeRoman}[${rune.targetSkillLevel}]`;
                  }
                }
                return (
                  <div
                    key={idx}
                    className="rune-hex-wrapper"
                    onClick={() => rune && unequipRune(idx)}
                  >
                    <div
                      className={`rune-hex ${rune ? "equipped" : ""} ${
                        rune ? "grade-" + rune.level : ""
                      }`}
                    >
                      {rune && (
                        <img
                          src={`${IMAGE_BASE_URL}/runes/${imgFileName}.png`}
                          alt=""
                          onError={(e) => (e.target.src = PLACEHOLDER_IMG)}
                        />
                      )}
                    </div>
                    {rune && <div className="rune-label-mini">{label}</div>}
                  </div>
                );
              })}
            </div>

            {/* 2. 하단 선택 리스트 */}
            <div className="rune-selection-area">
              {/* ★ [NEW] 룬 각인 섹션 */}
              <div style={{ marginBottom: "25px" }}>
                <div className="rune-group-title" style={{ color: "#ffd700" }}>
                  룬 각인
                </div>
                <div style={{ display: "flex", gap: "10px" }}>
                  {/* (1) 각인 이름 선택 버튼 */}
                  <button
                    className="engrave-pill-btn"
                    onClick={() => setEngraveModal("NAME")}
                    style={{
                      flex: 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      background: "linear-gradient(180deg, #333 0%, #111 100%)",
                      border: "1px solid #555",
                      borderRadius: "30px",
                      padding: "12px",
                      color: currentEngrave.name ? "#fff" : "#888",
                      cursor: "pointer",
                      boxShadow: "0 4px 6px rgba(0,0,0,0.3)",
                    }}
                  >
                    <span style={{ fontSize: "1.2rem" }}></span>
                    <span style={{ fontWeight: "bold", fontSize: "0.95rem" }}>
                      {currentEngrave.name || "각인 선택"}
                    </span>
                  </button>

                  {/* (2) 옵션 수치 선택 버튼 */}
                  <button
                    className="engrave-pill-btn"
                    onClick={() => {
                      if (!currentEngrave.name)
                        return alert("각인을 먼저 선택해주세요.");
                      setEngraveModal("OPTION");
                    }}
                    style={{
                      flex: 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      background: "linear-gradient(180deg, #333 0%, #111 100%)",
                      border: "1px solid #555",
                      borderRadius: "30px",
                      padding: "12px",
                      color: currentEngrave.index ? "#fff" : "#888",
                      opacity: currentEngrave.name ? 1 : 0.5,
                      cursor: currentEngrave.name ? "pointer" : "not-allowed",
                      boxShadow: "0 4px 6px rgba(0,0,0,0.3)",
                    }}
                  >
                    <span style={{ fontSize: "1.2rem" }}></span>
                    <span style={{ fontWeight: "bold", fontSize: "0.95rem" }}>
                      {getCurrentOptionText()}
                    </span>
                  </button>
                </div>
              </div>

              {/* 특수 스킬룬 섹션 */}
              <div>
                <div className="rune-group-title">특수 스킬룬</div>
                <div className="rune-select-row">
                  {specialRunesList.map((sRune) => {
                    const coreName = sRune.name.replace("의 룬", "");
                    return (
                      <div
                        key={sRune.id || sRune.name}
                        className="rune-option-card"
                        onClick={(e) => equipRune({ ...sRune }, e.shiftKey)}
                      >
                        <img
                          src={`${IMAGE_BASE_URL}/runes/${coreName}.png`}
                          className="rune-opt-img"
                          alt=""
                          onError={(e) => (e.target.src = PLACEHOLDER_IMG)}
                        />
                        <span style={{ fontSize: "0.8rem", color: "#00ffff" }}>
                          {sRune.name}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 일반 스킬룬 섹션 */}
              <div style={{ marginTop: "20px" }}>
                <div className="rune-group-title">일반 스킬룬</div>
                {Object.keys(groupedGeneralRunes).map((runeName) => {
                  const coreName = runeName.replace("의 룬", "");
                  return (
                    <div
                      key={runeName}
                      style={{
                        marginBottom: "15px",
                        borderBottom: "1px solid #222",
                        paddingBottom: "10px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                          marginBottom: "5px",
                        }}
                      >
                        <img
                          src={`${IMAGE_BASE_URL}/runes/${coreName}.png`}
                          style={{ width: 30, height: 30 }}
                          alt=""
                          onError={(e) => (e.target.src = PLACEHOLDER_IMG)}
                        />
                        <span style={{ fontWeight: "bold", color: "#ddd" }}>
                          {runeName}
                        </span>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          gap: "10px",
                          flexWrap: "wrap",
                        }}
                      >
                        {[3, 4].map((grade) => {
                          const runesInGrade =
                            groupedGeneralRunes[runeName][grade];
                          if (!runesInGrade || runesInGrade.length === 0)
                            return null;
                          return (
                            <div
                              key={grade}
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: "5px",
                                background: "#222",
                                padding: "5px",
                                borderRadius: "4px",
                              }}
                            >
                              <div
                                style={{
                                  fontSize: "0.75rem",
                                  color: grade === 3 ? "#b36bff" : "#ff77ff",
                                  textAlign: "center",
                                }}
                              >
                                {grade === 3 ? "3레벨" : "4레벨"}
                              </div>
                              <div
                                style={{
                                  display: "flex",
                                  gap: "5px",
                                  flexWrap: "wrap",
                                  maxWidth: "300px",
                                }}
                              >
                                {runesInGrade.map((rune) => (
                                  <button
                                    key={
                                      rune.id ||
                                      `${runeName}-${grade}-${rune.targetSkillLevel}`
                                    }
                                    className="bs-option-btn"
                                    style={{
                                      padding: "4px 8px",
                                      fontSize: "0.75rem",
                                      minWidth: "40px",
                                    }}
                                    onClick={(e) =>
                                      equipRune({ ...rune }, e.shiftKey)
                                    }
                                  >
                                    {rune.targetSkillLevel}Lv
                                  </button>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 하단 버튼 */}
            <div className="modal-footer-btns" style={{ marginTop: "20px" }}>
              <button className="action-btn btn-cancel" onClick={backToMain}>
                취소 (ESC)
              </button>
              <button
                className="action-btn btn-reset"
                onClick={() =>
                  setEditBuffer((prev) => ({
                    ...prev,
                    skillRunes: {
                      slots: Array(20).fill(null),
                      engrave: { name: null, index: null },
                    },
                  }))
                }
              >
                초기화
              </button>
              <button className="action-btn btn-apply" onClick={handleApply}>
                적용 (Enter)
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SkillRuneModal;
