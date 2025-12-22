import { SKILL_DB } from "../data";

export const applyJobMechanics = (skill, userStats, currentDmg, context) => {
  const { subJob } = userStats.character;
  const { commonFactor, mainAtkVal, tpMultiplier } = context;

  // 결과값 초기화
  let result = {
    finalDmg: currentDmg,
    additionalDmg: 0,
    mechanicTransferDmg: 0, // ★ [NEW] 다른 스킬로 보낼 데미지 (성화 저금통용)
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
  // [직업: 이단심판관]
  // =========================================================
  if (subJob === "이단심판관") {
    // -------------------------------------------------------
    // 1. 성화(Holy Fire) : 데미지를 계산해서 '저금통'으로 보냄
    // -------------------------------------------------------
    const holyFireId = "SK_IS_14";
    const holyFireLv = userStats.skill.levels[holyFireId] || 0;

    // basic, common 제외하고 전직 스킬에만 적용
    const isJobSkill =
      skill.category !== "common" && skill.category !== "basic";

    // 1. 성화(Holy Fire)
    if (holyFireLv > 0 && isJobSkill) {
      const bonusRate = 8 + (holyFireLv - 1);
      const bonusDmg = currentDmg * (bonusRate / 100);

      result.mechanicTransferDmg = bonusDmg;
      result.transferTargetId = "SK_IS_14"; // ★ [NEW] 배달 받을 스킬 ID 명시

      // 텍스트는 표시 (UI에서는 +XX% 보임)
      const txt = `성화(+${bonusRate}%)`;
      result.extraText = result.extraText ? `${result.extraText}, ${txt}` : txt;
    }

    // -------------------------------------------------------
    // 2. 정수 뿌리기 : 대소문자 변수명 수정 완료
    // -------------------------------------------------------
    if (mech && mech.type === "copy_damage") {
      const targetId = mech.targetId;
      const targetSkill = SKILL_DB.find((s) => s.id === targetId);

      if (targetSkill) {
        const targetLv = userStats.skill.levels[targetId] || targetSkill.minLv;

        // ★ [수정] data.js 변환 규칙에 맞춰 소문자(camelCase)로 변경
        // targetSkill.baseDamageRate (O) / BaseDamageRate (X)
        const finalRate =
          (targetSkill.baseDamageRate || 0) +
          (targetSkill.damageRateGrowth || 0) * (targetLv - 1);

        const finalFlat =
          (targetSkill.baseFlatDamage || 0) +
          (targetSkill.flatDamageGrowth || 0) * (targetLv - 1);

        const baseDmg = mainAtkVal * (finalRate / 100) + finalFlat;

        // TP 적용 (정수 뿌리기 자체의 TP를 따름)
        result.finalDmg = baseDmg * tpMultiplier * commonFactor;

        result.extraText = `[${targetSkill.name} Lv.${targetLv}] 복사`;
      }
    }

    // 3. 패시브 스택 표시는 동일 (생략 가능하나 유지)
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
