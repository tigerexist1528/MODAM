// src/utils/JobMechanics.js

/**
 * [헬퍼] TP 배율 계산기
 */
const getTpMultiplier = (skill, userStats) => {
  if (!skill) return 1;
  const tpLv = userStats.skill.levels[`TP_${skill.id}`] || 0;
  if (tpLv === 0) return 1;

  // DB 필드명 매핑 (대소문자/언더바 대응)
  const growth1 = skill.tpGrowth_1lv || skill.tpGrowth1Lv || 0;
  const growth = skill.tpGrowth || 0;

  return 1 + growth1 / 100 + (tpLv - 1) * (growth / 100);
};

/**
 * [헬퍼] 기본 데미지 계산기 (계수% + 고정뎀)
 */
const getBaseDamage = (skill, level, mainAtkVal) => {
  if (!skill) return 0;

  // 성장 계수 적용 (camelCase 확인)
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
  // ★ [핵심 수정] App.js에서 보내준 allSkills를 꺼냅니다.
  const {
    commonFactor,
    mainAtkVal,
    tpMultiplier: myTpMultiplier,
    allSkills,
  } = context;

  // 결과값 초기화
  let result = {
    finalDmg: currentDmg,
    additionalDmg: 0,
    mechanicTransferDmg: 0,
    transferTargetId: null,
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
  // [Global] 범용 메커니즘
  // =========================================================

  // Type 1: 데미지 복사 (Copy Damage)
  if (mech && mech.type === "copy_damage") {
    const targetId = mech.targetId;

    // ★ [핵심 수정] import한 빈 DB가 아니라, context로 받은 꽉 찬 DB에서 찾습니다.
    const targetSkill = (allSkills || []).find((s) => s.id === targetId);

    if (targetSkill) {
      // 1. 원본 스킬의 현재 레벨 (없으면 최소레벨)
      const targetLv = userStats.skill.levels[targetId] || targetSkill.minLv;

      // 2. 원본 스킬의 기본 1타 데미지 계산
      const targetBaseDmg = getBaseDamage(targetSkill, targetLv, mainAtkVal);

      // 3. 원본 스킬의 TP 배율 가져오기
      const targetTpMult = getTpMultiplier(targetSkill, userStats);

      // 4. 최종 데미지 교체 (내 TP 무시, 공통 계수 적용)
      result.finalDmg = targetBaseDmg * targetTpMult * commonFactor;

      // 5. 비율 조정 (옵션)
      if (mech.ratio) {
        result.finalDmg *= mech.ratio;
      }

      result.extraText = `[${targetSkill.name} Lv.${targetLv}] 복사`;
    } else {
      // 타겟 스킬을 못 찾았을 경우
      result.finalDmg = 0;
      result.extraText = `Err: 타겟(${targetId}) 없음`;

      // 디버깅용 로그 (개발자 도구 콘솔에서 확인 가능)
      console.warn(
        `[JobMechanics] 타겟 스킬을 찾을 수 없습니다: ${targetId}`,
        allSkills
      );
    }
  }

  // =========================================================
  // [Specific] 직업별 전용 로직
  // =========================================================
  if (subJob === "이단심판관") {
    // 성화 (Holy Fire)
    const holyFireId = "SK_IS_14";
    const holyFireLv = userStats.skill.levels[holyFireId] || 0;
    const isJobSkill =
      skill.category !== "common" && skill.category !== "basic";

    if (holyFireLv > 0 && isJobSkill) {
      const bonusRate = 8 + (holyFireLv - 1);
      // 복사된 데미지(result.finalDmg) 기준으로 성화 데미지 계산
      const bonusDmg = result.finalDmg * (bonusRate / 100);

      result.mechanicTransferDmg = bonusDmg;
      result.transferTargetId = holyFireId;

      const txt = `성화(+${bonusRate}%)`;
      result.extraText = result.extraText ? `${result.extraText}, ${txt}` : txt;
    }

    // 이단의 낙인 (패시브)
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
