// src/utils/JobMechanics.js

export const applyJobMechanics = (
  skill,
  userStats,
  originalDmg,
  context = {}
) => {
  const { subJob } = userStats.character;

  // 1. 기본 반환값 구조
  const result = {
    finalDmg: originalDmg,
    additionalDmg: 0,
    mechanicTransferDmg: 0,
    transferTargetId: null,
    extraText: null,
  };

  // 2. mechanics 데이터 파싱
  let mech = skill.mechanics;
  if (typeof mech === "string") {
    try {
      mech = JSON.parse(mech);
    } catch (e) {
      mech = null;
    }
  }

  // mechanics가 없어도 직업 전용 로직은 탈 수 있으므로 리턴하지 않음

  // ----------------------------------------------------------------
  // [Type 1] 조건부 스증 (condition_skill_atk)
  // ----------------------------------------------------------------
  if (mech && mech.type === "condition_skill_atk") {
    const targetId = mech.targetId;
    const learnedLv = userStats.skill.levels[targetId] || 0;

    if (learnedLv > 0) {
      const multiplier = 1 + mech.value / 100;
      result.finalDmg *= multiplier;
    }
  }

  // ----------------------------------------------------------------
  // [Type 2] 타격 시 추가 데미지 / 쿨타임 감소 등 (trigger_skill)
  // ----------------------------------------------------------------
  if (mech && mech.type === "trigger_skill") {
    const targetId = mech.targetId;
    const allSkills = context.allSkills || [];
    const targetSkill = allSkills.find((s) => s.id === targetId);

    if (targetSkill) {
      // 타겟 스킬의 최종 레벨 계산
      let finalLv = 0;

      if (context.isPotentialMode) {
        // [A] 계수표 모드
        finalLv = targetSkill.maxLv || targetSkill.limitLv;
      } else {
        // [B] 실전 모드
        const learnedLv = userStats.skill.levels[targetId] || targetSkill.minLv;

        // ★ lvKey 안전하게 생성
        const lvKey = `lv${targetSkill.startLv}`;
        const skillBonusLevels = context.skillBonusLevels || {};
        const bonusLv = skillBonusLevels[lvKey] || 0;

        finalLv = Math.min(
          learnedLv + bonusLv,
          targetSkill.limitLv || targetSkill.maxLv + 10
        );
      }

      // 레벨이 0보다 커야(배웠어야) 발동
      if (finalLv > 0) {
        const finalRate =
          targetSkill.baseDamageRate +
          targetSkill.damageRateGrowth * (finalLv - 1);
        const finalFlat =
          targetSkill.baseFlatDamage +
          targetSkill.flatDamageGrowth * (finalLv - 1);

        const mainAtk = context.mainAtkVal || 0;
        const commonFactor = context.commonFactor || 1;

        // 약식 계산 (에러 방지)
        const baseDmg = mainAtk * (finalRate / 100) + finalFlat;
        const targetOneHitDmg = baseDmg * 1.0 * commonFactor;

        result.mechanicTransferDmg = targetOneHitDmg;
        result.transferTargetId = targetId;

        result.extraText = `+ ${targetSkill.name} 발동`;
      }
    }
  }

  // ----------------------------------------------------------------
  // [Type 3] 패시브 데미지 (passive_damage)
  // ----------------------------------------------------------------
  if (mech && mech.type === "passive_damage") {
    if (context.isPotentialMode) {
      result.extraText = "[계수] 1회 발동 기준";
    } else {
      result.finalDmg = 0;
      result.extraText = "트리거 전용 (자동 발동 X)";
    }
  }

  // ----------------------------------------------------------------
  // [Type 4] 데미지 복사 (copy_damage)
  // ----------------------------------------------------------------
  if (mech && mech.type === "copy_damage") {
    const targetId = mech.targetId;
    const allSkills = context.allSkills || [];
    const targetSkill = allSkills.find((s) => s.id === targetId);

    if (targetSkill) {
      let finalLv = 0;

      if (context.isPotentialMode) {
        finalLv = targetSkill.maxLv || targetSkill.limitLv;
      } else {
        const learnedLv = userStats.skill.levels[targetId] || targetSkill.minLv;
        const lvKey = `lv${targetSkill.startLv}`;
        const bonusLv =
          (context.skillBonusLevels && context.skillBonusLevels[lvKey]) || 0;
        finalLv = Math.min(
          learnedLv + bonusLv,
          targetSkill.limitLv || targetSkill.maxLv + 10
        );
      }

      const finalRate =
        targetSkill.baseDamageRate +
        targetSkill.damageRateGrowth * (finalLv - 1);
      const finalFlat =
        targetSkill.baseFlatDamage +
        targetSkill.flatDamageGrowth * (finalLv - 1);

      const mainAtk = context.mainAtkVal || 0;
      const commonFactor = context.commonFactor || 1;

      const baseDmg = mainAtk * (finalRate / 100) + finalFlat;

      result.finalDmg = baseDmg * commonFactor;

      if (mech.ratio) result.finalDmg *= mech.ratio;
      result.extraText = `[${targetSkill.name}] 복사`;
    }
  }

  // =========================================================
  // [Specific] 이단심판관
  // =========================================================
  if (subJob === "이단심판관") {
    // 성화 (Holy Fire)
    const holyFireId = "SK_IS_14";
    const holyFireLv = userStats.skill.levels[holyFireId] || 0;

    // basic(평타), common(공용) 스킬은 성화가 묻지 않음
    const isJobSkill =
      skill.category !== "common" && skill.category !== "basic";

    if (holyFireLv > 0 && isJobSkill) {
      const bonusRate = 8 + (holyFireLv - 1);
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
