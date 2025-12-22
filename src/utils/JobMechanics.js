// src/utils/JobMechanics.js
import { SKILL_DB } from "../data"; // DB 경로에 맞게 수정 필요

/**
 * 직업별 특수 메커니즘을 처리하는 핵심 함수
 * @param {object} skill - 현재 계산 중인 스킬
 * @param {object} userStats - 유저 스탯 (스킬 레벨 확인용)
 * @param {number} currentDmg - (중요) 지금까지 계산된 1타 데미지
 * @param {object} context - 데미지 재계산을 위한 환경 변수들 (공통 계수 등)
 */
export const applyJobMechanics = (skill, userStats, currentDmg, context) => {
  const { subJob } = userStats.character;
  const { allSkills, commonFactor, mainAtkVal, tpMultiplier } = context;

  // 결과값 초기화 (기본값은 원본 유지)
  let result = {
    finalDmg: currentDmg,
    additionalDmg: 0,
    extraText: null,
  };

  // mechanics 데이터 파싱 (JSON 문자열 방어 코드)
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
    // 1. 성화(Holy Fire) : 전직 스킬 사용 시 추가 데미지
    // -------------------------------------------------------
    // 조건: 현재 스킬이 '전직 스킬'이어야 함 (공용/기본 스킬 제외)
    // 조건: 성화(SK_IS_14)를 배웠어야 함
    const holyFireId = "SK_IS_14";
    const holyFireLv = userStats.skill.levels[holyFireId] || 0;

    // 'basic'이나 'common'이 아닌 경우에만 적용 (데이터에 category가 있다고 가정)
    const isJobSkill =
      skill.category !== "common" && skill.category !== "basic";

    if (holyFireLv > 0 && isJobSkill) {
      // 공식: 8% + (레벨 - 1) * 1%
      // 예: 10레벨 -> 8 + 9 = 17%
      const bonusRate = 8 + (holyFireLv - 1);
      const bonusDmg = currentDmg * (bonusRate / 100);

      // 추가 데미지로 합산 (원본 딜은 그대로 두고, 추가타로 처리)
      // * 만약 원본 딜 자체가 오르는 방식이면 result.finalDmg += bonusDmg; 로 변경
      result.additionalDmg += bonusDmg;

      // 텍스트 추가 (여러 개일 수 있으니 배열 처리 추천하지만, 여기선 단순 문자열)
      result.extraText = result.extraText
        ? `${result.extraText}, 성화(+${bonusRate}%)`
        : `성화(+${bonusRate}%)`;
    }

    // -------------------------------------------------------
    // 2. 정수 뿌리기 : 다른 스킬(플레게의 정수) 데미지 복사
    // -------------------------------------------------------
    if (mech && mech.type === "copy_damage") {
      const targetId = mech.targetId; // "SK_IS_15"
      const targetSkill = allSkills.find((s) => s.id === targetId);

      if (targetSkill) {
        // [중요] 목표 스킬의 '현재 레벨'을 가져옴
        const targetLv = userStats.skill.levels[targetId] || targetSkill.minLv;

        // 목표 스킬의 계수 계산 (간이 계산)
        // 주의: App.js의 복잡한 로직을 여기서 완벽히 재현하려면 코드가 길어집니다.
        // 여기서는 '계수(%)'와 '고정뎀'을 가져와서 기본 공식만 적용합니다.

        // 성장 계수 적용
        const finalRate =
          targetSkill.BaseDamageRate +
          (targetSkill.DamageRateGrowth || 0) * (targetLv - 1);
        const finalFlat =
          targetSkill.BaseFlatDamage +
          (targetSkill.FlatDamageGrowth || 0) * (targetLv - 1);

        // 데미지 재계산 (App.js의 skillBaseDmg 공식 참조)
        const baseDmg = mainAtkVal * (finalRate / 100) + finalFlat;

        // 최종 데미지 덮어쓰기 (TP, 공통계수 등은 현재 스킬 기준 적용)
        // 만약 TP도 타겟 스킬을 따라간다면 context.tpMultiplier 대신 타겟의 TP를 계산해야 함
        result.finalDmg = baseDmg * tpMultiplier * commonFactor;

        result.extraText = `[${targetSkill.name}] 데미지 복사`;
      }
    }

    // -------------------------------------------------------
    // 3. 이단의 낙인 (패시브) : 스택 정보 표시 (UI용)
    // -------------------------------------------------------
    // 이 로직은 데미지 계산보다는 '정보 표시'에 가깝습니다.
    if (mech && mech.type === "stack_passive") {
      const myLv = userStats.skill.levels[skill.id] || 0;
      let addStack = 0;

      if (myLv >= mech.threshold) addStack = mech.max; // 7레벨 이상 8개
      else if (myLv > 0) addStack = mech.min; // 1~6레벨 7개

      if (addStack > 0) {
        result.extraText = `성화 스택 +${addStack}개`;
      }
    }
  }

  return result;
};
