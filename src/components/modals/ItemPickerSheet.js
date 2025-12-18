import React, { useEffect } from "react";

// 1. DB 데이터 (src/data.js)
import {
  WEAPON_DB,
  GEAR_DB,
  SKILL_RUNE_DB, // 룬 DB
  RUNE_CONSTANTS, // 룬 상수
} from "../../data";

// 2. 유틸/상수 (src/utils/data.js)
import {
  IMAGE_BASE_URL,
  GET_ITEM_ICON_LOCAL,
  PLACEHOLDER_IMG,
  WEAPON_TYPES,
  EXCEED_SLOTS,
  getGradeColor,
  getGroupedItems,
  getSpecialSets,
  getSetOptionSummary,
} from "../../utils/data";

const ItemPickerSheet = ({
  // --- Props ---
  activeModal,
  close,
  userStats,
  setUserStats, // 직접 수정이 필요한 경우 (장착 해제 등)
  handleGearUpdate, // 장비 교체 핸들러
  setUnequipTarget, // 장착 해제 확인창 띄우기

  // 필터링 상태들 (App.js에서 관리)
  weaponFilter,
  setWeaponFilter,
  specialPickerStep,
  setSpecialPickerStep,
  selectedSpecialSet,
  setSelectedSpecialSet,

  // 툴팁 관련
  handleItemMouseEnter,
  handleItemMouseLeave,

  // 룬/대장간 임시 저장소
  editBuffer,
  setEditBuffer,
  updateStat, // App.js의 updateStat (룬 설정 시 필요)
}) => {
  const { type, slot } = activeModal;

  // ★★★ [NEW] 무기 선택창이 열릴 때, 필터가 없으면 '첫 번째 무기' 자동 선택 ★★★
  useEffect(() => {
    // 1. 현재 열린 창이 '무기 선택창'인지 확인
    if (type === "GEAR_PICKER" && slot === "무기") {
      // 2. 내 직업군(baseJob)에 해당하는 무기 목록 가져오기
      // (예: 마법사 -> [창, 봉, 로드, 스태프, 빗자루])
      const myBaseJob = userStats.character.baseJob;
      const availableTypes = WEAPON_TYPES[myBaseJob] || [];

      // 3. 현재 선택된 필터가 없고, 선택 가능한 무기가 있다면 -> 첫 번째 녀석을 강제 선택!
      if (!weaponFilter && availableTypes.length > 0) {
        setWeaponFilter(availableTypes[0]);
      }
    }
  }, [type, slot, userStats.character.baseJob, weaponFilter, setWeaponFilter]);

  // ---------------------------------------------------------
  // 1. 일반 장비 선택 (GEAR_PICKER)
  // ---------------------------------------------------------
  if (type === "GEAR_PICKER") {
    const isWeapon = slot === "무기";
    const targetDB = isWeapon ? WEAPON_DB : GEAR_DB;
    const groups = getGroupedItems(
      targetDB,
      slot,
      isWeapon ? weaponFilter : null
    );
    const isCurrentlyEquipped = userStats.equipment[slot].itemId !== 0;
    const REMOVABLE_PREFIXES = [
      "작열",
      "침식",
      "전격",
      "허상",
      "왜곡",
      "맹독",
      "신속",
      "연격",
      "쇄도",
      "보호",
      "자상",
      "수호",
    ];

    return (
      <div className="bottom-sheet-overlay" onClick={close}>
        <div className="bottom-sheet" onClick={(e) => e.stopPropagation()}>
          <div className="sheet-header">
            <span className="sheet-title">{slot}</span>
            <div
              style={{
                marginLeft: "auto",
                display: "flex",
                alignItems: "center",
                gap: "15px",
              }}
            >
              {isCurrentlyEquipped && (
                <button
                  onClick={() => setUnequipTarget(slot)}
                  style={{
                    background: "#2a1515",
                    border: "1px solid #5a2525",
                    color: "#ff6b6b",
                    padding: "6px 12px",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontWeight: "bold",
                    fontSize: "0.85rem",
                  }}
                >
                  장착 해제
                </button>
              )}
              <button className="sheet-close" onClick={close}>
                ✕
              </button>
            </div>
          </div>

          <div className="sheet-body">
            {isWeapon && (
              <div className="weapon-tab-container">
                {(WEAPON_TYPES[userStats.character.baseJob] || []).map(
                  (type) => (
                    <button
                      key={type}
                      className={`weapon-tab-btn ${
                        weaponFilter === type ? "active" : ""
                      }`}
                      onClick={() => setWeaponFilter(type)}
                    >
                      {type}
                    </button>
                  )
                )}
              </div>
            )}

            <div className="card-grid">
              {groups
                // ★★★ [필터링 로직 추가] 내 직업 장비만 보여주기 ★★★
                .filter(({ baseItem }) => {
                  if (isWeapon) {
                    const mySubJob = userStats.character.subJob; // 예: "배틀메이지"

                    // 1. 직업 전용 무기 필터링
                    // (아이템에 직업이 써있는데, '공용'도 아니고 '내 직업'도 아니면 숨김)
                    if (
                      baseItem.job &&
                      baseItem.job !== "공용" &&
                      baseItem.job !== mySubJob
                    ) {
                      return false;
                    }

                    // 2. (선택사항) '광검' 같은 특정 무기 타입 필터링
                    // 만약 'WEAPON_TYPES' 데이터 구조가 직업별 착용 가능 무기를 완벽히 정의하고 있다면
                    // 여기서 type 체크를 추가할 수도 있습니다.
                    // 현재는 DB의 'job' 필드를 믿고 필터링하는 것이 가장 안전합니다.
                  }
                  return true; // 통과
                })
                .map(({ baseItem, variants }) => {
                  // ... (기존 렌더링 코드 유지) ...
                  let cleanName = baseItem.name;
                  if (!isWeapon) {
                    // ... (기존 코드) ...
                  }

                  return (
                    <div key={baseItem.id} className="item-card">
                      <div className="card-thumb">
                        <img
                          src={GET_ITEM_ICON_LOCAL(baseItem.name, slot)}
                          alt=""
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = PLACEHOLDER_IMG;
                          }}
                        />
                      </div>
                      <div className="card-info">
                        <div className="card-set">
                          {baseItem.setName || "단일"}
                        </div>
                        <div
                          className="card-name"
                          style={{ color: getGradeColor(baseItem.grade) }}
                        >
                          {cleanName}
                        </div>
                        <div className="grade-chips">
                          {variants.map((v) => {
                            const rawGrade = v.grade || "";
                            let label = "일반";
                            if (rawGrade.includes(":"))
                              label = rawGrade.split(":")[1].trim();
                            else if (rawGrade.includes("익시드"))
                              label = "익시드";
                            else if (rawGrade.includes("유니크"))
                              label = "유니크";
                            else if (rawGrade.includes("레어")) label = "레어";

                            let colorVar = "var(--grade-epic)";
                            let bgStyle = "transparent";
                            if (rawGrade.includes("익시드")) {
                              colorVar = "var(--grade-exceed)";
                              bgStyle = "rgba(0, 255, 255, 0.08)";
                            } else if (rawGrade.includes("유니크"))
                              colorVar = "var(--grade-unique)";
                            else if (rawGrade.includes("레어"))
                              colorVar = "var(--grade-rare)";

                            return (
                              <button
                                key={v.id}
                                className="grade-chip"
                                style={{
                                  borderColor: colorVar,
                                  color: colorVar,
                                  background: bgStyle,
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleItemMouseLeave();
                                  if (isWeapon)
                                    updateStat(
                                      "character",
                                      "weaponType",
                                      weaponFilter
                                    );
                                  handleGearUpdate(slot, v.id);
                                  close();
                                }}
                                onMouseEnter={(e) =>
                                  handleItemMouseEnter(v, e, null)
                                }
                                onMouseLeave={handleItemMouseLeave}
                              >
                                {label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
            {groups.length === 0 && (
              <div style={{ padding: 40, textAlign: "center", color: "#666" }}>
                해당 타입의 아이템이 없습니다.
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------
  // 2. 특수 장비 선택 (SPECIAL_PICKER)
  // ---------------------------------------------------------
  if (type === "SPECIAL_PICKER") {
    const sets = getSpecialSets(GEAR_DB, slot);
    const isCurrentlyEquipped = userStats.equipment[slot].itemId !== 0;

    return (
      <div className="bottom-sheet-overlay" onClick={close}>
        <div className="bottom-sheet" onClick={(e) => e.stopPropagation()}>
          <div className="sheet-header">
            <span className="sheet-title">
              {specialPickerStep === 0
                ? `${slot} 선택`
                : `${selectedSpecialSet?.setName || slot}`}
            </span>
            <div
              style={{
                marginLeft: "auto",
                display: "flex",
                alignItems: "center",
                gap: "15px",
              }}
            >
              {specialPickerStep === 1 && (
                <button
                  onClick={() => setSpecialPickerStep(0)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#aaa",
                    cursor: "pointer",
                    fontSize: "1.2rem",
                    marginRight: "10px",
                  }}
                >
                  ⬅
                </button>
              )}
              {isCurrentlyEquipped && (
                <button
                  onClick={() => setUnequipTarget(slot)}
                  style={{
                    background: "#2a1515",
                    border: "1px solid #5a2525",
                    color: "#ff6b6b",
                    padding: "6px 12px",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontWeight: "bold",
                    fontSize: "0.85rem",
                  }}
                >
                  해제
                </button>
              )}
              <button className="sheet-close" onClick={close}>
                ✕
              </button>
            </div>
          </div>

          <div className="sheet-body">
            {specialPickerStep === 0 ? (
              <div className="card-grid">
                {sets.map((set) => {
                  const sortedItems = [...set.items].sort(
                    (a, b) =>
                      (b.stats?.itemCode1 || 0) - (a.stats?.itemCode1 || 0) ||
                      b.id - a.id
                  );
                  const repItem = sortedItems[0];
                  const summary = getSetOptionSummary(repItem.stats);
                  const optionColor = summary.isLowTier
                    ? "var(--grade-unique)"
                    : "var(--text-gold)";
                  const repItemColor = getGradeColor(repItem.grade);

                  if (set.items.length === 1) {
                    const item = set.items[0];
                    return (
                      <div
                        key={item.id}
                        className="item-card"
                        onClick={() => {
                          handleItemMouseLeave();
                          handleGearUpdate(slot, item.id);
                          close();
                        }}
                        onMouseEnter={(e) =>
                          handleItemMouseEnter(item, e, null)
                        }
                        onMouseLeave={handleItemMouseLeave}
                      >
                        <div className="card-thumb">
                          <img
                            src={GET_ITEM_ICON_LOCAL(item.name, slot)}
                            alt=""
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = PLACEHOLDER_IMG;
                            }}
                          />
                        </div>
                        <div className="card-info">
                          <div
                            className="card-name"
                            style={{ color: getGradeColor(item.grade) }}
                          >
                            {item.name}
                          </div>
                          <div
                            className="card-set"
                            style={{
                              marginTop: "4px",
                              fontSize: "0.75rem",
                              lineHeight: "1.4",
                            }}
                          >
                            <span style={{ color: "#888", marginRight: "4px" }}>
                              주요 옵션
                            </span>
                            <span style={{ color: optionColor }}>
                              {summary.text}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  } else {
                    return (
                      <div
                        key={set.id}
                        className="item-card"
                        onClick={() => {
                          setSelectedSpecialSet(set);
                          setSpecialPickerStep(1);
                        }}
                      >
                        <div className="card-thumb">
                          <img
                            src={GET_ITEM_ICON_LOCAL(repItem.name, slot)}
                            alt=""
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = PLACEHOLDER_IMG;
                            }}
                          />
                        </div>
                        <div className="card-info">
                          <div
                            className="card-name"
                            style={{ color: repItemColor }}
                          >
                            {set.setName}
                          </div>
                          <div
                            className="card-set"
                            style={{
                              marginTop: "4px",
                              fontSize: "0.75rem",
                              lineHeight: "1.4",
                            }}
                          >
                            {set.isGroup ? (
                              <span style={{ color: "#888" }}>
                                {set.items.length}종 포함
                              </span>
                            ) : (
                              <>
                                <span
                                  style={{ color: "#888", marginRight: "4px" }}
                                >
                                  주요 옵션
                                </span>
                                <span style={{ color: optionColor }}>
                                  {summary.text}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        <div style={{ color: "#888", fontSize: "1.2rem" }}>
                          ›
                        </div>
                      </div>
                    );
                  }
                })}
              </div>
            ) : (
              <div className="card-grid">
                {selectedSpecialSet.items
                  .sort(
                    (a, b) =>
                      (b.stats?.itemCode1 || 0) - (a.stats?.itemCode1 || 0) ||
                      b.id - a.id
                  )
                  .map((item) => (
                    <div
                      key={item.id}
                      className="item-card"
                      onClick={() => {
                        handleItemMouseLeave();
                        handleGearUpdate(slot, item.id);
                        close();
                      }}
                      onMouseEnter={(e) => handleItemMouseEnter(item, e, null)}
                      onMouseLeave={handleItemMouseLeave}
                    >
                      <div className="card-thumb">
                        <img
                          src={GET_ITEM_ICON_LOCAL(item.name, slot)}
                          alt=""
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = PLACEHOLDER_IMG;
                          }}
                        />
                      </div>
                      <div className="card-info">
                        <div
                          className="card-name"
                          style={{ color: getGradeColor(item.grade) }}
                        >
                          {item.name}
                        </div>
                        <div className="card-set">{item.grade}</div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default ItemPickerSheet;
