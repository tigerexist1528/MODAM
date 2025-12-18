import React from "react";

// 1. [DB 데이터] src/data.js 에 있는 친구들
// (아이템 DB, 마부 데이터, 아이콘 함수 등)
import { WEAPON_DB, GEAR_DB, MAGIC_OPTS_BY_GROUP } from "../data";

// 2. [유틸/상수] src/utils/data.js 에 있는 친구들
// (이미지 경로, 슬롯 이름, 등급 색상, 타입 상수 등)
import {
  IMAGE_BASE_URL,
  GET_ITEM_ICON_LOCAL,
  EMBLEM_RULES,
  PLACEHOLDER_IMG,
  SLOT_ENG_NAMES,
  getGradeColor,
  WEAPON_TYPES,
  SPECIAL_SLOTS,
  EXCEED_SLOTS,
  getPrefixIconUrl,
} from "../utils/data";

// ★ 컴포넌트 선언 및 Props 받기
const GearSlotCard = ({
  slot,
  userStats,
  setActiveModal,
  setEditBuffer,
  setWeaponFilter,
  onMouseEnter,
  onMouseLeave,
  onOpenModal, // 무기 필터링용
  handleItemMouseEnter,
  handleItemMouseLeave,
}) => {
  const eq = userStats.equipment[slot];
  const isEquipped = eq.itemId !== 0;
  const isCash = SPECIAL_SLOTS.includes(slot);
  const isTitle = slot === "칭호";

  // 1. 기본 정보 설정
  let iconUrl = null,
    gradeClass = "",
    displayName = "",
    nameColor = "#888",
    prefixIconUrl = null; // ★ 접두사 아이콘 변수

  let targetItem = null;

  if (isEquipped) {
    const db = slot === "무기" ? WEAPON_DB : GEAR_DB;
    const item = db.find((i) => i.id === eq.itemId);
    if (item) {
      targetItem = item;
      iconUrl = GET_ITEM_ICON(item.name, slot);
      prefixIconUrl = getPrefixIconUrl(item.name);
      if (item.grade.includes("익시드")) gradeClass = "grade-exceed";
      else if (item.grade.includes("에픽")) gradeClass = "grade-epic";
      else if (item.grade.includes("유니크")) gradeClass = "grade-unique";
      else if (item.grade.includes("레어")) gradeClass = "grade-rare";
      displayName = item.name;
      nameColor = getGradeColor(item.grade);
    }
  }
  const emptyIconUrl = `${IMAGE_BASE_URL}/empty/${
    SLOT_ENG_NAMES[slot] || "default"
  }.png`;

  // 2. 인디케이터 데이터
  const reinforceVal = userStats.reinforce[slot] || 0;
  let reinforceClass = "rf-white";
  if (reinforceVal >= 20) reinforceClass = "rf-red";
  else if (reinforceVal >= 15) reinforceClass = "rf-epic";

  // 마법봉인
  let mGroup = null;
  if (slot === "무기") mGroup = "무기";
  else if (["머리어깨", "상의", "하의", "벨트", "신발"].includes(slot))
    mGroup = "방어구";
  else if (["팔찌", "목걸이", "반지"].includes(slot)) mGroup = "악세서리";
  else mGroup = "특수장비";

  const magicData = MAGIC_OPTS_BY_GROUP[mGroup];

  const getSealColorClass = (label, type) => {
    if (!label || label === "선택 안함" || !magicData) return "seal-none";
    const list = magicData[type] || [];
    const found = list.find((opt) => opt.label === label);
    if (!found) return "seal-mid";
    if (found.tier === "bis") return "seal-bis";
    if (found.tier === "high") return "seal-high";
    return "seal-mid";
  };

  const sealUniqueClass = getSealColorClass(
    userStats.magic_unique[slot],
    "unique"
  );
  const sealCommonClass = getSealColorClass(
    userStats.magic_common[slot],
    "common"
  );
  const showSeal =
    (sealUniqueClass !== "seal-none" || sealCommonClass !== "seal-none") &&
    !isCash;

  // 마법부여
  const enchantName = userStats.enchant[slot];
  let enchantClass = "color-none";
  if (enchantName && enchantName !== "선택 안함") {
    if (enchantName.includes("[종결]")) enchantClass = "color-bis";
    else if (enchantName.includes("[준종결]")) enchantClass = "color-high";
    else enchantClass = "color-mid";
  }
  const showEnchant = enchantClass !== "color-none" && (!isCash || isTitle);

  // 연마
  const pVal = userStats.polish[slot] || 0;
  let pClass = "refine-low";
  if (pVal === 10) pClass = "refine-max";
  else if (pVal >= 7) pClass = "refine-super";
  else if (pVal >= 5) pClass = "refine-high";
  else if (pVal >= 4) pClass = "refine-mid";

  // 엠블렘
  const leftSlots = [
    "머리어깨",
    "상의",
    "하의",
    "벨트",
    "신발",
    "오라",
    "크리쳐",
  ];
  const pigtailSide = leftSlots.includes(slot)
    ? "pigtail-left"
    : "pigtail-right";
  const emblemRule = EMBLEM_RULES[slot] || { slots: 0 };
  const currentEmblems = Array.isArray(userStats.emblem[slot])
    ? userStats.emblem[slot]
    : Array(emblemRule.slots).fill(null);
  const showEmblemPigtails = (!isCash || isTitle) && emblemRule.slots > 0;

  const openEmblemModal = (e) => {
    e.stopPropagation();
    setEditBuffer(JSON.parse(JSON.stringify(userStats)));
    setActiveModal({ type: "EMBLEM", slot, fromBlacksmith: false });
  };

  const handleClick = () => {
    if (slot === "무기") {
      if (!userStats.character.baseJob)
        return alert("직업군을 먼저 선택해주세요.");

      // WEAPON_TYPES import 필요
      const types = WEAPON_TYPES[userStats.character.baseJob] || [];
      // weaponFilter 상태를 여기서 알 수 없으므로,
      // 만약 weaponFilter가 필요하다면 App.js에서 로직을 처리하거나
      // setWeaponFilter를 호출하여 초기값을 설정해주는 방식이 좋습니다.
      if (setWeaponFilter) setWeaponFilter(types[0] || "");

      setActiveModal({ type: "GEAR_PICKER", slot });
    } else if (isCash) {
      setActiveModal({ type: "SPECIAL_PICKER", slot });
    } else {
      setActiveModal({ type: "GEAR_PICKER", slot });
    }
  };

  const blacksmithData = {
    reinforce: reinforceVal,
    polish: pVal,
    enchant: userStats.enchant[slot],
    magic_unique: userStats.magic_unique[slot],
    magic_common: userStats.magic_common[slot],
  };

  return (
    <div className="slot-wrapper" key={slot}>
      <div className="slot-icon-box">
        {showEmblemPigtails && (
          <div className={`pigtail-container ${pigtailSide}`}>
            {[...Array(emblemRule.slots)].map((_, i) => {
              const emb = currentEmblems[i];
              return (
                <div
                  key={i}
                  className={`pigtail-emblem ${emb ? "" : "pigtail-empty"}`}
                  onClick={openEmblemModal}
                >
                  {emb && (
                    <>
                      <img
                        src={`${IMAGE_BASE_URL}/emblems/${emb.img}.png`}
                        className="pigtail-img"
                        alt=""
                        onError={(e) => (e.target.src = PLACEHOLDER_IMG)}
                      />
                      <div className="pigtail-lv-overlay">{emb.level}</div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div
          className={`game-slot ${gradeClass} ${isEquipped ? "equipped" : ""}`}
          onClick={() => onOpenModal("CLICK_SLOT", slot, isCash)} // 클릭 시 동작
          onMouseEnter={(e) =>
            targetItem && onMouseEnter(targetItem, e, blacksmithData)
          }
          onMouseLeave={onMouseLeave}
          style={{ position: "relative" }} // ★ 오버레이를 위해 relative 필수
        >
          {iconUrl ? (
            <>
              <img
                src={iconUrl}
                alt={slot}
                onError={(e) => {
                  e.target.src = PLACEHOLDER_IMG;
                }}
              />

              {/* ★★★ [NEW] 접두사 아이콘 오버레이 ★★★ */}
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
                    zIndex: 5, // 인디케이터보다 아래, 아이템 이미지보다 위
                    pointerEvents: "none",
                  }}
                  onLoad={(e) => (e.target.style.display = "block")}
                  onError={(e) => (e.target.style.display = "none")}
                />
              )}
            </>
          ) : (
            <img src={emptyIconUrl} alt={slot} className="empty-slot-img" />
          )}
          {reinforceVal > 0 && !isCash && (
            <div className={`indicator-reinforce ${reinforceClass}`}>
              +{reinforceVal}
            </div>
          )}
          {pVal > 0 && !isCash && (
            <div className={`indicator-refine ${pClass}`}>{pVal}연마</div>
          )}
          {showSeal && (
            <div className="indicator-seal">
              <span className={`seal-gem ${sealUniqueClass}`}>♦</span>
              <span className={`seal-gem ${sealCommonClass}`}>♦</span>
            </div>
          )}
          {showEnchant && (
            <div className={`indicator-enchant ${enchantClass}`}>🂠</div>
          )}
        </div>

        {(!isCash || isTitle) && isEquipped && (
          <div
            className="blacksmith-btn"
            onClick={(e) => {
              e.stopPropagation();
              setEditBuffer(JSON.parse(JSON.stringify(userStats)));
              setActiveModal({ type: "BLACKSMITH", slot });
            }}
            title="대장간 설정"
          >
            🔨
          </div>
        )}
      </div>
      {isEquipped && (
        <div className="slot-name-tag" style={{ color: nameColor }}>
          {displayName}
        </div>
      )}
    </div>
  );
};

// ★ 외부에서 사용할 수 있게 export
export default GearSlotCard;
