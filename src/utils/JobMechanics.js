// src/utils/JobMechanics.js

/**
 * [헬퍼] TP 배율 계산기 (버그 수정됨)
 */
const getTpMultiplier = (skill, userStats) => {
  if (!skill) return 1;
  // ★ [FIX] 기존 levels['TP_...'] -> tpLevels[id] 로 경로 수정!
  const tpLv = userStats.skill.tpLevels[skill.id] || 0;
  if (tpLv === 0) return 1;

  const growth1 = skill.tpGrowth_1lv || skill.tpGrowth1Lv || 0;
  const growth = skill.tpGrowth || 0;
  return 1 + growth1 / 100 + (tpLv - 1) * (growth / 100);
};

/**
 * [헬퍼] 기본 데미지 계산기 (레벨 보정 포함)
 */
const getBaseDamage = (skill, level, mainAtkVal) => {
  if (!skill) return 0;
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

  // App.js에서 보내준 '완전 복사'용 재료들 해체
  const {
    commonFactor,
    mainAtkVal,
    allSkills,
    // ▼ 타겟 스킬 계산용
    skillBonusLevels,
    skillDmgMap,
    skillIdDmgMap,
  } = context;

  let result = {
    finalDmg: currentDmg,
    additionalDmg: 0,
    mechanicTransferDmg: 0,
    transferTargetId: null,
    extraText: null,
  };

  let mech = skill.mechanics;
  if (typeof mech === "string") {
    try {
      mech = JSON.parse(mech);
    } catch (e) {
      mech = null;
    }
  }

  // =========================================================
  // [Global] 범용 메커니즘 : 데미지 복사 (Copy Damage)
  // =========================================================
  if (mech && mech.type === "copy_damage") {
    const targetId = mech.targetId;
    const targetSkill = (allSkills || []).find((s) => s.id === targetId);

    if (targetSkill) {
      // 1. 타겟의 [최종 레벨] 계산
      let finalLv = 0;

      // ★ [NEW] 잠재력(계수표) 모드일 경우 -> 무조건 만렙 기준!
      if (context.isPotentialMode) {
        finalLv = targetSkill.maxLv || targetSkill.limitLv;
      } else {
        // 실전 모드 -> 내 스킬트리 + 장비 레벨링 반영
        const learnedLv = userStats.skill.levels[targetId] || targetSkill.minLv;
        const lvKey = `lv${targetSkill.startLv}`;
        const bonusLv = (skillBonusLevels && skillBonusLevels[lvKey]) || 0;
        finalLv = Math.min(
          learnedLv + bonusLv,
          targetSkill.limitLv || targetSkill.maxLv + 10
        );
      }

      // 2. 타겟의 [기본 데미지] 계산 (최종 레벨 기준)
      const targetBaseDmg = getBaseDamage(targetSkill, finalLv, mainAtkVal);

      // 3. 타겟의 [TP 배율] 계산 (★ 버그 수정됨)
      const targetTpMult = getTpMultiplier(targetSkill, userStats);

      // 4. 타겟의 [특수 증뎀] 계산 (룬, 고유옵션 등)
      // 레벨 구간 증뎀(skillDmgMap) * ID 지정 증뎀(skillIdDmgMap)
      const levelFactor = (skillDmgMap && skillDmgMap[lvKey]) || 1.0;
      const idFactor = (skillIdDmgMap && skillIdDmgMap[targetId]) || 1.0;
      const targetSpecificFactor = levelFactor * idFactor;

      // 5. 최종 데미지 산출 (모든 계수 곱연산)
      // [기본뎀 * TP * 특수증뎀 * 공통증뎀]
      result.finalDmg =
        targetBaseDmg * targetTpMult * targetSpecificFactor * commonFactor;

      if (mech.ratio) result.finalDmg *= mech.ratio;
      result.extraText = `[${targetSkill.name} Lv.${finalLv}] 복사`;
    } else {
      result.finalDmg = 0;
      result.extraText = `Err: 타겟(${targetId}) 없음`;
    }
  }

  // ★ [NEW] Type 2: 트리거 스킬 (Trigger Skill)
  // 예: 기본공격 사용 시 -> 양의공 데미지 발동
  if (mech && mech.type === "trigger_skill") {
    const targetId = mech.targetId;
    const targetSkill = (allSkills || []).find((s) => s.id === targetId);

    if (targetSkill) {
      // 1. 타겟(양의공)의 스펙 가져오기
      const learnedLv = userStats.skill.levels[targetId] || targetSkill.minLv;
      const lvKey = `lv${targetSkill.startLv}`;
      const bonusLv = (skillBonusLevels && skillBonusLevels[lvKey]) || 0;
      const finalLv = Math.min(
        learnedLv + bonusLv,
        targetSkill.limitLv || targetSkill.maxLv + 10
      );

      // 2. 타겟 데미지 계산 (기본뎀 * TP * 특수증뎀 * 공통증뎀)
      const targetBaseDmg = getBaseDamage(targetSkill, finalLv, mainAtkVal);
      const targetTpMult = getTpMultiplier(targetSkill, userStats);

      const levelFactor = (skillDmgMap && skillDmgMap[lvKey]) || 1.0;
      const idFactor = (skillIdDmgMap && skillIdDmgMap[targetId]) || 1.0;
      const targetSpecificFactor = levelFactor * idFactor;

      const triggerDmg =
        targetBaseDmg * targetTpMult * targetSpecificFactor * commonFactor;

      // 3. 우편 배달 (Trigger)
      // 내 데미지(result.finalDmg)는 그대로 두고, 타겟 ID로 별도 배송
      result.mechanicTransferDmg = triggerDmg; // 1회분 데미지
      result.transferTargetId = targetId; // 양의공 ID

      // 비율이 있다면 적용 (예: 50% 데미지로 발동)
      if (mech.ratio) result.mechanicTransferDmg *= mech.ratio;

      // 텍스트 표시
      result.extraText = `[${targetSkill.name}] 발동`;
    }
  }

  // ★ [NEW] Type 3: 패시브 데미지 (양의공 등)
  if (mech && mech.type === "passive_damage") {
    // [계수표 모드] 일 때는 '1회 발동 데미지'를 보여줘야 하므로 0으로 만들지 않음
    if (context.isPotentialMode) {
      // 계수표에서는 그냥 놔두면 rawOneHitDmg가 그대로 나갑니다. (성공)
      result.extraText = "[계수] 1회 발동 기준";
    } else {
      // [실전 모드] 에서는 스스로 발동하면 안 됨 (Trigger가 배달해줌)
      result.finalDmg = 0;
      result.extraText = "트리거 전용 (자동 발동 X)";
    }
  }

  // =========================================================
  // [Specific] 이단심판관
  // =========================================================
  if (subJob === "이단심판관") {
    // 성화 (Holy Fire)
    const holyFireId = "SK_IS_14";
    const holyFireLv = userStats.skill.levels[holyFireId] || 0;
    const isJobSkill =
      skill.category !== "common" && skill.category !== "basic";

    if (holyFireLv > 0 && isJobSkill) {
      const bonusRate = 8 + (holyFireLv - 1);
      // 복사된 데미지(result.finalDmg) 기준으로 성화 추가타 계산
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
