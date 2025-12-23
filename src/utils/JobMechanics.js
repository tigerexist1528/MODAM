// src/utils/JobMechanics.js
import { SKILL_DB } from "../data";

/**
 * [헬퍼] TP 배율 계산기
 * App.js의 공식을 그대로 가져와서 원본 스킬의 TP 효율을 계산합니다.
 */
const getTpMultiplier = (skill, userStats) => {
  if (!skill) return 1;
  const tpLv = userStats.skill.levels[`TP_${skill.id}`] || 0;
  if (tpLv === 0) return 1;

  // DB 필드명 매핑 (대소문자/언더바 대응)
  const growth1 = skill.tpGrowth_1lv || skill.tpGrowth1Lv || 0;
  const growth = skill.tpGrowth || 0;

  // TP 공식: 1 + (1레벨상승분) + (나머지레벨 * 레벨당상승분)
  // 예: 1레벨(8%) -> 1.08, 2레벨(3%) -> 1.11
  return 1 + growth1 / 100 + (tpLv - 1) * (growth / 100);
};

/**
 * [헬퍼] 기본 데미지 계산기 (계수% + 고정뎀)
 */
const getBaseDamage = (skill, level, mainAtkVal) => {
  if (!skill) return 0;

  // 성장 계수 적용
  const finalRate =
    (skill.baseDamageRate || 0) + (skill.damageRateGrowth || 0) * (level - 1);

  const finalFlat =
    (skill.baseFlatDamage || 0) + (skill.flatDamageGrowth || 0) * (level - 1);

  return mainAtkVal * (finalRate / 100) + finalFlat;
};

/**
 * ★ 메인 로직 처리기 ★
 */
export const applyJobMechanics = (skill, userStats, currentDmg, context) => {
  const { subJob } = userStats.character;
  const { commonFactor, mainAtkVal, tpMultiplier: myTpMultiplier } = context;

  // 결과값 초기화
  let result = {
    finalDmg: currentDmg,
    additionalDmg: 0,
    mechanicTransferDmg: 0,
    transferTargetId: null, // 우편 배달 주소
    extraText: null,
  };

  // mechanics 데이터 파싱
  let mech = skill.mechanics;
  if (typeof mech === "string") {
    try {
      mech = JSON.parse(mech);
    } catch (e) {
      mech = null;
    }
  }

  // =========================================================
  // [Global] 범용 메커니즘 (직업 상관없이 작동)
  // =========================================================

  // Type 1: 데미지 복사 (Copy Damage)
  // 예: 정수 뿌리기 -> 플레게의 정수 복사
  if (mech && mech.type === "copy_damage") {
    const targetId = mech.targetId;
    const targetSkill = SKILL_DB.find((s) => s.id === targetId);

    if (targetSkill) {
      // 1. 원본 스킬의 현재 레벨 가져오기 (없으면 최소레벨)
      const targetLv = userStats.skill.levels[targetId] || targetSkill.minLv;

      // 2. 원본 스킬의 기본 1타 데미지 계산
      const targetBaseDmg = getBaseDamage(targetSkill, targetLv, mainAtkVal);

      // 3. 원본 스킬의 TP 배율 가져오기 (★ 핵심: 내 TP가 아니라 쟤 TP를 씀)
      const targetTpMult = getTpMultiplier(targetSkill, userStats);

      // 4. 최종 데미지 교체
      // (내 TP 무시, 공통 계수는 적용)
      result.finalDmg = targetBaseDmg * targetTpMult * commonFactor;

      // 5. 비율 조정 (옵션) - 예: "데미지의 50%만 복사" 같은 경우
      if (mech.ratio) {
        result.finalDmg *= mech.ratio;
      }

      result.extraText = `[${targetSkill.name} Lv.${targetLv}] 복사`;
    } else {
      // 타겟 스킬을 못 찾았을 경우 (DB 오류 등) -> 0 처리 혹은 원본 유지
      // 안전하게 0 처리 후 에러 메시지
      result.finalDmg = 0;
      result.extraText = `Err: 원본(${targetId}) 없음`;
    }
  }

  // =========================================================
  // [Specific] 직업별 전용 로직 (이단심판관 등)
  // =========================================================
  if (subJob === "이단심판관") {
    // 성화 (Holy Fire) 로직 - 우편 배달 시스템 사용
    const holyFireId = "SK_IS_14";
    const holyFireLv = userStats.skill.levels[holyFireId] || 0;
    const isJobSkill =
      skill.category !== "common" && skill.category !== "basic";

    if (holyFireLv > 0 && isJobSkill) {
      const bonusRate = 8 + (holyFireLv - 1);
      const bonusDmg = result.finalDmg * (bonusRate / 100); // 복사된 데미지 기준

      // ★ [수정] 우편 배달 시스템 (App.js의 TransferMap으로 보냄)
      result.mechanicTransferDmg = bonusDmg;
      result.transferTargetId = holyFireId;

      const txt = `성화(+${bonusRate}%)`;
      result.extraText = result.extraText ? `${result.extraText}, ${txt}` : txt;
    }

    // 이단의 낙인 (패시브) UI 표시
    if (mech && mech.type === "stack_passive") {
      const myLv = userStats.skill.levels[skill.id] || 0;
      let addStack = 0;
      const { min = 7, max = 8, threshold = 7 } = mech;
      if (myLv >= threshold) addStack = max;
      else if (myLv > 0) addStack = min;
      if (addStack > 0) {
        const stackTxt = `성화 스택 +${addStack}개`;
        result.extraText = result.extraText
          ? `${result.extraText}\n${stackTxt}`
          : stackTxt;
      }
    }
  }

  return result;
};
