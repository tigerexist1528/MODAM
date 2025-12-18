import { createClient } from "@supabase/supabase-js";

import { 
  extractStats, 
  transformLevelDB,
  EMBLEM_RULES // 엠블렘 규칙도 가져옵니다.
} from "./utils/data";

// ---------------------------------------------------------
// [1] 변수 선언
// ---------------------------------------------------------
export let WEAPON_DB = [];
export let GEAR_DB = [];
export let REINFORCE_DB = {};
export let POLISH_DB = {};
export let MAGIC_OPTS_BY_GROUP = {};
export let ENCHANT_LIST_BY_SLOT = {};
export let TRAINING_DB = {};
export let AVATAR_DB = {};
export let WEAPON_AVATAR_DB = [];
export let GEAR_POINT_BONUS_DB = { armor: [], accessory: [], special: [] };
export let SKILL_DB = [];
export let SKILL_RUNE_DB = [];

export let EMBLEM_DB = {
  Red: { name: "붉은빛", img: "red", stats: {} },
  Yellow: { name: "노란빛", img: "yellow", stats: {} },
  Green: { name: "녹색빛", img: "green", stats: {} },
  Blue: { name: "푸른빛", img: "blue", stats: {} },
  Platinum: {},
};

// ---------------------------------------------------------
// [3] 메인 데이터 로딩 함수 (Supabase)
// ---------------------------------------------------------
export const loadGameData = async () => {
  console.time("Supabase Load");

  try {
    // ★ 여기서 모든 테이블을 불러옵니다.
    // sets 테이블이 없더라도 에러가 나지 않도록 변수는 선언해야 합니다.
    const [
      { data: weapons },
      { data: armors },
      { data: accessories },
      { data: special },
      { data: reinforce },
      { data: polish },
      { data: training },
      { data: castleSeal },
      { data: avatars },
      { data: magicOpts },
      { data: enchants },
      { data: emblems },
      { data: skills },
      { data: gearPointBonus },
      { data: auras },
      { data: titles },
      { data: creatures },
      { data: artifacts },
      { data: skillrune },
    ] = await Promise.all([
      supabase.from("weapons").select("*"),
      supabase.from("armors").select("*"),
      supabase.from("accessories").select("*"),
      supabase.from("special").select("*"),
      supabase.from("reinforce").select("*"),
      supabase.from("polish").select("*"),
      supabase.from("training").select("*"),
      supabase.from("castleseal").select("*"),
      supabase.from("avatars").select("*"),
      supabase.from("magicopts").select("*"),
      supabase.from("enchants").select("*"),
      supabase.from("emblems").select("*"),
      supabase.from("skills").select("*"),
      supabase.from("gearpointbonus").select("*"),
      supabase.from("auras").select("*"),
      supabase.from("titles").select("*"),
      supabase.from("creatures").select("*"),
      supabase.from("artifacts").select("*"),
      supabase.from("skillrune").select("*"),
    ]);

    // 1. 기본 장비
    WEAPON_DB = weapons || [];
    WEAPON_DB.forEach((w) => (w.id = Number(w.id)));

    GEAR_DB = [
      ...(armors || []),
      ...(accessories || []),
      ...(special || []),
      ...(auras || []),
      ...(titles || []),
      ...(creatures || []),
      ...(artifacts || []),
    ];

    [WEAPON_DB, GEAR_DB].forEach((db) => {
      db.forEach((item) => {
        item.id = Number(item.id);
        if (item.label && !item.name) item.name = item.label;

        // ★ extractStats를 통해 스탯 파싱 (스킬 레벨링 포함)
        item.stats = extractStats(item);
      });
    });

    // 3. 레벨 기반 DB
    REINFORCE_DB = transformLevelDB(reinforce || []);
    POLISH_DB = transformLevelDB(polish || []);
    TRAINING_DB = transformLevelDB(training || []);

    // 4. 성안의 봉인
    TRAINING_DB.castle_seal = { base: { stats: {} }, main: [], sub: [] };
    (castleSeal || []).forEach((row) => {
      const group = (row.group || "").trim();
      row.stats = extractStats(row);
      if (group === "base") TRAINING_DB.castle_seal.base = row;
      else if (group === "main") TRAINING_DB.castle_seal.main.push(row);
      else if (group === "sub") TRAINING_DB.castle_seal.sub.push(row);
    });

    // 5. 아바타
    AVATAR_DB = {};
    WEAPON_AVATAR_DB = [];
    (avatars || []).forEach((row) => {
      const type = (row.type || "").trim();
      const name = (row.name || "").trim();
      row.stats = extractStats(row);

      if (type === "아바타 세트") {
        if (name) AVATAR_DB[name] = row.stats;
      } else if (type === "무기 아바타") {
        WEAPON_AVATAR_DB.push(row);
      }
    });

    // 6. 마법봉인
    MAGIC_OPTS_BY_GROUP = {};
    (magicOpts || []).forEach((row) => {
      const group = (row.Group || row.group || "").trim();
      if (!group) return;
      if (!MAGIC_OPTS_BY_GROUP[group])
        MAGIC_OPTS_BY_GROUP[group] = { unique: [], common: [] };

      row.stats = extractStats(row);
      if (row.label && !row.name) row.name = row.label;
      if (row.label && !row.label_ui) row.label = row.label;

      if (
        row.isUnique === true ||
        String(row.isUnique).toUpperCase() === "TRUE"
      ) {
        MAGIC_OPTS_BY_GROUP[group].unique.push(row);
      } else {
        MAGIC_OPTS_BY_GROUP[group].common.push(row);
      }
    });

    // 7. 마법부여
    ENCHANT_LIST_BY_SLOT = {};
    (enchants || []).forEach((row) => {
      const slot = (row.Group || row.slot || row.group || "").trim();
      if (!slot) return;
      if (!ENCHANT_LIST_BY_SLOT[slot]) ENCHANT_LIST_BY_SLOT[slot] = [];

      row.name = row.label || row.name;
      row.stats = extractStats(row);
      ENCHANT_LIST_BY_SLOT[slot].push(row);
    });

    // 8. 엠블렘 (DB 구조 맞춤형 수정: type=normal/platinum, options=Red/Yellow...)
    EMBLEM_DB = {
      Red: { name: "붉은빛", img: "red", stats: {} },
      Yellow: { name: "노란빛", img: "yellow", stats: {} },
      Green: { name: "녹색빛", img: "green", stats: {} },
      Blue: { name: "푸른빛", img: "blue", stats: {} },
      Platinum: {},
    };

    (emblems || []).forEach((row) => {
      // 1. 기본 데이터 추출
      const stats = extractStats(row);
      // level 컬럼이 없으면 lv, grade 순으로 찾음
      const lv = Number(row.level || row.lv || row.grade);

      // 유효성 검사: 레벨이 없거나 0이면 무시
      if (isNaN(lv) || lv === 0) return;

      // 2. 타입 판별 (대소문자 무시)
      const dbType = (row.type || "").trim().toLowerCase(); // 'normal' or 'platinum'
      const optionKey = (row.options || "").trim(); // 'Red', 'Yellow', 'fire' ...

      // [Case A] 플래티넘 엠블렘
      if (dbType === "platinum") {
        if (!optionKey) return;

        // 플래티넘은 options 값을 키(Key)로 사용 (예: fire, str, all...)
        if (!EMBLEM_DB.Platinum[optionKey]) {
          EMBLEM_DB.Platinum[optionKey] = {
            name: row.name, // "플래티넘 엠블렘[화속강]" 등
            img: optionKey, // 이미지명도 옵션키를 따라감
            stats: {},
          };
        }

        // 스탯 매핑
        Object.keys(stats).forEach((statKey) => {
          if (!EMBLEM_DB.Platinum[optionKey].stats[statKey]) {
            EMBLEM_DB.Platinum[optionKey].stats[statKey] = {};
          }
          EMBLEM_DB.Platinum[optionKey].stats[statKey][lv] = stats[statKey];
        });
      }
      // [Case B] 일반 엠블렘 (normal)
      else if (dbType === "normal") {
        // options 컬럼(Red, Yellow...)을 사용하여 EMBLEM_DB의 키를 찾음
        // DB에 'Red'로 저장되어 있으면 EMBLEM_DB['Red']에 매칭됨
        const targetEmblem = EMBLEM_DB[optionKey];

        if (targetEmblem) {
          // 스탯 매핑
          Object.keys(stats).forEach((statKey) => {
            if (!targetEmblem.stats[statKey]) {
              targetEmblem.stats[statKey] = {};
            }
            targetEmblem.stats[statKey][lv] = stats[statKey];
          });

          // 이미지가 있다면 업데이트 (보통 고정이겠지만 DB 우선)
          if (row.img) targetEmblem.img = row.img;
        } else {
          // options 값이 Red, Yellow, Green, Blue가 아닌 경우 (데이터 오류 가능성)
          // console.warn(`⚠️ 알 수 없는 일반 엠블렘 옵션: ${optionKey}`);
        }
      }
    });

    // 9. 장비 포인트
    GEAR_POINT_BONUS_DB = { armor: [], accessory: [], special: [] };
    (gearPointBonus || []).forEach((row) => {
      const type = row.type;
      if (GEAR_POINT_BONUS_DB[type]) {
        GEAR_POINT_BONUS_DB[type].push({
          threshold: Number(row.threshold),
          stats: extractStats(row),
        });
      }
    });

    // 10. 스킬
    SKILL_DB = (skills || []).map((row) => {
      const maxLv = Number(row.maxLv || row.max_lv || 50);
      const skillStats = extractStats(row);
      // ★ [NEW] 성장 데이터 파싱 로직 (stat_growth 컬럼)
      // 예: "str:10, int:10" -> { str: 10, int: 10 }
      const growthMap = {};
      const growthStr = row.stat_growth || row.statGrowth || ""; // DB 컬럼명 확인 필요

      if (growthStr) {
        // 쉼표(,)로 구분하여 순회
        growthStr.split(",").forEach((part) => {
          const [key, val] = part.split(":");
          if (key && val) {
            // 공백 제거 및 숫자 변환
            growthMap[key.trim()] = Number(val);
          }
        });
      }

      return {
        id: row.id || `SK_${Math.random().toString(36).substr(2, 9)}`,
        jobGroup: row.jobGroup || row.job_group || "",
        jobName: row.jobName || row.job_name || "공용",
        name: row.name || "이름없음",
        rowIndex: Number(row.rowIndex || row.row_index || 1),
        startLv: Number(row.startLv || row.start_lv || 1),
        levelStep: Number(row.levelStep || row.level_step || 2),
        minLv: Number(row.minLv || row.min_lv || 0),
        maxLv: maxLv,
        limitLv: Number(row.limitLv || maxLv + 10),

        spCost: Number(row.spCost || row.sp_cost || 0),
        tpCost: Number(row.tpCost || row.tp_cost || 0),
        cooltime: Number(row.cooltime || 0),

        type: row.type || "active",

        // ★ [핵심] 데미지 계수 4대장 (컬럼명 대소문자/언더바 자동 대응)
        // 시트 헤더가 base_damage_rate, BaseDamageRate 등일 경우를 대비해 여러 케이스 확인
        tpGrowth: Number(row.tpGrowth || 0),
        tpGrowth_1lv: Number(row.tpGrowth_1lv || row.tp_growth_1lv || 0),
        baseDamageRate: Number(
          row.BaseDamageRate || row.base_damage_rate || row.baseDamageRate || 0
        ),
        baseFlatDamage: Number(
          row.BaseFlatDamage || row.base_flat_damage || row.baseFlatDamage || 0
        ),
        damageRateGrowth: Number(
          row.DamageRateGrowth ||
            row.damage_rate_growth ||
            row.damageRateGrowth ||
            0
        ),
        flatDamageGrowth: Number(
          row.FlatDamageGrowth ||
            row.flat_damage_growth ||
            row.flatDamageGrowth ||
            0
        ),

        category: row.category || "normal",
        img: row.img || row.image || "",

        // 버프 스킬용 스탯 (stats_str 등)
        stats: skillStats,
        // ★ [NEW] 파싱된 성장 데이터 저장
        statGrowth: growthMap,
      };
    });

    // ★ [NEW] 11. 스킬룬 데이터 처리
    // CSV 구조: type, name, targetSkillLevel, level, stats_skill_dmg_lvXX ...
    SKILL_RUNE_DB = (skillrune || []).map((row) => {
      // extractStats가 stats_ 접두어를 자동으로 파싱하여
      // row.stats = { skill: { dmg: { lv15: 3 } } } 형태로 만들어줍니다.
      row.stats = extractStats(row);

      // 숫자형 변환 안전장치
      row.targetSkillLevel = row.targetSkillLevel
        ? Number(row.targetSkillLevel)
        : null;
      row.level = Number(row.level); // 룬 등급 (3: 레어, 4: 유니크)

      return row;
    });

    console.timeEnd("Supabase Load");
    console.log("✅ [System] Supabase 데이터 로드 완료!");
    return true;
  } catch (error) {
    console.error("❌ [System] 데이터 로드 실패:", error);
    return false;
  }
};
