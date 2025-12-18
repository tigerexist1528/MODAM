// -----------------------------------------------------------------------------
// Helper Functions & Constants (UI 및 로직용 상수)
// ----------------------------------------------------------------------------
export const IMAGE_BASE_URL =
  "https://raw.githubusercontent.com/tigerexist1528/modam-assets/main/images";

export const PLACEHOLDER_IMG = `${IMAGE_BASE_URL}/MODAM.png`;

// -----------------------------------------------------------------------------
// 슬롯 영어 이름 정의
// -----------------------------------------------------------------------------
export const SLOT_ENG_NAMES = {
  무기: "weapon",
  머리어깨: "headshoulder",
  상의: "top",
  하의: "bottom",
  벨트: "belt",
  신발: "shoes",
  팔찌: "bracelet",
  목걸이: "necklace",
  반지: "ring",
  보조장비: "sub",
  마법석: "magestone",
  귀걸이: "earring",
  오라: "aura",
  칭호: "title",
  크리쳐: "creature",
  아티팩트: "artifact",
};

// -----------------------------------------------------------------------------
// App.js 내부에서 안전하게 아이콘 가져오는 함수
// -----------------------------------------------------------------------------
export const GET_ITEM_ICON_LOCAL = (name, slot) => {
  if (!name || !slot) return PLACEHOLDER_IMG;

  // 이름 정제 (접두사 제거)
  let cleanName = name;
  if (name.includes(":")) {
    cleanName = name.split(":")[1].trim();
  }

  // 폴더명 찾기
  const folder = SLOT_ENG_NAMES[slot] || "etc";

  return `${IMAGE_BASE_URL}/items/${folder}/${cleanName}.png`;
};

export const GET_JOB_ICON = (type, name) => {
  if (!type || !name) return PLACEHOLDER_IMG;
  return `${IMAGE_BASE_URL}/characters/${type}/${name}.png`;
};

// -----------------------------------------------------------------------------
// 등급별 색상 반환 / 옵션 등급별 색상 반환
// -----------------------------------------------------------------------------

export const getGradeColor = (grade = "") => {
  if (grade.includes("익시드")) return "var(--grade-exceed)";
  if (grade.includes("에픽")) return "var(--grade-epic)";
  if (grade.includes("유니크")) return "var(--grade-unique)";
  if (grade.includes("레어")) return "var(--grade-rare)";
  return "#fff";
};

export const getOptionTierClass = (name) => {
  if (
    !name ||
    name.includes("선택 안함") ||
    name.includes("없음") ||
    name.includes("미설정")
  )
    return "color-none";
  if (name.includes("종결")) return "color-bis";
  if (name.includes("준종결")) return "color-high";
  return "color-mid";
};

// -----------------------------------------------------------------------------
// 세트 옵션 요약 헬퍼
// -----------------------------------------------------------------------------
export const getSetOptionSummary = (stats) => {
  if (!stats) return { text: "", isLowTier: false };

  const opts = [];

  // 1. 주요 증뎀 옵션
  if (stats.dmgInc) opts.push(`데미지+${stats.dmgInc}%`);
  if (stats.critDmgInc) opts.push(`크리티컬 데미지+${stats.critDmgInc}%`);
  if (stats.addDmg) opts.push(`추가 데미지+${stats.addDmg}%`);
  if (stats.skillAtkInc) opts.push(`스킬 공격력+${stats.skillAtkInc}%`);
  if (stats.allTypeDmg) opts.push(`모든 타입 피해+${stats.allTypeDmg}%`);
  if (stats.finalDmg) opts.push(`최종 데미지+${stats.finalDmg}%`);

  // ★ [수정] 모속강 표시 로직 (allEle 직접 부여 + 4속성 동일 값)
  if (stats.allEle) opts.push(`모든 속성 강화 +${stats.allEle}`);

  const { fireEle, waterEle, lightEle, darkEle } = stats;
  // 4속성이 모두 있고 값이 같으면 '모든 속성 강화'로 퉁침
  if (
    fireEle > 0 &&
    fireEle === waterEle &&
    fireEle === lightEle &&
    fireEle === darkEle
  ) {
    opts.push(`모든 속성 강화 +${fireEle}`);
  } else {
    if (fireEle > 0) opts.push(`화속성 강화 +${fireEle}`);
    if (waterEle > 0) opts.push(`수속성 강화 +${waterEle}`);
    if (lightEle > 0) opts.push(`명속성 강화 +${lightEle}`);
    if (darkEle > 0) opts.push(`암속성 강화 +${darkEle}`);
  }

  // 3. 스킬 레벨링 (연속 구간 찾기)
  if (stats.skill && stats.skill.lv) {
    const lvObj = stats.skill.lv;
    const levels = [10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 65, 70, 75, 80];
    let minLv = null;
    let maxLv = null;
    let val = 0;

    // 구간 찾기
    levels.forEach((lv) => {
      const v = lvObj[`lv${lv}`];
      if (v > 0) {
        if (minLv === null) minLv = lv;
        maxLv = lv;
        val = v;
      }
    });

    if (minLv !== null && val > 0) {
      if (minLv === maxLv) opts.push(`${minLv}레벨 스킬 Lv+${val}`);
      else opts.push(`${minLv}~${maxLv}레벨 스킬 Lv+${val}`);
    }
  }

  // 4. 스탯 %
  if (stats.physAtkInc) opts.push(`물리 공격력+${stats.physAtkInc}%`);
  if (stats.magAtkInc) opts.push(`마법 공격력+${stats.magAtkInc}%`);
  if (stats.strInc) opts.push(`힘+${stats.strInc}%`);
  if (stats.intInc) opts.push(`지능+${stats.intInc}%`);

  // ★ 만약 핵심 옵션이 하나라도 있다면 -> High Tier 반환
  if (opts.length > 0) {
    return { text: opts.join(", "), isLowTier: false };
  }

  // --- [2] 하위/기초 옵션 (Fallback) ---
  // 핵심 옵션이 없을 때만 표시
  const minorOpts = [];
  if (stats.physAtk) minorOpts.push(`물리 공격력+${stats.physAtk}`);
  if (stats.magAtk) minorOpts.push(`마법 공격력+${stats.magAtk}`);
  if (stats.str) minorOpts.push(`힘+${stats.str}`);
  if (stats.int) minorOpts.push(`지능+${stats.int}`);

  if (minorOpts.length > 0) {
    return { text: minorOpts.join(", "), isLowTier: true }; // 분홍색 표시용 플래그
  }

  return { text: "", isLowTier: false };
};

// -----------------------------------------------------------------------------
// 아바타 옵션 요약기
// -----------------------------------------------------------------------------
export const getAvatarSummary = (stats) => {
  if (!stats) return "";
  let summary = [];

  // 1. 주요 속도 옵션
  const targets = [
    { key: "atkSpeed", label: "공격속도" },
    { key: "castSpeed", label: "캐스팅속도" },
    { key: "moveSpeed", label: "이동속도" },
  ];

  targets.forEach((t) => {
    if (stats[t.key]) summary.push(`${t.label} +${stats[t.key]}%`);
  });

  // 2. 스킬 레벨링 (범위 병합 로직)
  if (stats.skill && stats.skill.lv) {
    // 레벨 키(lv10, lv15..)에서 숫자만 추출하여 정렬
    const levels = Object.keys(stats.skill.lv)
      .map((k) => parseInt(k.replace("lv", "")))
      .filter((n) => !isNaN(n))
      .sort((a, b) => a - b);

    if (levels.length > 0) {
      // 값(Value) 별로 레벨들을 그룹핑 (예: +1인 레벨들, +2인 레벨들)
      const groups = {};
      levels.forEach((lv) => {
        const val = stats.skill.lv[`lv${lv}`];
        if (!groups[val]) groups[val] = [];
        groups[val].push(lv);
      });

      // 각 그룹별로 "최소~최대" 형식으로 변환
      Object.entries(groups).forEach(([val, lvs]) => {
        const min = Math.min(...lvs);
        const max = Math.max(...lvs);

        if (min === max) {
          summary.push(`${min}레벨 스킬 Lv+${val}`);
        } else {
          summary.push(`${min}~${max}레벨 스킬 Lv+${val}`);
        }
      });
    }
  }

  // 3. 마을 이동속도 (레어 아바타 등)
  if (stats.townMoveSpeed)
    summary.push(`마을 이동속도 +${stats.townMoveSpeed}%`);

  if (summary.length === 0) return "옵션 없음";
  return summary.join(", ");
};

// -----------------------------------------------------------------------------
// 아이템 그룹화 헬퍼 (일반 장비용)
// -----------------------------------------------------------------------------
export const getGroupedItems = (db, slot, weaponType = null) => {
  const map = new Map();
  db.forEach((item) => {
    if (item.slot !== slot) return;
    if (weaponType && item.type && item.type !== weaponType) return;

    const baseKey = item.stats?.itemCode1 || item.id;
    if (!map.has(baseKey)) map.set(baseKey, { baseItem: item, variants: [] });
    map.get(baseKey).variants.push(item);
  });

  const groups = Array.from(map.values()).map((g) => {
    g.variants.sort(
      (a, b) => (a.stats?.itemCode2 || 0) - (b.stats?.itemCode2 || 0)
    );
    g.baseItem = g.variants[0];
    return g;
  });

  // 정렬: setCode 오름차순 (도감 순서)
  return groups.sort(
    (a, b) =>
      (a.baseItem.stats?.setCode || 9999) - (b.baseItem.stats?.setCode || 9999)
  );
};

// -----------------------------------------------------------------------------
// 특수 아이템 그룹화 헬퍼 (오라/칭호/크리쳐/아티팩트)
// -----------------------------------------------------------------------------
export const getSpecialSets = (db, slot) => {
  const map = new Map();

  db.forEach((item) => {
    if (item.slot !== slot) return;

    // 1. 그룹 식별자 결정
    const isGroupItem = item.groupName ? true : false;
    const groupKey = isGroupItem ? item.groupName : item.stats?.setCode || 0;
    const displayName = item.groupName || item.setName || "기타";
    const itemSetCode = item.stats?.setCode || 0;

    if (!map.has(groupKey)) {
      map.set(groupKey, {
        id: groupKey,
        setName: displayName,
        items: [],
        isGroup: isGroupItem,
        sortKey: 0, // 정렬을 위한 기준값 (최대 setCode)
      });
    }
    const group = map.get(groupKey);
    group.items.push(item);

    // 그룹 내에서 가장 높은 setCode를 정렬 키로 사용
    if (itemSetCode > group.sortKey) {
      group.sortKey = itemSetCode;
    }
  });

  // 정렬: sortKey(최대 setCode) 기준 내림차순 (높은 게 위로)
  return Array.from(map.values()).sort((a, b) => b.sortKey - a.sortKey);
};

// -----------------------------------------------------------------------------
// 스탯 코드 -> 한글 변환기
// -----------------------------------------------------------------------------
export const STAT_KOR_MAP = {
  // 1. 기초 스탯
  physAtk: "물리 공격력",
  magAtk: "마법 공격력",
  physAtkInc: "물리 공격력",
  magAtkInc: "마법 공격력",
  str: "힘",
  int: "지능",
  strInc: "힘",
  intInc: "지능",
  physCrit: "물리 크리티컬",
  magCrit: "마법 크리티컬",
  physCritRate: "물리 크리티컬",
  magCritRate: "마법 크리티컬",

  // 2. 공격력 관련
  critDmgInc: "크리티컬 데미지",
  dmgInc: "데미지",
  addDmg: "추가 데미지",
  counterDmgInc: "카운터 공격 시 데미지",
  counterAddDmg: "카운터 공격 시 추가 데미지",
  skillAtkInc: "스킬 공격력",
  allTypeDmg: "모든 타입 피해",
  finalDmg: "최종 데미지",

  // 3. 속성 강화
  elInflict1: "속성 부여",
  elInflict2: "속성 부여",
  allEle: "모든 속성 강화",
  fireEle: "화속성 강화",
  waterEle: "수속성 강화",
  lightEle: "명속성 강화",
  darkEle: "암속성 강화",
  allEle: "모든 속성 강화",
  highestEleAddDmg: "최고 속성 추가 데미지",
  fireAddDmg: "화속성 추가 데미지",
  waterAddDmg: "수속성 추가 데미지",
  lightAddDmg: "명속성 추가 데미지",
  darkAddDmg: "암속성 추가 데미지",

  // 4. 상태이상 관련
  bleedDmg: "공격 시 출혈 데미지",
  bleedInc: "출혈 데미지 증가",
  poisonDmg: "공격 시 중독 데미지",
  poisonInc: "중독 데미지 증가",
  burnDmg: "공격 시 화상 데미지",
  burnInc: "화상 데미지 증가",
  shockDmg: "공격 시 감전 데미지",
  shockInc: "감전 데미지 증가",

  // 5. 유틸 관련
  hp: "체력",
  hpMax: "HP MAX",
  mpMax: "MP MAX",
  spirit: "정신력",
  physDef: "물리 방어력",
  magDef: "마법 방어력",
  physDmgRed: "물리 데미지 감소",
  magDmgRed: "마법 데미지 감소",
  hit: "적중",
  hitRate: "적중",
  atkSpeed: "공격 속도",
  castSpeed: "캐스팅 속도",
  moveSpeed: "이동 속도",
  fireRes: "화속성 저항",
  waterRes: "수속성 저항",
  lightRes: "명속성 저항",
  darkRes: "암속성 저항",
  evasion: "회피",
  evasionRate: "회피",
  superArmor: "슈퍼 아머",
  gearPoint: "장비 포인트",
  defShred: "방어력 감소",
};

// -----------------------------------------------------------------------------
// 스탯 객체 -> 한글 변환기
// -----------------------------------------------------------------------------
export const formatStatsToKor = (stats) => {
  if (!stats || Object.keys(stats).length === 0) return "옵션 없음";

  const ignoreKeys = [
    "setCode",
    "itemCode1",
    "itemCode2",
    "gearPoint",
    "gpDetails",
  ];
  let lines = [];

  const groupLevels = (obj, label, suffix, isLeveling = false) => {
    if (!obj) return;
    const levels = Object.keys(obj)
      .map((k) => parseInt(k.replace("lv", "")))
      .sort((a, b) => a - b);
    if (levels.length === 0) return;

    const groups = {};
    levels.forEach((lv) => {
      const val = obj[`lv${lv}`];
      if (!groups[val]) groups[val] = [];
      groups[val].push(lv);
    });

    Object.entries(groups).forEach(([val, lvs]) => {
      const min = Math.min(...lvs);
      const max = Math.max(...lvs);
      const lvRange = min === max ? `${min}Lv` : `${min}~${max}Lv`;
      if (isLeveling) lines.push(`${lvRange} ${label} Lv+${val}`);
      else lines.push(`${lvRange} ${label} ${val}${suffix}`);
    });
  };

  Object.entries(stats).forEach(([key, val]) => {
    if (ignoreKeys.includes(key)) return;
    if (val === 0) return;

    if (key === "skill") {
      if (val.dmg) {
        // 1. 키 분류 작업 (일반 레벨형 vs 특정 스킬형)
        const levelObj = {};
        const specificObj = {};

        Object.entries(val.dmg).forEach(([k, v]) => {
          if (k.startsWith("exact_")) {
            specificObj[k] = v; // "exact_" 붙은 건 따로 관리
          } else {
            levelObj[k] = v; // 나머지는 레벨(lv) 관련으로 분류
          }
        });

        // 2. 기존 레벨별 스킬 공격력 출력 (헬퍼 함수 사용)
        // (분리했으므로 여기에 exact_ 키가 섞여 들어가지 않습니다)
        groupLevels(levelObj, "스킬 공격력", "% 증가");

        // 3. ★ [수정] 특정 스킬 공격력 출력 (요청하신 포맷 적용)
        Object.entries(specificObj).forEach(([k, v]) => {
          // "exact_체이서프레스" -> "체이서프레스"
          const name = k.replace("exact_", "");
          const numVal = Number(v);

          // 값이 0이면 표시 안 함 (혹시 몰라 안전장치)
          if (numVal === 0) return;

          // 양수면 '+', 음수면 기호 없음(숫자 자체에 - 있음)
          const sign = numVal > 0 ? "+" : "";

          // 결과: "체이서프레스 스킬 공격력 +20.0%"
          lines.push(`${name} 스킬 공격력 ${sign}${numVal.toFixed(1)}%`);
        });
      }

      if (val.lv) groupLevels(val.lv, "스킬", "", true);
      if (val.cdr) groupLevels(val.cdr, "스킬 쿨타임", "% 감소");
      return;
    }

    if (key === "status") {
      const statusMap = {
        poisonDmg: "중독 데미지",
        bleedDmg: "출혈 데미지",
        burnDmg: "화상 데미지",
        shockDmg: "감전 데미지",
        poisonInc: "중독 데미지 증가",
        bleedInc: "출혈 데미지 증가",
        burnInc: "화상 데미지 증가",
        shockInc: "감전 데미지 증가",
      };
      Object.entries(val).forEach(([sKey, sVal]) => {
        if (sVal === 0) return;
        const label = statusMap[sKey] || sKey;
        const prefix = sKey.endsWith("Dmg") ? "공격 시 " : "";
        lines.push(`${prefix}${label} +${sVal}%`);
      });
      return;
    }

    // ★ [수정 1] 속성 부여: 키 범위를 elInflict, elInflict1, elInflict2 모두 확인
    if (["elInflict", "elInflict1", "elInflict2"].includes(key)) {
      const elMap = { 1: "화속성", 2: "수속성", 3: "명속성", 4: "암속성" };
      // 값이 유효하면 추가 (텍스트에 '공격'을 붙여서 속강과 구분)
      if (elMap[val]) lines.push(`${elMap[val]} 공격`);
      return;
    }

    // ★ [수정 2] 슈퍼아머: val > 0 이면 무조건 표시 (1이 아닐 수도 있으므로)
    if (key === "superArmor" && val > 0) {
      lines.push("슈퍼아머 적용");
      return;
    }

    const label = STAT_KOR_MAP[key] || key;
    const isPercent = [
      "physAtkInc",
      "magAtkInc",
      "strInc",
      "intInc",
      "physCritRate",
      "magCritRate",
      "critDmgInc",
      "dmgInc",
      "addDmg",
      "counterDmgInc",
      "counterAddDmg",
      "skillAtkInc",
      "allTypeDmg",
      "finalDmg",
      "highestEleAddDmg",
      "waterAddDmg",
      "lightAddDmg",
      "darkAddDmg",
      "physDmgRed",
      "magDmgRed",
      "hitRate",
      "atkSpeed",
      "castSpeed",
      "moveSpeed",
      "evasionRate",
      "defShred",
    ].includes(key);

    lines.push(`${label} +${val}${isPercent ? "%" : ""}`);
  });

  return lines.join(", ");
};

// ★ 2. 접두사 아이콘 URL 반환 함수
export const getPrefixIconUrl = (itemName) => {
  if (!itemName || typeof itemName !== "string" || !itemName.includes(":")) {
    return null;
  }

  // "수호: 미지의..." -> "수호" 추출
  const prefix = itemName.split(":")[0].trim();

  // 이미지 경로 반환
  return `${IMAGE_BASE_URL}/icons/epics/${prefix}.png`;
};

// -----------------------------------------------------------------------------
// 텍스트 합산 헬퍼 (성안의 봉인용)
// -----------------------------------------------------------------------------
export const getMergedSealText = (main, sub) => {
  if (!main && !sub) return "미설정";

  // 값과 단위를 함께 저장하기 위해 구조 변경 { val: 0, unit: "" }
  const statsMap = {};

  const parseAndAdd = (text) => {
    if (!text) return;

    // 1. 콤마(,)나 슬래시(/)로 1차 분리
    const parts = text.split(/[,/]/);

    parts.forEach((part) => {
      // 2. 정규식 수정:
      // Group 1: 한글/영문/공백 (옵션명)
      // Group 2: 숫자 (수치)
      // Group 3: % 기호 (단위) - ★ 추가됨!
      const match = part.match(/([가-힣a-zA-Z\s]+)([+-]?\d+)(%?)/);

      if (match) {
        const key = match[1].trim();
        const val = Number(match[2]);
        const unit = match[3] || ""; // %가 있으면 가져오고 없으면 빈 문자열

        // 초기화
        if (!statsMap[key]) {
          statsMap[key] = { val: 0, unit: unit };
        }

        // 합산
        statsMap[key].val += val;

        // 단위 업데이트 (혹시 앞에는 없고 뒤에만 %가 있는 경우 등 대비)
        if (unit && !statsMap[key].unit) {
          statsMap[key].unit = unit;
        }
      } else {
        // 숫자가 없는 텍스트형 옵션 처리
        const cleanKey = part.trim();
        if (cleanKey && !statsMap[cleanKey]) {
          statsMap[cleanKey] = { val: 0, unit: "" };
        }
      }
    });
  };

  parseAndAdd(main);
  parseAndAdd(sub);

  // 3. 결과 조합
  const result = Object.entries(statsMap)
    .map(([key, data]) => {
      const { val, unit } = data;
      // 수치가 0이 아니면 "+수치%" 형태로 반환
      if (val !== 0) return `${key} +${val}${unit}`;
      return key;
    })
    .join(", "); // ★ 줄바꿈(\n) 대신 쉼표(, )로 연결

  return result || main || sub;
};

// ---------------------------------------------------------
// 헬퍼 함수 extractStats
// ---------------------------------------------------------

// [2] 헬퍼 함수 (extractStats: 상태이상 및 스킬 파싱 강화)
export const extractStats = (row) => {
  if (!row) return {};
  if (row.stats && typeof row.stats === "object" && !Array.isArray(row.stats)) {
    return row.stats;
  }

  const stats = {};

  Object.keys(row).forEach((key) => {
    let val = Number(row[key]);
    if (!val) return;

    let cleanKey = "";
    if (key.startsWith("stats_")) cleanKey = key.replace("stats_", "");
    else if (
      [
        "str",
        "int",
        "physAtk",
        "magAtk",
        "atkSpeed",
        "castSpeed",
        "moveSpeed",
        "physCrit",
        "magCrit",
      ].includes(key)
    )
      cleanKey = key;
    else return;

    // 1. 스킬 관련 (skill_lv_..., skill_dmg_...)
    if (cleanKey.startsWith("skill_")) {
      if (!stats.skill) stats.skill = {};
      const parts = cleanKey.split("_"); // [skill, lv, lv30]
      const type = parts[1]; // lv, dmg, cdr
      const target = parts[2]; // lv30

      if (!stats.skill[type]) stats.skill[type] = {};
      stats.skill[type][target] = val;
    }
    // ★ 2. 상태이상 관련 (status_poisonDmg...)
    else if (cleanKey.startsWith("status_")) {
      if (!stats.status) stats.status = {};
      const subKey = cleanKey.replace("status_", ""); // poisonDmg

      // 혹시 모를 오타 교정 (posion -> poison)
      const fixedKey = subKey.replace("posion", "poison");
      stats.status[fixedKey] = val;
    }
    // 3. 일반 스탯
    else {
      stats[cleanKey] = val;
    }
  });

  return stats;
};

export const transformLevelDB = (rows) => {
  const result = {};
  if (!Array.isArray(rows)) return result;

  rows.forEach((row) => {
    const key = (row.type || row.slot || row.group || row.Group || "").trim();
    if (!key) return;

    if (!result[key]) result[key] = {};
    const stats = extractStats(row);
    result[key][row.level] = stats;
  });
  return result;
};

// -----------------------------------------------------------------------------
// 장비 슬롯 정의
// -----------------------------------------------------------------------------
export const EQUIP_SLOTS = [
  "무기",
  "머리어깨",
  "상의",
  "하의",
  "벨트",
  "신발",
  "팔찌",
  "목걸이",
  "반지",
  "보조장비",
  "마법석",
  "귀걸이",
  "오라",
  "칭호",
  "크리쳐",
  "아티팩트",
];

export const EXCEED_SLOTS = ["상의", "팔찌", "귀걸이"];

export const SPECIAL_SLOTS = ["오라", "칭호", "크리쳐", "아티팩트"];

// 직업 구조 데이터
export const JOB_STRUCTURE = {
  "귀검사(남)": ["웨펀마스터", "소울브링어", "버서커", "아수라"],
  "귀검사(여)": [
    "소드마스터",
    "다크템플러",
    "데몬슬레이어",
    "베가본드",
    "블레이드",
  ],
  격투가: ["넨마스터", "스트라이커", "스트리트파이터", "그래플러"],
  "거너(남)": ["레인저(남)", "런처(남)", "메카닉(남)", "스핏파이어(남)"],
  "거너(여)": ["레인저(여)", "런처(여)", "메카닉(여)", "스핏파이어(여)"],
  마법사: ["엘레멘탈마스터", "배틀메이지", "마도학자", "인챈트리스"],
  "프리스트(남)": ["크루세이더(남)", "인파이터(남)"],
  "프리스트(여)": [
    "크루세이더(여)",
    "이단심판관",
    "무녀",
    "미스트리스",
    "인파이터(여)",
  ],
  워리어: ["와일드베인", "윈드시어"],
  도적: ["로그", "쿠노이치"],
  마창사: ["뱅가드", "다크랜서"],
};

// 무기 타입 데이터
export const WEAPON_TYPES = {
  "귀검사(남)": ["소검", "도", "둔기", "대검", "광검"],
  "귀검사(여)": ["소검", "도", "둔기", "대검", "광검"],
  격투가: ["너클", "건틀릿", "클로", "권투글러브", "통파"],
  "거너(남)": ["리볼버", "자동권총", "머스켓", "핸드캐넌", "보우건"],
  "거너(여)": ["리볼버", "자동권총", "머스켓", "핸드캐넌", "보우건"],
  마법사: ["창", "봉", "로드", "스태프", "빗자루"],
  "프리스트(남)": ["십자가", "염주", "토템", "낫", "배틀액스"],
  "프리스트(여)": ["십자가", "염주", "토템", "낫", "배틀액스"],
  워리어: ["락소드", "윙블레이드"],
  도적: ["단검", "쌍검", "차크라웨펀"],
  마창사: ["미늘창", "투창"],
};

export const EMBLEM_RULES = {
  머리어깨: { slots: 2, types: ["Yellow"] },
  상의: { slots: 2, types: ["Red"] },
  하의: { slots: 2, types: ["Red"] },
  벨트: { slots: 2, types: ["Yellow"] },
  신발: { slots: 2, types: ["Blue"] },
  팔찌: { slots: 2, types: ["Blue"] },
  목걸이: { slots: 2, types: ["Green"] },
  반지: { slots: 2, types: ["Green"] },
  무기: { slots: 2, types: ["Red", "Yellow", "Green", "Blue"] },
  보조장비: { slots: 1, types: ["Platinum"] },
  마법석: { slots: 1, types: ["Platinum"] },
  귀걸이: { slots: 1, types: ["Platinum"] },
  칭호: { slots: 1, types: ["Platinum"] },
  오라: { slots: 0, types: [] },
  크리쳐: { slots: 0, types: [] },
  아티팩트: { slots: 0, types: [] },
};
// -----------------------------------------------------------------------------
// Initial State (초기 값)
// -----------------------------------------------------------------------------
export const initialState = {
  character: {
    baseJob: "",
    subJob: "",
    weaponType: "",
    level: 85,
    nickname: "모험가",
  },

  equipment: EQUIP_SLOTS.reduce(
    (acc, cur) => ({
      ...acc,
      [cur]: { setName: "선택 안함", grade: "일반", itemId: 0 },
    }),
    {}
  ),

  damageOptions: {
    counter: false,
    backAttack: false,
    potion: false,
  },

  reinforce: EQUIP_SLOTS.reduce((acc, cur) => ({ ...acc, [cur]: 0 }), {}),
  polish: { 무기: 0, 보조장비: 0 },
  magic_unique: EQUIP_SLOTS.reduce(
    (acc, cur) => ({ ...acc, [cur]: "선택 안함" }),
    {}
  ),
  magic_common: EQUIP_SLOTS.reduce(
    (acc, cur) => ({ ...acc, [cur]: "선택 안함" }),
    {}
  ),
  emblem: [...EQUIP_SLOTS, "칭호"].reduce(
    (acc, cur) => ({ ...acc, [cur]: { slots: [] } }),
    {}
  ),
  enchant: EQUIP_SLOTS.reduce(
    (acc, cur) => ({ ...acc, [cur]: "선택 안함" }),
    {}
  ),

  training: {
    concentrator: 0,
    hopae: 0,
    breakthrough: 0,
    sealMain: "",
    sealSub: "",
    masterContract: true,
  },

  skillRunes: {
    slots: Array(20).fill(null),
    special: { gaho: 0, jihe: 0, waegok: 0 }, // (구버전 호환용, 필요 없으면 삭제 가능)
    general: [], // (구버전 호환용)
  },

  avatarSettings: { set: "없음", weapon: "없음" },

  // ★ 상세 스탯 (DB 구조와 일치)
  stats: {
    physAtk: 0,
    magAtk: 0,
    str: 0,
    int: 0,
    physAtkInc: 0,
    magAtkInc: 0,
    strInc: 0,
    intInc: 0,
    physCrit: 0,
    magCrit: 0,
    physCritRate: 0,
    magCritRate: 0,
    critDmgInc: 0,
    dmgInc: 0,
    addDmg: 0,
    counterDmgInc: 0,
    counterAddDmg: 0,
    skillAtkInc: 0,
    allTypeDmg: 0,
    finalDmg: 0,
    elInflict1: 0,
    elInflict2: 0,
    allEle: 0,
    fireEle: 0,
    waterEle: 0,
    lightEle: 0,
    darkEle: 0,
    highestEleAddDmg: 0,
    fireAddDmg: 0,
    waterAddDmg: 0,
    lightAddDmg: 0,
    darkAddDmg: 0,
    skill: { dmg: {}, lv: {}, cdr: {} },
    status: {
      poisonDmg: 0,
      bleedDmg: 0,
      burnDmg: 0,
      shockDmg: 0,
      poisonInc: 0,
      bleedInc: 0,
      burnInc: 0,
      shockInc: 0,
    },
    hp: 0,
    hpMax: 0,
    mpMax: 0,
    spirit: 0,
    physDef: 0,
    magDef: 0,
    physDmgRed: 0,
    magDmgRed: 0,
    hit: 0,
    hitRate: 0,
    atkSpeed: 0,
    castSpeed: 0,
    moveSpeed: 0,
    fireRes: 0,
    waterRes: 0,
    lightRes: 0,
    darkRes: 0,
    evasion: 0,
    evasionRate: 0,
    superArmor: 0,
    gearPoint: 0,
    defShred: 0,
  },

  skill: {
    levels: {}, // { "SK_ID": 10 }
    tpLevels: {}, // { "SK_ID": 1 }
  },

  activeSetEffects: { armor: [], accessory: [], special: [] },

  uniqueEffects: {
    무기: "",
    상의: "",
    팔찌: "",
    귀걸이: "",
  },
};
