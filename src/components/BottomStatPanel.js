import React from "react";
import { StatRowWithSource } from "./StatRowWithSource";

// ★ 1. 컴포넌트 이름은 대문자로 시작 (BottomStatPanel)
// ★ 2. 필요한 모든 변수와 함수를 Props로 받아옵니다.
const BottomStatPanel = ({
  finalStats,
  totalGearPoint,
  enemyLevel,
  setEnemyLevel,
  isEnemyLevelShaking,
  setIsEnemyLevelShaking,
  userStats,
  finalDamageInfo,
  setStatDetailModal, // 상세 모달 함수
  handleStatHover, // 툴팁 핸들러 1
  handleStatMove, // 툴팁 핸들러 2
  handleStatLeave, // 툴팁 핸들러 3
}) => {
  // (방어 코드) 데이터가 아직 없으면 로딩 중 표시 or 빈 화면
  if (!finalStats || !finalStats.skill) return null;

  // --- 내부 헬퍼 함수들 ---
  const fmt = (val, isPercent = false) => {
    if (val === undefined || val === null) return 0;
    const num = Number(val);
    const display = Number.isInteger(num) ? num : num.toFixed(1);
    return `${display.toLocaleString()}${isPercent ? "%" : ""}`;
  };

  const renderElInflict = (val) => {
    if (!val) return <span style={{ color: "#555" }}>없음</span>;
    const map = {
      1: { text: "화속성 공격", color: "#ff5a6a" },
      2: { text: "수속성 공격", color: "#aaddff" },
      3: { text: "명속성 공격", color: "#ffffaa" },
      4: { text: "암속성 공격", color: "#aa55ff" },
    };
    const info = map[val];
    return (
      <span style={{ color: info.color, fontWeight: "bold" }}>
        {info ? info.text : "없음"}
      </span>
    );
  };

  const getSrc = (key) => finalStats.sources?.[key] || [];

  const handleStatClick = (label, list, isPercent) => {
    setStatDetailModal({ title: label, list, isPercent });
  };

  // --- 데이터 전처리 ---
  const { fireEle, waterEle, lightEle, darkEle, highestEleAddDmg } = finalStats;
  const eleValues = {
    fire: fireEle,
    water: waterEle,
    light: lightEle,
    dark: darkEle,
  };
  const maxEleKey = Object.keys(eleValues).reduce((a, b) =>
    eleValues[a] >= eleValues[b] ? a : b
  );

  const displayFireAdd =
    finalStats.fireAddDmg + (maxEleKey === "fire" ? highestEleAddDmg : 0);
  const displayWaterAdd =
    finalStats.waterAddDmg + (maxEleKey === "water" ? highestEleAddDmg : 0);
  const displayLightAdd =
    finalStats.lightAddDmg + (maxEleKey === "light" ? highestEleAddDmg : 0);
  const displayDarkAdd =
    finalStats.darkAddDmg + (maxEleKey === "dark" ? highestEleAddDmg : 0);

  const skillData = finalStats.skill || { dmg: {}, lv: {}, cdr: {} };
  const getSortedKeys = (obj) =>
    Object.keys(obj).sort(
      (a, b) => Number(a.replace("lv", "")) - Number(b.replace("lv", ""))
    );

  // --- 화면 렌더링 ---
  return (
    <div className="bottom-stat-panel">
      {/* 1. 기본 스탯 */}
      <div className="stat-col" style={{ gap: "15px" }}>
        <div
          className="stat-group-header"
          data-tooltip={`캐릭터의 기초 강함과 장비 점수입니다.`}
        >
          기본 스탯
        </div>

        {/* 장비 포인트 */}
        <div style={{ paddingBottom: "10px", borderBottom: "1px solid #333" }}>
          <div
            className="stat-row highlight"
            style={{
              marginBottom: "6px",
              display: "block",
              borderBottom: "none",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "4px",
              }}
            >
              <span>총 장비 포인트</span>
              <span
                style={{ color: "var(--grade-exceed)", fontSize: "1.1rem" }}
              >
                {totalGearPoint.toLocaleString()}
              </span>
            </div>
            {/* ... 장비 포인트 상세 ... */}
            {(() => {
              const armorP = finalStats.gpDetails?.armor || 0;
              const accP = finalStats.gpDetails?.acc || 0;
              const specP = finalStats.gpDetails?.special || 0;
              const getGPColor = (val, type) => {
                if (type === "armor") {
                  if (val >= 5500) return "var(--grade-exceed)";
                  if (val >= 3000) return "var(--grade-epic)";
                  if (val >= 1500) return "var(--grade-unique)";
                  if (val >= 250) return "var(--grade-rare)";
                } else {
                  if (val >= 3500) return "var(--grade-exceed)";
                  if (val >= 2000) return "var(--grade-epic)";
                  if (val >= 1000) return "var(--grade-unique)";
                  if (val >= 250) return "var(--grade-rare)";
                }
                return "#fff";
              };
              return (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "0.75rem",
                    color: "#888",
                  }}
                >
                  <span>
                    방어구{" "}
                    <span
                      style={{
                        color: getGPColor(armorP, "armor"),
                        fontWeight: "bold",
                      }}
                    >
                      {armorP.toLocaleString()}
                    </span>
                  </span>
                  <span>
                    장신구{" "}
                    <span
                      style={{
                        color: getGPColor(accP, "acc"),
                        fontWeight: "bold",
                      }}
                    >
                      {accP.toLocaleString()}
                    </span>
                  </span>
                  <span>
                    특수{" "}
                    <span
                      style={{
                        color: getGPColor(specP, "spec"),
                        fontWeight: "bold",
                      }}
                    >
                      {specP.toLocaleString()}
                    </span>
                  </span>
                </div>
              );
            })()}
          </div>
        </div>

        {/* 힘/지능 & 공격력 */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            paddingBottom: "10px",
            borderBottom: "1px solid #333",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "10px",
            }}
          >
            <div>
              <StatRowWithSource
                label="힘"
                val={fmt(finalStats.strBase)}
                sourceList={getSrc("str")}
                onHover={handleStatHover}
                onMove={handleStatMove}
                onLeave={handleStatLeave}
                onClick={handleStatClick}
              />
              <StatRowWithSource
                label="힘(%)"
                val={fmt(finalStats.strInc, true)}
                sourceList={getSrc("strInc")}
                isPercent={true}
                onHover={handleStatHover}
                onMove={handleStatMove}
                onLeave={handleStatLeave}
                onClick={handleStatClick}
              />
            </div>
            <div>
              <StatRowWithSource
                label="지능"
                val={fmt(finalStats.intBase)}
                sourceList={getSrc("int")}
                onHover={handleStatHover}
                onMove={handleStatMove}
                onLeave={handleStatLeave}
                onClick={handleStatClick}
              />
              <StatRowWithSource
                label="지능(%)"
                val={fmt(finalStats.intInc, true)}
                sourceList={getSrc("intInc")}
                isPercent={true}
                onHover={handleStatHover}
                onMove={handleStatMove}
                onLeave={handleStatLeave}
                onClick={handleStatClick}
              />
            </div>
          </div>

          <div
            style={{
              background: "rgba(255, 204, 0, 0.05)",
              padding: "6px 10px",
              borderRadius: "6px",
              border: "1px solid rgba(255, 204, 0, 0.1)",
            }}
          >
            <div
              className="stat-row highlight"
              style={{
                color: "var(--text-gold)",
                borderBottom: "1px dashed rgba(255,204,0,0.2)",
                paddingBottom: "2px",
                marginBottom: "2px",
              }}
            >
              <span>최종 힘</span>
              <span style={{ fontSize: "1.05em" }}>{fmt(finalStats.str)}</span>
            </div>
            <div
              className="stat-row highlight"
              style={{
                color: "var(--text-gold)",
                borderBottom: "none",
                paddingBottom: 0,
              }}
            >
              <span>최종 지능</span>
              <span style={{ fontSize: "1.05em" }}>{fmt(finalStats.int)}</span>
            </div>
          </div>

          <div style={{ marginTop: "5px" }}>
            <StatRowWithSource
              label="물리 공격력"
              val={fmt(finalStats.physAtkBase)}
              sourceList={getSrc("physAtk")}
              onHover={handleStatHover}
              onMove={handleStatMove}
              onLeave={handleStatLeave}
              onClick={handleStatClick}
            />
            <StatRowWithSource
              label="물리 공격력(%)"
              val={fmt(finalStats.physAtkInc, true)}
              sourceList={getSrc("physAtkInc")}
              isPercent={true}
              onHover={handleStatHover}
              onMove={handleStatMove}
              onLeave={handleStatLeave}
              onClick={handleStatClick}
            />
            <div style={{ height: "4px" }}></div>
            <StatRowWithSource
              label="마법 공격력"
              val={fmt(finalStats.magAtkBase)}
              sourceList={getSrc("magAtk")}
              onHover={handleStatHover}
              onMove={handleStatMove}
              onLeave={handleStatLeave}
              onClick={handleStatClick}
            />
            <StatRowWithSource
              label="마법 공격력(%)"
              val={fmt(finalStats.magAtkInc, true)}
              sourceList={getSrc("magAtkInc")}
              isPercent={true}
              onHover={handleStatHover}
              onMove={handleStatMove}
              onLeave={handleStatLeave}
              onClick={handleStatClick}
            />
          </div>
        </div>

        {/* 크리티컬 */}
        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          <StatRowWithSource
            label="물리 크리티컬"
            val={fmt(finalStats.physCrit)}
            sourceList={getSrc("physCrit")}
            onHover={handleStatHover}
            onMove={handleStatMove}
            onLeave={handleStatLeave}
            onClick={handleStatClick}
          />
          <StatRowWithSource
            label="물리 크리티컬(%)"
            val={fmt(finalStats.physCritRate, true)}
            sourceList={getSrc("physCritRate")}
            isPercent={true}
            onHover={handleStatHover}
            onMove={handleStatMove}
            onLeave={handleStatLeave}
            onClick={handleStatClick}
          />
          <div style={{ height: "2px" }}></div>
          <StatRowWithSource
            label="마법 크리티컬"
            val={fmt(finalStats.magCrit)}
            sourceList={getSrc("magCrit")}
            onHover={handleStatHover}
            onMove={handleStatMove}
            onLeave={handleStatLeave}
            onClick={handleStatClick}
          />
          <StatRowWithSource
            label="마법 크리티컬(%)"
            val={fmt(finalStats.magCritRate, true)}
            sourceList={getSrc("magCritRate")}
            isPercent={true}
            onHover={handleStatHover}
            onMove={handleStatMove}
            onLeave={handleStatLeave}
            onClick={handleStatClick}
          />

          <div
            style={{
              background: "rgba(255, 119, 255, 0.05)",
              padding: "6px 10px",
              borderRadius: "6px",
              marginTop: "5px",
              border: "1px solid rgba(255, 119, 255, 0.1)",
            }}
          >
            <div
              className="stat-row highlight"
              style={{
                color: "var(--grade-unique)",
                borderBottom: "1px dashed rgba(255, 119, 255, 0.2)",
                paddingBottom: "2px",
                marginBottom: "2px",
              }}
            >
              <span>총 물리 크리티컬 확률(%)</span>
              <span style={{ fontSize: "1.05em" }}>
                {fmt(finalStats.realPhysCritRate, true)}
              </span>
            </div>
            <div
              className="stat-row highlight"
              style={{
                color: "var(--grade-unique)",
                borderBottom: "none",
                paddingBottom: 0,
              }}
            >
              <span>총 마법 크리티컬 확률(%)</span>
              <span style={{ fontSize: "1.05em" }}>
                {fmt(finalStats.realMagCritRate, true)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. 공격 효율 */}
      <div className="stat-col">
        <div
          className="stat-group-header"
          data-tooltip={`실질적인 데미지 딜링에 관여하는 '증가' 옵션들입니다.`}
        >
          공격 효율
        </div>

        <div className="stat-sub-group">
          <div className="sub-group-title">DAMAGE</div>
          <StatRowWithSource
            label="데미지 증가(%)"
            val={fmt(finalStats.dmgInc, true)}
            sourceList={getSrc("dmgInc")}
            isPercent={true}
            isHighlight={true}
            onHover={handleStatHover}
            onMove={handleStatMove}
            onLeave={handleStatLeave}
            onClick={handleStatClick}
          />
          <StatRowWithSource
            label="추가 데미지(%)"
            val={fmt(finalStats.addDmg, true)}
            sourceList={getSrc("addDmg")}
            isPercent={true}
            isHighlight={true}
            onHover={handleStatHover}
            onMove={handleStatMove}
            onLeave={handleStatLeave}
            onClick={handleStatClick}
          />
          <StatRowWithSource
            label="크리티컬 데미지(%)"
            val={fmt(finalStats.critDmgInc, true)}
            sourceList={getSrc("critDmgInc")}
            isPercent={true}
            isHighlight={true}
            onHover={handleStatHover}
            onMove={handleStatMove}
            onLeave={handleStatLeave}
            onClick={handleStatClick}
          />
          <StatRowWithSource
            label="최종 데미지(%)"
            val={fmt(finalStats.finalDmg, true)}
            sourceList={getSrc("finalDmg")}
            isPercent={true}
            isHighlight={true}
            onHover={handleStatHover}
            onMove={handleStatMove}
            onLeave={handleStatLeave}
            onClick={handleStatClick}
          />
          <StatRowWithSource
            label="모든 타입 피해(%)"
            val={fmt(finalStats.allTypeDmg, true)}
            sourceList={getSrc("allTypeDmg")}
            isPercent={true}
            onHover={handleStatHover}
            onMove={handleStatMove}
            onLeave={handleStatLeave}
            onClick={handleStatClick}
          />
          <StatRowWithSource
            label="카운터 데미지 증가(%)"
            val={fmt(finalStats.counterDmgInc, true)}
            sourceList={getSrc("counterDmgInc")}
            isPercent={true}
            onHover={handleStatHover}
            onMove={handleStatMove}
            onLeave={handleStatLeave}
            onClick={handleStatClick}
          />
          <StatRowWithSource
            label="카운터 공격 시 추가 데미지(%)"
            val={fmt(finalStats.counterAddDmg, true)}
            sourceList={getSrc("counterAddDmg")}
            isPercent={true}
            onHover={handleStatHover}
            onMove={handleStatMove}
            onLeave={handleStatLeave}
            onClick={handleStatClick}
          />
          <StatRowWithSource
            label="방어력 감소(%)"
            val={fmt(finalStats.defShred, true)}
            sourceList={getSrc("defShred")}
            isPercent={true}
            color="#ff5a6a"
            onHover={handleStatHover}
            onMove={handleStatMove}
            onLeave={handleStatLeave}
            onClick={handleStatClick}
          />
        </div>

        <div className="stat-sub-group" style={{ borderBottom: "none" }}>
          <div
            className="sub-group-title"
            style={{ display: "flex", justifyContent: "space-between" }}
          >
            SKILL{" "}
            <span
              style={{
                fontSize: "0.6rem",
                color: "#888",
                fontWeight: "normal",
              }}
            >
              *곱연산 적용
            </span>
          </div>

          <StatRowWithSource
            label="스킬 공격력(%)"
            val={fmt(finalStats.skillAtkInc, true)}
            sourceList={getSrc("skillAtkInc")}
            isPercent={true}
            isHighlight={true}
            onHover={handleStatHover}
            onMove={handleStatMove}
            onLeave={handleStatLeave}
            onClick={handleStatClick}
          />

          {/* ★ [NEW] 스킬 데이터 분류 및 렌더링 ★ */}
          {(() => {
            // 1. 데이터 분류
            const lvKeys = [];
            const exactKeys = [];

            Object.keys(skillData.dmg).forEach((key) => {
              if (key.startsWith("lv")) lvKeys.push(key);
              else if (key.startsWith("exact_")) exactKeys.push(key);
            });

            // 2. 정렬
            lvKeys.sort(
              (a, b) =>
                Number(a.replace("lv", "")) - Number(b.replace("lv", ""))
            );
            exactKeys.sort(); // 이름순 정렬

            return (
              <>
                {/* (A) 레벨별 스공 (기존) */}
                {lvKeys.map((key) => {
                  const val = skillData.dmg[key];
                  if (val === 0) return null;
                  const lv = key.replace("lv", "");
                  const color = val < 0 ? "#ff5a6a" : "#fff";
                  return (
                    <StatRowWithSource
                      key={`sd-${key}`}
                      label={`스킬 공격력 ${lv}Lv`}
                      val={fmt(val, true)}
                      sourceList={getSrc(`skill_dmg_${key}`)}
                      isPercent={true}
                      color={color}
                      onHover={handleStatHover}
                      onMove={handleStatMove}
                      onLeave={handleStatLeave}
                      onClick={handleStatClick}
                    />
                  );
                })}

                {/* (B) ★ [추가됨] 특정 스킬 스공 */}
                {exactKeys.map((key) => {
                  const val = skillData.dmg[key];
                  if (val === 0) return null;

                  // "exact_체이서프레스" -> "체이서프레스"
                  const name = key.replace("exact_", "");
                  const color = val < 0 ? "#ff5a6a" : "#fff";

                  return (
                    <StatRowWithSource
                      key={`sd-${key}`}
                      label={`${name} 스킬 공격력`} // 라벨에 이름 표시
                      val={fmt(val, true)}
                      // 툴팁 키는 App.js에서 uiKey와 동일하게 매칭해뒀으므로 그대로 사용
                      sourceList={getSrc(key)}
                      isPercent={true}
                      color={color}
                      onHover={handleStatHover}
                      onMove={handleStatMove}
                      onLeave={handleStatLeave}
                      onClick={handleStatClick}
                    />
                  );
                })}
              </>
            );
          })()}
          {getSortedKeys(skillData.lv).map((key) => {
            const val = skillData.lv[key];
            if (!val) return null;
            const lv = key.replace("lv", "");
            return (
              <StatRowWithSource
                key={`sl-${key}`}
                label={`스킬 레벨 ${lv}Lv`}
                val={`+${val}`}
                sourceList={getSrc(`skill_lv_${key}`)}
                color="#00ff00"
                onHover={handleStatHover}
                onMove={handleStatMove}
                onLeave={handleStatLeave}
                onClick={handleStatClick}
              />
            );
          })}
          {getSortedKeys(skillData.cdr).map((key) => {
            const val = skillData.cdr[key];
            if (!val) return null;
            const lv = key.replace("lv", "");
            return (
              <StatRowWithSource
                key={`sc-${key}`}
                label={`쿨타임 감소 ${lv}Lv`}
                val={`${val}%`}
                sourceList={getSrc(`skill_cdr_${key}`)}
                color="#aaddff"
                onHover={handleStatHover}
                onMove={handleStatMove}
                onLeave={handleStatLeave}
                onClick={handleStatClick}
              />
            );
          })}
        </div>
      </div>

      {/* 3. 속성 및 상태이상 */}
      <div className="stat-col">
        <div
          className="stat-group-header"
          data-tooltip={`속성 강화와 상태이상 데미지입니다.`}
        >
          속성 & 상태이상
        </div>
        <div className="stat-sub-group">
          <div className="sub-group-title">ELEMENT</div>
          <div className="stat-row">
            <span>속성 부여</span>
            <span style={{ fontSize: "0.8rem" }}>
              {renderElInflict(finalStats.elInflict1)}
              {finalStats.elInflict2 ? (
                <>, {renderElInflict(finalStats.elInflict2)}</>
              ) : (
                ""
              )}
            </span>
          </div>
          <StatRowWithSource
            label="화속성 강화"
            val={fmt(finalStats.fireEle)}
            sourceList={getSrc("fireEle")}
            onHover={handleStatHover}
            onMove={handleStatMove}
            onLeave={handleStatLeave}
            onClick={handleStatClick}
          />
          <StatRowWithSource
            label="수속성 강화"
            val={fmt(finalStats.waterEle)}
            sourceList={getSrc("waterEle")}
            onHover={handleStatHover}
            onMove={handleStatMove}
            onLeave={handleStatLeave}
            onClick={handleStatClick}
          />
          <StatRowWithSource
            label="명속성 강화"
            val={fmt(finalStats.lightEle)}
            sourceList={getSrc("lightEle")}
            onHover={handleStatHover}
            onMove={handleStatMove}
            onLeave={handleStatLeave}
            onClick={handleStatClick}
          />
          <StatRowWithSource
            label="암속성 강화"
            val={fmt(finalStats.darkEle)}
            sourceList={getSrc("darkEle")}
            onHover={handleStatHover}
            onMove={handleStatMove}
            onLeave={handleStatLeave}
            onClick={handleStatClick}
          />

          <StatRowWithSource
            label="화속성 추가 데미지(%)"
            val={fmt(displayFireAdd, true)}
            sourceList={[
              ...getSrc("fireAddDmg"),
              ...(maxEleKey === "fire" ? getSrc("highestEleAddDmg") : []),
            ]}
            isPercent={true}
            onHover={handleStatHover}
            onMove={handleStatMove}
            onLeave={handleStatLeave}
            onClick={handleStatClick}
          />
          <StatRowWithSource
            label="수속성 추가 데미지(%)"
            val={fmt(displayWaterAdd, true)}
            sourceList={[
              ...getSrc("waterAddDmg"),
              ...(maxEleKey === "water" ? getSrc("highestEleAddDmg") : []),
            ]}
            isPercent={true}
            onHover={handleStatHover}
            onMove={handleStatMove}
            onLeave={handleStatLeave}
            onClick={handleStatClick}
          />
          <StatRowWithSource
            label="명속성 추가 데미지(%)"
            val={fmt(displayLightAdd, true)}
            sourceList={[
              ...getSrc("lightAddDmg"),
              ...(maxEleKey === "light" ? getSrc("highestEleAddDmg") : []),
            ]}
            isPercent={true}
            onHover={handleStatHover}
            onMove={handleStatMove}
            onLeave={handleStatLeave}
            onClick={handleStatClick}
          />
          <StatRowWithSource
            label="암속성 추가 데미지(%)"
            val={fmt(displayDarkAdd, true)}
            sourceList={[
              ...getSrc("darkAddDmg"),
              ...(maxEleKey === "dark" ? getSrc("highestEleAddDmg") : []),
            ]}
            isPercent={true}
            onHover={handleStatHover}
            onMove={handleStatMove}
            onLeave={handleStatLeave}
            onClick={handleStatClick}
          />
        </div>

        <div className="stat-sub-group" style={{ borderBottom: "none" }}>
          <div className="sub-group-title">STATUS</div>
          <StatRowWithSource
            label="출혈 데미지(%)"
            val={fmt(finalStats.bleedDmg, true)}
            sourceList={getSrc("bleedDmg")}
            isPercent={true}
            onHover={handleStatHover}
            onMove={handleStatMove}
            onLeave={handleStatLeave}
            onClick={handleStatClick}
          />
          <StatRowWithSource
            label="중독 데미지(%)"
            val={fmt(finalStats.poisonDmg, true)}
            sourceList={getSrc("poisonDmg")}
            isPercent={true}
            onHover={handleStatHover}
            onMove={handleStatMove}
            onLeave={handleStatLeave}
            onClick={handleStatClick}
          />
          <StatRowWithSource
            label="화상 데미지(%)"
            val={fmt(finalStats.burnDmg, true)}
            sourceList={getSrc("burnDmg")}
            isPercent={true}
            onHover={handleStatHover}
            onMove={handleStatMove}
            onLeave={handleStatLeave}
            onClick={handleStatClick}
          />
          <StatRowWithSource
            label="감전 데미지(%)"
            val={fmt(finalStats.shockDmg, true)}
            sourceList={getSrc("shockDmg")}
            isPercent={true}
            onHover={handleStatHover}
            onMove={handleStatMove}
            onLeave={handleStatLeave}
            onClick={handleStatClick}
          />

          <StatRowWithSource
            label="출혈 데미지 증가(%)"
            val={fmt(finalStats.bleedInc, true)}
            sourceList={getSrc("bleedInc")}
            isPercent={true}
            onHover={handleStatHover}
            onMove={handleStatMove}
            onLeave={handleStatLeave}
            onClick={handleStatClick}
          />
          <StatRowWithSource
            label="중독 데미지 증가(%)"
            val={fmt(finalStats.poisonInc, true)}
            sourceList={getSrc("poisonInc")}
            isPercent={true}
            onHover={handleStatHover}
            onMove={handleStatMove}
            onLeave={handleStatLeave}
            onClick={handleStatClick}
          />
          <StatRowWithSource
            label="화상 데미지 증가(%)"
            val={fmt(finalStats.burnInc, true)}
            sourceList={getSrc("burnInc")}
            isPercent={true}
            onHover={handleStatHover}
            onMove={handleStatMove}
            onLeave={handleStatLeave}
            onClick={handleStatClick}
          />
          <StatRowWithSource
            label="감전 데미지 증가(%)"
            val={fmt(finalStats.shockInc, true)}
            sourceList={getSrc("shockInc")}
            isPercent={true}
            onHover={handleStatHover}
            onMove={handleStatMove}
            onLeave={handleStatLeave}
            onClick={handleStatClick}
          />
        </div>
      </div>

      {/* 4. 생존 및 유틸 */}
      <div className="stat-col">
        <div
          className="stat-group-header"
          data-tooltip={`생존력과 유틸리티 스탯입니다.`}
        >
          생존 & 유틸
        </div>
        <StatRowWithSource
          label="HP MAX"
          val={fmt(finalStats.hpMax)}
          sourceList={getSrc("hpMax")}
          onHover={handleStatHover}
          onMove={handleStatMove}
          onLeave={handleStatLeave}
          onClick={handleStatClick}
        />
        <StatRowWithSource
          label="MP MAX"
          val={fmt(finalStats.mpMax)}
          sourceList={getSrc("mpMax")}
          onHover={handleStatHover}
          onMove={handleStatMove}
          onLeave={handleStatLeave}
          onClick={handleStatClick}
        />
        <StatRowWithSource
          label="물리 방어력"
          val={fmt(finalStats.physDef)}
          sourceList={getSrc("physDef")}
          onHover={handleStatHover}
          onMove={handleStatMove}
          onLeave={handleStatLeave}
          onClick={handleStatClick}
        />
        <StatRowWithSource
          label="마법 방어력"
          val={fmt(finalStats.magDef)}
          sourceList={getSrc("magDef")}
          onHover={handleStatHover}
          onMove={handleStatMove}
          onLeave={handleStatLeave}
          onClick={handleStatClick}
        />
        <StatRowWithSource
          label="정신력"
          val={fmt(finalStats.spirit)}
          sourceList={getSrc("spirit")}
          onHover={handleStatHover}
          onMove={handleStatMove}
          onLeave={handleStatLeave}
          onClick={handleStatClick}
        />
        <StatRowWithSource
          label="물리 데미지 감소(%)"
          val={fmt(finalStats.physDmgRed, true)}
          sourceList={getSrc("physDmgRed")}
          isPercent={true}
          onHover={handleStatHover}
          onMove={handleStatMove}
          onLeave={handleStatLeave}
          onClick={handleStatClick}
        />
        <StatRowWithSource
          label="마법 데미지 감소(%)"
          val={fmt(finalStats.magDmgRed, true)}
          sourceList={getSrc("magDmgRed")}
          isPercent={true}
          onHover={handleStatHover}
          onMove={handleStatMove}
          onLeave={handleStatLeave}
          onClick={handleStatClick}
        />

        <div style={{ marginTop: "10px" }}>
          <StatRowWithSource
            label="화속성 저항"
            val={fmt(finalStats.fireRes)}
            sourceList={getSrc("fireRes")}
            onHover={handleStatHover}
            onMove={handleStatMove}
            onLeave={handleStatLeave}
            onClick={handleStatClick}
          />
          <StatRowWithSource
            label="수속성 저항"
            val={fmt(finalStats.waterRes)}
            sourceList={getSrc("waterRes")}
            onHover={handleStatHover}
            onMove={handleStatMove}
            onLeave={handleStatLeave}
            onClick={handleStatClick}
          />
          <StatRowWithSource
            label="명속성 저항"
            val={fmt(finalStats.lightRes)}
            sourceList={getSrc("lightRes")}
            onHover={handleStatHover}
            onMove={handleStatMove}
            onLeave={handleStatLeave}
            onClick={handleStatClick}
          />
          <StatRowWithSource
            label="암속성 저항"
            val={fmt(finalStats.darkRes)}
            sourceList={getSrc("darkRes")}
            onHover={handleStatHover}
            onMove={handleStatMove}
            onLeave={handleStatLeave}
            onClick={handleStatClick}
          />
        </div>

        <div style={{ marginTop: "10px" }}>
          <StatRowWithSource
            label="공격 속도(%)"
            val={fmt(finalStats.atkSpeed, true)}
            sourceList={getSrc("atkSpeed")}
            isPercent={true}
            isHighlight={true}
            onHover={handleStatHover}
            onMove={handleStatMove}
            onLeave={handleStatLeave}
            onClick={handleStatClick}
          />
          <StatRowWithSource
            label="캐스팅 속도(%)"
            val={fmt(finalStats.castSpeed, true)}
            sourceList={getSrc("castSpeed")}
            isPercent={true}
            isHighlight={true}
            onHover={handleStatHover}
            onMove={handleStatMove}
            onLeave={handleStatLeave}
            onClick={handleStatClick}
          />
          <StatRowWithSource
            label="이동 속도(%)"
            val={fmt(finalStats.moveSpeed, true)}
            sourceList={getSrc("moveSpeed")}
            isPercent={true}
            isHighlight={true}
            onHover={handleStatHover}
            onMove={handleStatMove}
            onLeave={handleStatLeave}
            onClick={handleStatClick}
          />
        </div>

        <div style={{ marginTop: "10px" }}>
          <StatRowWithSource
            label="적중"
            val={fmt(finalStats.hit)}
            sourceList={getSrc("hit")}
            onHover={handleStatHover}
            onMove={handleStatMove}
            onLeave={handleStatLeave}
            onClick={handleStatClick}
          />
          <StatRowWithSource
            label="적중 확률(%)"
            val={fmt(finalStats.hitRate, true)}
            sourceList={getSrc("hitRate")}
            isPercent={true}
            onHover={handleStatHover}
            onMove={handleStatMove}
            onLeave={handleStatLeave}
            onClick={handleStatClick}
          />
          <StatRowWithSource
            label="회피"
            val={fmt(finalStats.evasion)}
            sourceList={getSrc("evasion")}
            onHover={handleStatHover}
            onMove={handleStatMove}
            onLeave={handleStatLeave}
            onClick={handleStatClick}
          />
          <StatRowWithSource
            label="회피 확률(%)"
            val={fmt(finalStats.evasionRate, true)}
            sourceList={getSrc("evasionRate")}
            isPercent={true}
            onHover={handleStatHover}
            onMove={handleStatMove}
            onLeave={handleStatLeave}
            onClick={handleStatClick}
          />
        </div>

        <div className="stat-row highlight">
          <span>슈퍼아머</span>
          <span style={{ color: finalStats.superArmor ? "#00ff00" : "#555" }}>
            {finalStats.superArmor ? "적용" : "미적용"}
          </span>
        </div>
      </div>

      {/* 5. 최종 결과 (적 레벨 UI 포함) */}
      <div className="stat-col last-col">
        {/* 1. 헤더 수정: 불필요한 style 속성 제거로 높이 맞춤 */}
        <div className="stat-group-header">
          <span>데미지 분석</span>
        </div>

        {/* 2. 옵션 상태 표시 (기존 코드 유지) */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-around",
            width: "100%",
            marginBottom: "10px",
            fontSize: "0.75rem",
            background: "rgba(0,0,0,0.3)",
            padding: "6px",
            borderRadius: "4px",
          }}
        >
          {/* ... (카운터/백어택/투함포 표시 로직) ... */}
          {(() => {
            const { counter, backAttack, potion } =
              userStats.damageOptions || {};
            return (
              <>
                <span>
                  카운터{" "}
                  <span
                    style={{
                      color: counter ? "#00ff00" : "#555",
                      fontWeight: "bold",
                    }}
                  >
                    {counter ? "ON" : "OFF"}
                  </span>
                </span>
                <span style={{ color: "#333" }}>|</span>
                <span>
                  백어택{" "}
                  <span
                    style={{
                      color: backAttack ? "#00ff00" : "#555",
                      fontWeight: "bold",
                    }}
                  >
                    {backAttack ? "ON" : "OFF"}
                  </span>
                </span>
                <span style={{ color: "#333" }}>|</span>
                <span>
                  투함포{" "}
                  <span
                    style={{
                      color: potion ? "#00ff00" : "#555",
                      fontWeight: "bold",
                    }}
                  >
                    {potion ? "ON" : "OFF"}
                  </span>
                </span>
              </>
            );
          })()}
        </div>
        <div className="dmg-box">
          <div className="dmg-label">1분당 스킬 데미지</div>
          <div className="dmg-val">
            {finalDamageInfo.normal.toLocaleString()}
          </div>
        </div>
        <div className="plus-sign">+</div>
        <div className="dmg-box">
          <div className="dmg-label">1분당 상태이상 데미지</div>
          <div className="dmg-val" style={{ color: "#ff77ff" }}>
            {finalDamageInfo.status.toLocaleString()}
          </div>
        </div>
        <div className="total-dmg-box">
          <div className="total-label">1분당 총 합산 데미지</div>
          <div className="total-val">
            {finalDamageInfo.total.toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
};

// ★ 3. 외부로 수출 (Export)
export default BottomStatPanel;
