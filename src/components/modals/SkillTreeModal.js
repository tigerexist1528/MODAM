import React, { useEffect, useState } from "react";

// ★ 경로 주의: data.js와 utils/data.js의 위치에 맞춰 import 하세요.
// 보통 DB는 data.js에, 상수는 utils/data.js에 있습니다.
import { SKILL_DB } from "../../data"; 
import { IMAGE_BASE_URL, PLACEHOLDER_IMG } from "../../utils/data";

// 1. 함수 이름을 컴포넌트답게 변경 (SkillTreeModal)
// 2. 필요한 데이터들을 Props로 받습니다 ({ userStats, finalStats, updateStat, close })
const SkillTreeModal = ({ userStats, finalStats, updateStat, close }) => {
  
  // 경고 모달 상태 (App.js에서 이사옴)
  const [pendingSkillReset, setPendingSkillReset] = useState(null);

  const { baseJob, subJob, level: charLevel } = userStats.character;
  const { masterContract } = userStats.training;

  // --- [방어 로직] 직업 선택 안 했을 때 ---
  if (!subJob) {
    return (
      <div className="item-picker-modal" style={{ zIndex: 30000 }} onClick={close}>
        <div className="alert-modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="alert-message">
            ⚠️<br />직업을 먼저 선택해주세요.
          </div>
          <button className="alert-btn" onClick={close}>확인</button>
        </div>
      </div>
    );
  }

  // 1. 레벨링 데이터 준비
  const levelingMap = {};
  if (finalStats && finalStats.skill && finalStats.skill.lv) {
    Object.entries(finalStats.skill.lv).forEach(([key, val]) => {
      const levelNum = Number(key.replace("lv", ""));
      if (!isNaN(levelNum) && levelNum > 0) levelingMap[levelNum] = val;
    });
  }

  // 2. 스킬 데이터 정렬
  const allMySkills = SKILL_DB.filter((s) => {
    const isJob = String(s.jobGroup).replace(/\s/g, "") === String(baseJob).replace(/\s/g, "");
    const isSub = String(s.jobName).replace(/\s/g, "") === String(subJob).replace(/\s/g, "") || s.jobName === "공용";
    return isJob && isSub;
  });

  const sortSk = (a, b) => {
    if (a.startLv !== b.startLv) return a.startLv - b.startLv;
    if (a.rowIndex !== b.rowIndex) return a.rowIndex - b.rowIndex;
    return a.id - b.id;
  };

  const commonSkills = allMySkills.filter((s) => s.category === "common").sort(sortSk);
  const basicSkills = allMySkills.filter((s) => s.category === "basic").sort(sortSk);
  const normalSkills = allMySkills.filter((s) => s.category !== "common" && s.category !== "basic").sort(sortSk);
  const distinctLevels = [...new Set(normalSkills.map((s) => s.startLv))].sort((a, b) => a - b);

  // 3. SP/TP 계산
  const MAX_SP = 13770;
  const MAX_TP = 40;
  let usedSP = 0;
  let usedTP = 0;

  allMySkills.forEach((s) => {
    const lv = userStats.skill.levels[s.id] || s.minLv;
    const tp = userStats.skill.tpLevels[s.id] || 0;
    const isSingle = s.minLv === 1 && s.maxLv === 1;

    if (!isSingle) usedSP += Math.max(0, lv - s.minLv) * s.spCost;
    usedTP += tp * s.tpCost;
  });

  const remainSP = MAX_SP - usedSP;
  const remainTP = MAX_TP - usedTP;
  const getRealStartLv = (s) => Math.max(1, s.startLv - (masterContract ? 5 : 0));

  // 4. 핸들러
  const handleLevelChange = (skill, delta, isShift) => {
    if (skill.minLv === 1 && skill.maxLv === 1) return;
    const cur = userStats.skill.levels[skill.id] || skill.minLv;
    const realStartLv = getRealStartLv(skill);
    const levelLimit = Math.floor((charLevel - realStartLv) / skill.levelStep) + 1;
    const realMax = Math.max(0, Math.min(skill.maxLv, levelLimit));
    const curTp = userStats.skill.tpLevels[skill.id] || 0;

    let next = cur;
    if (isShift) {
      if (delta > 0) {
        const maxPossibleBySP = Math.floor(remainSP / skill.spCost) + cur;
        next = Math.min(realMax, maxPossibleBySP);
      } else {
        next = skill.minLv;
      }
    } else {
      next = Math.max(skill.minLv, Math.min(realMax, cur + delta));
    }

    if (next === skill.minLv && cur > skill.minLv && curTp > 0) {
      setPendingSkillReset(skill);
      return;
    }

    if (next === cur) return;
    if (next > cur && (next - cur) * skill.spCost > remainSP) return;
    
    // props로 받은 updateStat 사용
    updateStat("skill", "levels", { ...userStats.skill.levels, [skill.id]: next });
  };

  const handleTpChange = (skill, delta, isShift) => {
    if (!skill.tpCost) return;
    const cur = userStats.skill.tpLevels[skill.id] || 0;
    const curLv = userStats.skill.levels[skill.id] || skill.minLv;

    let next = cur;
    if (isShift) {
      if (delta > 0) {
        const maxPossibleByTP = Math.floor(remainTP / skill.tpCost) + cur;
        next = Math.min(5, maxPossibleByTP);
      } else {
        next = 0;
      }
    } else {
      next = Math.max(0, Math.min(5, cur + delta));
    }

    if (delta > 0 && cur === 0 && curLv === skill.minLv) {
      if (skill.spCost > remainSP) return;
      updateStat("skill", "levels", { ...userStats.skill.levels, [skill.id]: curLv + 1 });
      updateStat("skill", "tpLevels", { ...userStats.skill.tpLevels, [skill.id]: 1 });
      return;
    }

    if (next === cur) return;
    if (next > cur && (next - cur) * skill.tpCost > remainTP) return;
    updateStat("skill", "tpLevels", { ...userStats.skill.tpLevels, [skill.id]: next });
  };

  // 5. 타일 렌더링 헬퍼
  const renderSkillTile = (skill) => {
    const baseLv = userStats.skill.levels[skill.id] || skill.minLv;
    const tp = userStats.skill.tpLevels[skill.id] || 0;
    const realStartLv = getRealStartLv(skill);
    const levelLimit = Math.floor((charLevel - realStartLv) / skill.levelStep) + 1;
    const masterMax = Math.max(0, Math.min(skill.maxLv, levelLimit));
    const bonusLv = levelingMap[skill.startLv] || 0;
    const totalLv = baseLv > 0 ? Math.min(baseLv + bonusLv, skill.limitLv) : 0;
    const maxWithBonus = Math.min(masterMax + bonusLv, skill.limitLv);

    // finalStats가 없을 경우 대비
    const lvKey = `lv${skill.startLv}`;
    const specificCdrPct = finalStats?.skill?.cdr?.[lvKey] || 0;
    const finalCdrPct = Math.min(50, specificCdrPct);

    let coolText = "";
    if (skill.cooltime > 0) {
      if (finalCdrPct > 0) {
        const reduced = skill.cooltime * (1 - finalCdrPct / 100);
        const reducedStr = Number.isInteger(reduced) ? reduced : reduced.toFixed(1);
        coolText = `${reducedStr}s`;
      } else {
        coolText = `${skill.cooltime}s`;
      }
    }

    const isSingleMaster = skill.minLv === 1 && skill.maxLv === 1;
    const isTrueFixed = isSingleMaster && skill.limitLv === 1;
    const isMasterReached = baseLv >= masterMax && masterMax > 0;
    const isLocked = charLevel < realStartLv;

    let statusClass = isLocked ? "locked" : baseLv > 0 ? "active" : "inactive";
    const isBonusActive = !isTrueFixed && bonusLv > 0 && baseLv > 0;
    const levelTextClass = isBonusActive ? "text-green" : "";

    let displayText = "";
    if (isTrueFixed) displayText = "1/1";
    else if (isSingleMaster) displayText = `${totalLv}/1${bonusLv > 0 ? `(${maxWithBonus})` : ""}`;
    else displayText = baseLv === 0 ? `0/${masterMax}` : `${totalLv}/${masterMax}${bonusLv > 0 ? `(${maxWithBonus})` : ""}`;

    return (
      <div key={skill.id} className={`st-v-tile ${statusClass}`}>
        <div className="st-v-icon-box" onClick={(e) => !isLocked && !isSingleMaster && handleLevelChange(skill, 1, e.shiftKey)}>
          <img 
            src={`${IMAGE_BASE_URL}/skills/${encodeURIComponent(skill.jobName)}/${(skill.img || "default").replace(".png", "")}.png`} 
            alt="" 
            onError={(e) => (e.target.src = PLACEHOLDER_IMG)} 
          />
          {tp > 0 && <div className="st-v-tp-star">★</div>}
          <div className={`st-v-lv-text ${isMasterReached ? "master" : ""}`}>{baseLv}</div>
        </div>

        {isSingleMaster ? (
          <div className="st-v-control-bar single">
            <div className="st-v-center-info">
              <div className="st-v-skill-name">{skill.name}</div>
              <div className={`st-v-lv-display ${levelTextClass} ${isMasterReached ? "master" : ""}`}>{displayText}</div>
            </div>
          </div>
        ) : (
          <div className="st-v-control-bar">
            <div className="st-v-btn-stack sp">
              <button className="st-v-tiny-btn" disabled={isLocked || baseLv >= masterMax} onClick={(e) => { e.stopPropagation(); handleLevelChange(skill, 1, e.shiftKey); }}>▲</button>
              <span className="st-v-stack-label sp">SP</span>
              <button className="st-v-tiny-btn" disabled={isLocked || baseLv <= skill.minLv} onClick={(e) => { e.stopPropagation(); handleLevelChange(skill, -1, e.shiftKey); }}>▼</button>
            </div>
            <div className="st-v-center-info">
              <div className="st-v-skill-name">{skill.name}</div>
              <div className="st-v-meta-row">
                {skill.spCost > 0 && <span className="st-meta-tag sp">{skill.spCost}</span>}
                {skill.cooltime > 0 && <span className={`st-meta-tag cool ${finalCdrPct > 0 ? "reduced" : ""}`}>{coolText}</span>}
                {skill.tpCost > 0 && <span className="st-meta-tag tp">{skill.tpCost}</span>}
              </div>
              <div className={`st-v-lv-display ${levelTextClass} ${isMasterReached ? "master" : ""}`}>{displayText}</div>
              {skill.tpCost > 0 && <div className="st-v-tp-val">TP {tp}</div>}
            </div>
            <div className="st-v-btn-stack tp" style={{ visibility: skill.tpCost > 0 ? "visible" : "hidden" }}>
              <button className="st-v-tiny-btn" disabled={isLocked || tp >= 5} onClick={(e) => { e.stopPropagation(); handleTpChange(skill, 1, e.shiftKey); }}>▲</button>
              <span className="st-v-stack-label tp">TP</span>
              <button className="st-v-tiny-btn" disabled={isLocked || tp <= 0} onClick={(e) => { e.stopPropagation(); handleTpChange(skill, -1, e.shiftKey); }}>▼</button>
            </div>
          </div>
        )}
      </div>
    );
  };

  // 6. 경고 모달 (TP 초기화) - 컴포넌트 내부 렌더링 함수로 처리
  const renderWarningModal = () => {
    if (!pendingSkillReset) return null;

    const confirmReset = () => {
      const sId = pendingSkillReset.id;
      // 배치 업데이트처럼 동작하게 순서 주의
      updateStat("skill", "tpLevels", { ...userStats.skill.tpLevels, [sId]: 0 });
      // 바로 반영이 안 될 수 있으므로, 여기서 호출하는 updateStat은 App.js의 함수여야 함.
      // 하지만 연속 호출 시 상태 덮어쓰기 문제가 생길 수 있으므로,
      // 가장 좋은 건 App.js의 updateStat 함수가 함수형 업데이트를 지원하거나
      // 여기서 TP와 레벨을 한 번에 업데이트하는 함수를 Props로 받는 것이 좋음.
      // 일단 기존 로직대로 2번 호출 (리액트 18에서는 배칭됨)
      updateStat("skill", "levels", { ...userStats.skill.levels, [sId]: pendingSkillReset.minLv });
      setPendingSkillReset(null);
    };

    return (
      <div className="item-picker-modal" style={{ zIndex: 40000, background: "rgba(0,0,0,0.8)" }} onClick={() => setPendingSkillReset(null)}>
        <div className="alert-modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="alert-message">
            ⚠️ <br />
            <span style={{ color: "#ff5a6a" }}>{pendingSkillReset.name}</span> 스킬 레벨 초기화 시<br />
            <span style={{ color: "#ffcc00" }}>TP 레벨도 함께 초기화됩니다.</span>
          </div>
          <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
            <button className="alert-btn" style={{ background: "#444", color: "#ccc" }} onClick={() => setPendingSkillReset(null)}>취소 (Esc)</button>
            <button className="alert-btn" onClick={confirmReset}>확인 (Enter)</button>
          </div>
        </div>
      </div>
    );
  };

  // --- Main Render ---
  return (
    <div className="item-picker-modal" onClick={close}>
      <div className="picker-content skill-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="st3-header">
          <div className="st3-resource-bar">
            <div className="st-counter"><span className="st-label sp">SP</span><span className="st-val">{remainSP.toLocaleString()}</span></div>
            <div className="st-counter"><span className="st-label tp">TP</span><span className="st-val">{remainTP.toLocaleString()}</span></div>
          </div>
          <div className="st3-title-area">
            <h3>스킬트리 <span style={{ fontSize: "0.6em", color: "#666", fontWeight: "normal", marginLeft: "8px" }}>(Lv.{charLevel})</span></h3>
            <div className="st-guide-text"><span className="st-key-badge">Shift</span>+ 클릭 : 최대/최소 설정</div>
          </div>
          <button className="picker-close-btn" onClick={close}>✕</button>
        </div>

        <div className="st-vertical-body">
          {commonSkills.length > 0 && (
            <div className="st-v-band">
              <div className="st-v-level-label" style={{ fontSize: "12px", color: "#aaa" }}>공통</div>
              <div className="st-v-grid">
                {[1, 2, 3, 4, 5, 6].map((idx) => (
                  <div key={idx} className="st-v-col-stack">
                    {commonSkills.filter((s) => s.rowIndex === idx).map((s) => renderSkillTile(s))}
                  </div>
                ))}
              </div>
            </div>
          )}

          {basicSkills.length > 0 && (
            <div className="st-v-band">
              <div className="st-v-level-label" style={{ fontSize: "12px", color: "#aaa" }}>기본</div>
              <div className="st-v-grid">
                {[1, 2, 3, 4, 5, 6].map((idx) => (
                  <div key={idx} className="st-v-col-stack">
                    {basicSkills.filter((s) => s.rowIndex === idx).map((s) => renderSkillTile(s))}
                  </div>
                ))}
              </div>
            </div>
          )}

          {distinctLevels.map((lvKey) => (
            <div key={lvKey} className="st-v-band">
              <div className="st-v-level-label">{lvKey}</div>
              <div className="st-v-grid">
                {[1, 2, 3, 4, 5, 6].map((rowIdx) => {
                  const targets = normalSkills.filter((s) => s.startLv === lvKey && s.rowIndex === rowIdx);
                  return (
                    <div key={rowIdx} className="st-v-col-stack">
                      {targets.map((s) => renderSkillTile(s))}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          <div style={{ height: "100px" }}></div>
        </div>
        
        {/* 경고 모달 렌더링 */}
        {renderWarningModal()}
      </div>
    </div>
  );
};

// ★ 중요: 외부에서 사용할 수 있게 export 해줍니다.
export default SkillTreeModal;