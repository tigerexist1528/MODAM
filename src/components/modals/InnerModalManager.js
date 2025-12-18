import React from "react";

// 1. 하위 컴포넌트 Import
import { StatSlider } from "../StatSlider";
import TextFormatter from "../common/TextFormatter";
//
import SkillTreeModal from "./SkillTreeModal";
import SkillRuneModal from "./SkillRuneModal";

// 2. 데이터 Import (DB) - ★ 수정됨: data.js에서 불러옵니다.
import {
  REINFORCE_DB,
  POLISH_DB,
  MAGIC_OPTS_BY_GROUP,
  ENCHANT_LIST_BY_SLOT,
  EMBLEM_RULES,
  EMBLEM_DB,
  TRAINING_DB,
  AVATAR_DB,
  WEAPON_AVATAR_DB,
  GET_JOB_ICON,
  PLACEHOLDER_IMG,
} from "../../data";

// 3. 유틸/상수 Import (utils/data.js) - ★ 수정됨: 순수 유틸만 남김
import {
  IMAGE_BASE_URL,
  JOB_STRUCTURE,
  formatStatsToKor,
  getAvatarSummary,
  getMergedSealText,
} from "../../utils/data";

const InnerModalManager = ({
  activeModal,
  setActiveModal,
  userStats,
  setUserStats,
  editBuffer,
  setEditBuffer,
  updateStat,
  finalStats,
}) => {
  if (!activeModal.type) return null;
  const { type, slot } = activeModal;

  // 바텀시트가 처리하는 타입은 여기서 렌더링하지 않음 (중복 방지)
  if (["GEAR_PICKER", "SPECIAL_PICKER"].includes(type)) {
    return null;
  }

  // ===========================================================================
  // [1] 공통 핸들러 (닫기, 뒤로가기, 적용, 버퍼 관리)
  // ===========================================================================
  const close = () => {
    setActiveModal({ type: null, slot: null });
    setEditBuffer({});
  };

  const backToMain = () => {
    setEditBuffer({});
    if (
      ["MAGIC_POWER", "HOPAE", "BREAKTHROUGH", "CASTLE_SEAL"].includes(type)
    ) {
      setActiveModal({ type: "JOURNAL", slot: null });
    } else if (["AVATAR_SET", "AVATAR_WEAPON"].includes(type)) {
      setActiveModal({ type: "AVATAR_MAIN", slot: null });
    } else if (
      ["REINFORCE", "POLISH", "ENCHANT", "MAGIC", "EMBLEM"].includes(type)
    ) {
      if (activeModal.fromBlacksmith) {
        setActiveModal({ type: "BLACKSMITH", slot });
      } else {
        close();
      }
    } else {
      close();
    }
  };

  // ★ 데이터 저장 로직 (Deep Merge)
  const handleApply = () => {
    setUserStats((prev) => {
      const next = { ...prev };
      Object.keys(editBuffer).forEach((key) => {
        if (
          typeof editBuffer[key] === "object" &&
          !Array.isArray(editBuffer[key]) &&
          editBuffer[key] !== null
        ) {
          next[key] = { ...prev[key], ...editBuffer[key] };
        } else {
          next[key] = editBuffer[key];
        }
      });
      return next;
    });

    if (
      [
        "BLACKSMITH",
        "JOURNAL",
        "SKILL_RUNE",
        "AVATAR_MAIN",
        "SKILL_TREE",
      ].includes(type)
    ) {
      close();
    } else {
      backToMain();
    }
  };

  // 헬퍼: 성안의 봉인 버퍼 업데이트
  const updateSealBuffer = (key, val) => {
    setEditBuffer((prev) => ({
      ...prev,
      training: {
        ...(prev.training || userStats.training),
        ...prev.training,
        [key]: val,
      },
    }));
  };

  // 헬퍼: 일반 버퍼 업데이트
  const updateBuffer = (category, key, value) => {
    setEditBuffer((prev) => ({
      ...prev,
      [category]: { ...prev[category], [slot]: value },
    }));
  };

  // 헬퍼: 배열형 버퍼 업데이트 (엠블렘 등)
  const updateBufferDeep = (category, idx, value) => {
    if (idx === -1) {
      setEditBuffer((prev) => ({
        ...prev,
        [category]: { ...prev[category], [slot]: value },
      }));
      return;
    }
    const arr = [...(editBuffer[category]?.[slot] || [])];
    arr[idx] = value;
    setEditBuffer((prev) => ({
      ...prev,
      [category]: { ...prev[category], [slot]: arr },
    }));
  };

  const handleSliderChange = (key, val, max) => {
    let safeVal = Math.max(0, Math.min(val, max));
    setEditBuffer((prev) => ({
      ...prev,
      training: { ...prev.training, [key]: safeVal },
    }));
  };

  const handleResetBuffer = () => {
    const resetKeyMap = {
      REINFORCE: () => updateBuffer("reinforce", slot, 0),
      POLISH: () => updateBuffer("polish", slot, 0),
      ENCHANT: () => updateBuffer("enchant", slot, "선택 안함"),
      MAGIC: () =>
        setEditBuffer((prev) => ({
          ...prev,
          magic_unique: { ...prev.magic_unique, [slot]: "선택 안함" },
          magic_common: { ...prev.magic_common, [slot]: "선택 안함" },
        })),
      EMBLEM: () => {
        const arr = editBuffer.emblem?.[slot] || [];
        const newArr = arr.length > 0 ? arr.map(() => null) : [null, null];
        updateBufferDeep("emblem", -1, newArr);
      },
      CASTLE_SEAL: () => {
        updateSealBuffer("sealMain", "");
        updateSealBuffer("sealSub", "");
      },
    };
    if (resetKeyMap[type]) resetKeyMap[type]();
  };

  const MODAL_TITLE_MAP = {
    JOURNAL: "수련 일지",
    MAGIC_POWER: "마력 응축기",
    HOPAE: "호패 강화",
    BREAKTHROUGH: "장비 돌파",
    CASTLE_SEAL: "성안의 봉인",
    SKILL_RUNE: "스킬룬 설정",
    AVATAR_MAIN: "아바타 설정",
    AVATAR_SET: "아바타 세트",
    AVATAR_WEAPON: "무기 아바타",
    BLACKSMITH: "대장간",
    REINFORCE: "장비 강화",
    POLISH: "장비 연마",
    ENCHANT: "마법부여",
    MAGIC: "마법봉인",
    EMBLEM: "엠블렘",
  };

  const handleKeyDown = (e) => {
    e.stopPropagation();
    if (type === "JOB_SELECTOR" || type === "CLASS_SELECTOR") return;
    if (e.key === "Enter") handleApply();
    else if (e.key === "Escape") {
      if (["BLACKSMITH", "JOURNAL", "SKILL_RUNE", "AVATAR_MAIN"].includes(type))
        close();
      else backToMain();
    }
  };

  // ===========================================================================
  // [2] 독립형 모달 렌더링 (Wrapper 없이 리턴)
  // ===========================================================================

  // 1. 스킬트리
  if (type === "SKILL_TREE") {
    return (
      <div>
        <SkillTreeModal
          userStats={userStats}
          finalStats={finalStats}
          updateStat={updateStat}
          close={close}
        />
      </div>
    );
  }

  // ★ 2. 스킬 룬 (여기 넣어야 독립 모달로 뜹니다!)
  if (type === "SKILL_RUNE") {
    return (
      <SkillRuneModal
        userStats={userStats}
        close={close}
        backToMain={backToMain}
        editBuffer={editBuffer}
        setEditBuffer={setEditBuffer}
        handleApply={handleApply}
      />
    );
  }

  // 3. 직업/전직 선택
  if (type === "JOB_SELECTOR" || type === "CLASS_SELECTOR") {
    const isJob = type === "JOB_SELECTOR";
    const title = isJob ? "직업군 선택" : "전직 선택";
    const list = isJob
      ? Object.keys(JOB_STRUCTURE)
      : userStats.character.baseJob
      ? JOB_STRUCTURE[userStats.character.baseJob]
      : [];

    return (
      <div className="job-picker-modal" onClick={close}>
        <div
          className="job-picker-content"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="picker-header">
            <h3>{title}</h3>
            <button className="picker-close-btn" onClick={close}>
              ✕
            </button>
          </div>
          <div className={isJob ? "job-grid-container" : "class-row-container"}>
            {list.map((name) => (
              <div
                key={name}
                className={isJob ? "job-card" : "class-card-small"}
                onClick={() => {
                  if (isJob) {
                    // ★ [중요] 직업군 변경 시 스킬/장비 초기화 로직 유지
                    setUserStats((prev) => ({
                      ...prev,
                      character: {
                        ...prev.character,
                        baseJob: name,
                        subJob: "",
                        weaponType: "",
                      },
                      skill: { levels: {}, tpLevels: {} },
                      equipment: {
                        ...prev.equipment,
                        무기: {
                          ...prev.equipment.무기,
                          itemId: 0,
                          grade: "일반",
                          name: "",
                        },
                      },
                    }));
                  } else {
                    setUserStats((prev) => ({
                      ...prev,
                      character: { ...prev.character, subJob: name },
                      skill: { levels: {}, tpLevels: {} },
                    }));
                  }
                  close();
                }}
              >
                {isJob ? (
                  <>
                    <div className="job-icon-box">
                      <img
                        src={GET_JOB_ICON("job", name)}
                        alt={name}
                        onError={(e) => (e.target.src = PLACEHOLDER_IMG)}
                      />
                    </div>
                    <div className="job-name-tag">{name}</div>
                  </>
                ) : (
                  <>
                    <div className="class-thumb">
                      <img
                        src={GET_JOB_ICON("class", name)}
                        alt={name}
                        onError={(e) => (e.target.src = PLACEHOLDER_IMG)}
                      />
                    </div>
                    <div className="class-name-overlay">{name}</div>
                  </>
                )}
              </div>
            ))}
            {list.length === 0 && !isJob && (
              <div style={{ padding: 30, color: "#888", textAlign: "center" }}>
                직업군을 먼저 선택해주세요.
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ===========================================================================
  // [3] 내부 콘텐츠 렌더링 함수 (renderContent)
  // ===========================================================================
  const renderContent = () => {
    // --- [A] 수련일지 (JOURNAL) ---
    if (type === "JOURNAL") {
      const { concentrator, hopae, breakthrough, sealMain, sealSub } =
        userStats.training;

      const openJournalSub = (subType) => {
        setEditBuffer(JSON.parse(JSON.stringify(userStats)));
        setActiveModal({ type: subType, slot: null });
      };

      const sealText = getMergedSealText(sealMain, sealSub);

      return (
        <div className="bs-grid">
          <div className="bs-box" onClick={() => openJournalSub("MAGIC_POWER")}>
            <img
              src={`${IMAGE_BASE_URL}/journal/magic.png`}
              className="bs-icon-img"
              alt="마력"
              onError={(e) => (e.target.src = PLACEHOLDER_IMG)}
            />
            <div className="bs-title">마력 응축기</div>
            <div
              className={`bs-value-text ${concentrator > 0 ? "highlight" : ""}`}
            >
              {concentrator}단계
            </div>
          </div>
          <div className="bs-box" onClick={() => openJournalSub("HOPAE")}>
            <img
              src={`${IMAGE_BASE_URL}/journal/hopae.png`}
              className="bs-icon-img"
              alt="호패"
              onError={(e) => (e.target.src = PLACEHOLDER_IMG)}
            />
            <div className="bs-title">호패</div>
            <div className={`bs-value-text ${hopae > 0 ? "highlight" : ""}`}>
              {hopae}단계
            </div>
          </div>
          <div
            className="bs-box"
            onClick={() => openJournalSub("BREAKTHROUGH")}
          >
            <img
              src={`${IMAGE_BASE_URL}/journal/breakthrough.png`}
              className="bs-icon-img"
              alt="돌파"
              onError={(e) => (e.target.src = PLACEHOLDER_IMG)}
            />
            <div className="bs-title">돌파</div>
            <div
              className={`bs-value-text ${breakthrough > 0 ? "highlight" : ""}`}
            >
              {breakthrough}단계
            </div>
          </div>
          <div className="bs-box" onClick={() => openJournalSub("CASTLE_SEAL")}>
            <img
              src={`${IMAGE_BASE_URL}/journal/seal.png`}
              className="bs-icon-img"
              alt="성안"
              onError={(e) => (e.target.src = PLACEHOLDER_IMG)}
            />
            <div className="bs-title">성안의 봉인</div>
            <div
              className={`bs-value-text ${
                sealText !== "미설정" ? "highlight" : ""
              }`}
              style={{
                fontSize: "0.75rem",
                lineHeight: "1.2",
                padding: "0 5px",
              }}
            >
              {sealText}
            </div>
          </div>
        </div>
      );
    }

    // 슬라이더 (마력, 호패, 돌파)
    if (["MAGIC_POWER", "HOPAE", "BREAKTHROUGH"].includes(type)) {
      let key = "";
      let max = 0;
      if (type === "MAGIC_POWER") {
        key = "concentrator";
        max = 4;
      } else if (type === "HOPAE") {
        key = "hopae";
        max = 3;
      } else if (type === "BREAKTHROUGH") {
        key = "breakthrough";
        max = 10;
      }
      const val = editBuffer.training?.[key] || 0;
      return (
        <StatSlider
          value={val}
          max={max}
          onChange={(newVal) => handleSliderChange(key, newVal, max)}
          onCancel={backToMain}
          onApply={handleApply}
        />
      );
    }

    // ★ [중요] 캐릭터 레벨 슬라이더 (여기 포함됨)
    if (type === "CHAR_LEVEL") {
      return (
        <StatSlider
          value={editBuffer.training?.charLevel || 85}
          max={85}
          onChange={(val) =>
            setEditBuffer((prev) => ({
              ...prev,
              training: { ...prev.training, charLevel: val },
            }))
          }
          onCancel={close}
          onApply={() => {
            updateStat("character", "level", editBuffer.training.charLevel);
            close();
          }}
        />
      );
    }

    // 성안의 봉인
    if (type === "CASTLE_SEAL") {
      const mainVal = editBuffer.training?.sealMain || "";
      const subVal = editBuffer.training?.sealSub || "";
      const sealData = TRAINING_DB.castle_seal || { main: [], sub: [] };
      const sealOptionsMain =
        sealData.main.length > 0
          ? sealData.main
          : [{ name: "힘 +100" }, { name: "지능 +100" }];
      const sealOptionsSub =
        sealData.sub.length > 0
          ? sealData.sub
          : [{ name: "물크 +50" }, { name: "마크 +50" }];

      return (
        <div>
          <div className="magic-split-wrapper">
            <div className="magic-col-scroll">
              <div
                className="magic-section-title"
                style={{
                  position: "sticky",
                  top: 0,
                  background: "#111",
                  zIndex: 5,
                  paddingBottom: 5,
                }}
              >
                주요 옵션
              </div>
              {sealOptionsMain.map((opt) => (
                <button
                  key={opt.name}
                  className={`bs-option-btn ${
                    mainVal === opt.name ? "active" : ""
                  }`}
                  onClick={() => updateSealBuffer("sealMain", opt.name)}
                >
                  {opt.name}
                </button>
              ))}
            </div>
            <div className="magic-col-scroll">
              <div
                className="magic-section-title common"
                style={{
                  position: "sticky",
                  top: 0,
                  background: "#111",
                  zIndex: 5,
                  paddingBottom: 5,
                }}
              >
                보조 옵션
              </div>
              {sealOptionsSub.map((opt) => (
                <button
                  key={opt.name}
                  className={`bs-option-btn ${
                    subVal === opt.name ? "active" : ""
                  }`}
                  onClick={() => updateSealBuffer("sealSub", opt.name)}
                >
                  {opt.name}
                </button>
              ))}
            </div>
          </div>
          <div className="modal-footer-btns">
            <button className="action-btn btn-cancel" onClick={backToMain}>
              취소 (ESC)
            </button>
            <button
              className="action-btn btn-reset"
              onClick={() => {
                updateSealBuffer("sealMain", "");
                updateSealBuffer("sealSub", "");
              }}
            >
              초기화
            </button>
            <button className="action-btn btn-apply" onClick={handleApply}>
              적용 (Enter)
            </button>
          </div>
        </div>
      );
    }

    // --- [B] 아바타 (메인) ---
    if (type === "AVATAR_MAIN") {
      const currentSet = userStats.avatarSettings.set;
      const currentWpn = userStats.avatarSettings.weapon;
      return (
        <div className="bs-grid" style={{ padding: "40px 20px" }}>
          <div
            className="bs-box"
            onClick={() => setActiveModal({ type: "AVATAR_SET", slot: null })}
          >
            <img
              src={`${IMAGE_BASE_URL}/icons/아바타세트.png`}
              className="bs-icon-img"
              alt="세트"
              onError={(e) => (e.target.src = PLACEHOLDER_IMG)}
            />
            <div className="bs-title">아바타 세트</div>
            <div
              className={`bs-value-text ${
                currentSet !== "없음" ? "highlight" : ""
              }`}
            >
              <TextFormatter text={currentSet} />
            </div>
          </div>
          <div
            className="bs-box"
            onClick={() =>
              setActiveModal({ type: "AVATAR_WEAPON", slot: null })
            }
          >
            <img
              src={`${IMAGE_BASE_URL}/icons/무기아바타.png`}
              className="bs-icon-img"
              alt="무기"
              onError={(e) => (e.target.src = PLACEHOLDER_IMG)}
            />
            <div className="bs-title">무기 아바타</div>
            <div
              className={`bs-value-text ${
                currentWpn !== "없음" ? "highlight" : ""
              }`}
            >
              <TextFormatter text={currentWpn} />
            </div>
          </div>
        </div>
      );
    }

    // 아바타 세트 목록
    if (type === "AVATAR_SET") {
      const { set } = userStats.avatarSettings;
      const options = ["없음", ...Object.keys(AVATAR_DB)];
      return (
        <div>
          <div
            className="card-grid"
            style={{ padding: "20px", maxHeight: "400px", overflowY: "auto" }}
          >
            {options.map((optName) => {
              const statInfo = AVATAR_DB[optName];
              return (
                <div
                  key={optName}
                  className={`item-card ${set === optName ? "active" : ""}`}
                  onClick={() => {
                    updateStat("avatarSettings", "set", optName);
                    backToMain();
                  }}
                >
                  <div className="card-info">
                    <div
                      className="card-name"
                      style={{ textAlign: "center", lineHeight: "1.4" }}
                    >
                      <TextFormatter text={optName} />
                    </div>
                    {statInfo && (
                      <div
                        className="card-set"
                        style={{
                          textAlign: "center",
                          marginTop: 6,
                          fontSize: "0.75rem",
                          color: "#888",
                        }}
                      >
                        {getAvatarSummary(statInfo)}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="modal-footer-btns">
            <button className="action-btn btn-cancel" onClick={backToMain}>
              취소 (ESC)
            </button>
          </div>
        </div>
      );
    }

    // 무기 아바타 목록
    if (type === "AVATAR_WEAPON") {
      const { weapon } = userStats.avatarSettings;
      const options =
        WEAPON_AVATAR_DB && WEAPON_AVATAR_DB.length > 0
          ? WEAPON_AVATAR_DB
          : [{ name: "없음" }];
      return (
        <div>
          <div
            className="card-grid"
            style={{ padding: "20px", maxHeight: "400px", overflowY: "auto" }}
          >
            {options.map((opt) => (
              <div
                key={opt.name}
                className={`item-card ${weapon === opt.name ? "active" : ""}`}
                onClick={() => {
                  updateStat("avatarSettings", "weapon", opt.name);
                  backToMain();
                }}
              >
                <div className="card-info">
                  <div
                    className="card-name"
                    style={{ textAlign: "center", lineHeight: "1.4" }}
                  >
                    <TextFormatter text={opt.name} />
                  </div>
                  {opt.stats && (
                    <div
                      className="card-set"
                      style={{
                        textAlign: "center",
                        marginTop: 6,
                        color: "#aaa",
                        fontSize: "0.8rem",
                      }}
                    >
                      {formatStatsToKor(opt.stats)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="modal-footer-btns">
            <button className="action-btn btn-cancel" onClick={backToMain}>
              취소 (ESC)
            </button>
          </div>
        </div>
      );
    }

    // --- [D] 대장간 ---
    if (type === "BLACKSMITH") {
      const rVal = userStats.reinforce[slot] || 0;
      const pVal = userStats.polish[slot] || 0;
      const eVal = userStats.enchant[slot];
      const mUni = userStats.magic_unique[slot];
      const mCom = userStats.magic_common[slot];
      const isEnch = eVal && eVal !== "선택 안함";
      const isMagic =
        (mUni && mUni !== "선택 안함") || (mCom && mCom !== "선택 안함");
      let magicText = "미설정";
      if (isMagic)
        magicText =
          mUni !== "선택 안함" && mCom !== "선택 안함"
            ? `${mUni} / ${mCom}`
            : mUni !== "선택 안함"
            ? mUni
            : mCom;

      const isTitle = slot === "칭호";
      const isWeapon = slot === "무기";
      const isSub = slot === "보조장비";
      const showReinforce = !isTitle;
      const showPolish = !isTitle && (isWeapon || isSub);
      const showMagic = !isTitle;

      return (
        <div className="bs-grid">
          {showReinforce && (
            <div
              className="bs-box"
              onClick={() => {
                setEditBuffer({ ...userStats });
                setActiveModal({
                  type: "REINFORCE",
                  slot,
                  fromBlacksmith: true,
                });
              }}
            >
              <div className="bs-icon">🔨</div>
              <div className="bs-title">강화</div>
              <div className={`bs-value-text ${rVal > 0 ? "highlight" : ""}`}>
                {rVal > 0 ? `+${rVal}강` : "0강"}
              </div>
            </div>
          )}
          {showPolish && (
            <div
              className="bs-box"
              onClick={() => {
                setEditBuffer({ ...userStats });
                setActiveModal({ type: "POLISH", slot, fromBlacksmith: true });
              }}
            >
              <div className="bs-icon">🔥</div>
              <div className="bs-title">연마</div>
              <div className={`bs-value-text ${pVal > 0 ? "highlight" : ""}`}>
                {pVal > 0 ? `${pVal}연마` : "0연마"}
              </div>
            </div>
          )}
          <div
            className="bs-box"
            onClick={() => {
              setEditBuffer({ ...userStats });
              setActiveModal({ type: "ENCHANT", slot, fromBlacksmith: true });
            }}
          >
            <div className="bs-icon">🂠</div>
            <div className="bs-title">마법부여</div>
            <div className={`bs-value-text ${isEnch ? "highlight" : ""}`}>
              {isEnch ? eVal : "미설정"}
            </div>
          </div>
          {showMagic && (
            <div
              className="bs-box"
              onClick={() => {
                setEditBuffer({ ...userStats });
                setActiveModal({ type: "MAGIC", slot, fromBlacksmith: true });
              }}
            >
              <div className="bs-icon">💎</div>
              <div className="bs-title">마법봉인</div>
              <div className={`bs-value-text ${isMagic ? "highlight" : ""}`}>
                {magicText}
              </div>
            </div>
          )}
          <div
            className="bs-box"
            onClick={() => {
              setEditBuffer({ ...userStats });
              setActiveModal({ type: "EMBLEM", slot, fromBlacksmith: true });
            }}
          >
            <div className="bs-icon">🛡️</div>
            <div className="bs-title">엠블렘</div>
            <div
              className="bs-value-text"
              style={{
                display: "flex",
                gap: "5px",
                justifyContent: "center",
                marginTop: "5px",
              }}
            >
              {(() => {
                const embs = Array.isArray(userStats.emblem[slot])
                  ? userStats.emblem[slot]
                  : [];
                const equippedEmbs = embs.filter((e) => e);
                if (equippedEmbs.length === 0) return "설정";
                return equippedEmbs.map((e, i) => (
                  <div key={i} className="mini-emblem-box">
                    <img
                      src={`${IMAGE_BASE_URL}/emblems/${e.img}.png`}
                      className="mini-emblem-img"
                      alt=""
                      onError={(e) => (e.target.src = PLACEHOLDER_IMG)}
                    />
                    <div className="mini-emblem-lv">{e.level}</div>
                  </div>
                ));
              })()}
            </div>
          </div>
        </div>
      );
    }

    // 강화
    if (type === "REINFORCE") {
      const val = editBuffer.reinforce?.[slot] || 0;
      return (
        <div>
          <div className="grid-5-col">
            {[...Array(20)].map((_, i) => (
              <button
                key={i + 1}
                className={`bs-option-btn ${val === i + 1 ? "active" : ""}`}
                onClick={() => updateBuffer("reinforce", slot, i + 1)}
              >
                +{i + 1}
              </button>
            ))}
          </div>
          <div className="modal-footer-btns">
            <button className="action-btn btn-cancel" onClick={backToMain}>
              취소 (ESC)
            </button>
            <button
              className="action-btn btn-reset"
              onClick={handleResetBuffer}
            >
              초기화
            </button>
            <button className="action-btn btn-apply" onClick={handleApply}>
              적용 (Enter)
            </button>
          </div>
        </div>
      );
    }

    // 연마
    if (type === "POLISH") {
      const val = editBuffer.polish?.[slot] || 0;
      return (
        <div>
          <div className="grid-5-col">
            {[...Array(10)].map((_, i) => (
              <button
                key={i + 1}
                className={`bs-option-btn ${val === i + 1 ? "active" : ""}`}
                style={{
                  borderColor: i + 1 === 10 ? "red" : "",
                  textShadow: i + 1 === 10 ? "0 0 5px red" : "",
                }}
                onClick={() => updateBuffer("polish", slot, i + 1)}
              >
                {i + 1}
              </button>
            ))}
          </div>
          <div className="modal-footer-btns">
            <button className="action-btn btn-cancel" onClick={backToMain}>
              취소 (ESC)
            </button>
            <button
              className="action-btn btn-reset"
              onClick={handleResetBuffer}
            >
              초기화
            </button>
            <button className="action-btn btn-apply" onClick={handleApply}>
              적용 (Enter)
            </button>
          </div>
        </div>
      );
    }

    // 마법부여
    if (type === "ENCHANT") {
      const list = ENCHANT_LIST_BY_SLOT[slot] || [];
      const val = editBuffer.enchant?.[slot] || "선택 안함";
      return (
        <div>
          <div className="enchant-list-wrapper">
            {list.length === 0 ? (
              <div style={{ padding: 20 }}>데이터 없음</div>
            ) : (
              list.map((item, idx) => (
                <div
                  key={idx}
                  className={`bs-option-btn ${
                    val === item.name ? "active" : ""
                  }`}
                  style={{ justifyContent: "flex-start", paddingLeft: "15px" }}
                  onClick={() => updateBuffer("enchant", slot, item.name)}
                >
                  <span>{item.name}</span>
                </div>
              ))
            )}
          </div>
          <div className="modal-footer-btns">
            <button className="action-btn btn-cancel" onClick={backToMain}>
              취소 (ESC)
            </button>
            <button
              className="action-btn btn-reset"
              onClick={handleResetBuffer}
            >
              초기화
            </button>
            <button className="action-btn btn-apply" onClick={handleApply}>
              적용 (Enter)
            </button>
          </div>
        </div>
      );
    }

    // 마법봉인
    if (type === "MAGIC") {
      let mGroup =
        slot === "무기"
          ? "무기"
          : ["머리어깨", "상의", "하의", "벨트", "신발"].includes(slot)
          ? "방어구"
          : ["팔찌", "목걸이", "반지"].includes(slot)
          ? "악세서리"
          : "특수장비";
      const options = MAGIC_OPTS_BY_GROUP[mGroup];
      const uVal = editBuffer.magic_unique?.[slot] || "선택 안함";
      const cVal = editBuffer.magic_common?.[slot] || "선택 안함";
      return (
        <div>
          <div className="magic-split-wrapper">
            <div className="magic-col-scroll">
              <div
                className="magic-section-title"
                style={{
                  position: "sticky",
                  top: 0,
                  background: "#111",
                  zIndex: 5,
                  paddingBottom: 5,
                }}
              >
                고유 옵션
              </div>
              {options?.unique.map((opt) => (
                <button
                  key={opt.label}
                  className={`bs-option-btn ${
                    uVal === opt.label ? "active" : ""
                  }`}
                  onClick={() =>
                    setEditBuffer((prev) => ({
                      ...prev,
                      magic_unique: { ...prev.magic_unique, [slot]: opt.label },
                    }))
                  }
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <div className="magic-col-scroll">
              <div
                className="magic-section-title common"
                style={{
                  position: "sticky",
                  top: 0,
                  background: "#111",
                  zIndex: 5,
                  paddingBottom: 5,
                }}
              >
                일반 옵션
              </div>
              {options?.common.map((opt) => (
                <button
                  key={opt.label}
                  className={`bs-option-btn ${
                    cVal === opt.label ? "active" : ""
                  }`}
                  onClick={() =>
                    setEditBuffer((prev) => ({
                      ...prev,
                      magic_common: { ...prev.magic_common, [slot]: opt.label },
                    }))
                  }
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div className="modal-footer-btns">
            <button className="action-btn btn-cancel" onClick={backToMain}>
              취소 (ESC)
            </button>
            <button
              className="action-btn btn-reset"
              onClick={handleResetBuffer}
            >
              초기화
            </button>
            <button className="action-btn btn-apply" onClick={handleApply}>
              적용 (Enter)
            </button>
          </div>
        </div>
      );
    }

    // 엠블렘
    if (type === "EMBLEM") {
      const rule = EMBLEM_RULES[slot] || { types: [], slots: 0 };
      const currentEmblems = Array.isArray(editBuffer.emblem?.[slot])
        ? editBuffer.emblem[slot]
        : Array(rule.slots).fill(null);

      const equipEmblem = (newEmblem, isBatch = false) => {
        let nextEmblems = [...currentEmblems];
        if (nextEmblems.length < rule.slots) {
          nextEmblems = [
            ...nextEmblems,
            ...Array(rule.slots - nextEmblems.length).fill(null),
          ];
        }
        if (isBatch) {
          for (let i = 0; i < nextEmblems.length; i++) {
            if (nextEmblems[i] === null) nextEmblems[i] = { ...newEmblem };
          }
        } else {
          const emptyIdx = nextEmblems.findIndex((e) => e === null);
          if (emptyIdx === -1) return alert("엠블렘 슬롯이 가득 찼습니다.");
          nextEmblems[emptyIdx] = { ...newEmblem };
        }
        updateBufferDeep("emblem", -1, nextEmblems);
      };

      const unequipEmblem = (idx) => {
        const nextEmblems = [...currentEmblems];
        nextEmblems[idx] = null;
        updateBufferDeep("emblem", -1, nextEmblems);
      };

      const allowedTypes = rule.types;
      return (
        <div
          style={{ display: "flex", flexDirection: "column", height: "100%" }}
        >
          <div
            style={{
              textAlign: "center",
              fontSize: "0.75rem",
              color: "#888",
              marginBottom: "10px",
            }}
          >
            <span style={{ marginRight: "15px" }}>🖱️ 좌클릭: 장착 / 해제</span>
            <span style={{ color: "var(--text-gold)" }}>
              ⇧ Shift + 좌클릭: 빈 칸 모두 채우기
            </span>
          </div>
          <div className="emblem-slot-container">
            {[...Array(rule.slots)].map((_, i) => {
              const emblem = currentEmblems[i];
              return (
                <div
                  key={i}
                  className="emblem-socket-wrapper"
                  onClick={() => emblem && unequipEmblem(i)}
                >
                  <div className={`emblem-socket ${emblem ? "equipped" : ""}`}>
                    {emblem ? (
                      <>
                        <img
                          src={`${IMAGE_BASE_URL}/emblems/${emblem.img}.png`}
                          className="emblem-img-display"
                          alt=""
                          onError={(e) => (e.target.src = PLACEHOLDER_IMG)}
                        />
                        <div className="emblem-lv-overlay">{emblem.level}</div>
                      </>
                    ) : (
                      <div
                        style={{
                          fontSize: "2rem",
                          color: "#333",
                          fontWeight: "bold",
                        }}
                      >
                        +
                      </div>
                    )}
                  </div>
                  <div className="emblem-socket-title">
                    {emblem ? `${emblem.name} ${emblem.level}단계` : "빈 슬롯"}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="rune-selection-area">
            {allowedTypes.map((type) => {
              if (type === "Platinum") {
                const categories = Object.keys(EMBLEM_DB.Platinum || {});
                return categories.map((catKey) => {
                  if (!catKey || catKey === "unknown" || catKey === "undefined")
                    return null;
                  const item = EMBLEM_DB.Platinum[catKey];
                  return (
                    <div key={catKey} style={{ marginBottom: "25px" }}>
                      <div
                        className="rune-group-title"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          color: "#aaddff",
                        }}
                      >
                        <img
                          src={`${IMAGE_BASE_URL}/emblems/${item.img}.png`}
                          style={{ width: 24, height: 24 }}
                          alt=""
                          onError={(e) => (e.target.src = PLACEHOLDER_IMG)}
                        />
                        {item.name} 엠블렘
                      </div>
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: "6px",
                        }}
                      >
                        {[...Array(15)].map((_, idx) => {
                          const lv = idx + 1;
                          const computedStats = {};
                          if (item.stats) {
                            Object.keys(item.stats).forEach((statKey) => {
                              const val = item.stats[statKey]?.[lv];
                              if (val) computedStats[statKey] = val;
                            });
                          }
                          return (
                            <button
                              key={lv}
                              className="bs-option-btn"
                              style={{
                                width: "45px",
                                padding: "5px 0",
                                fontSize: "0.8rem",
                              }}
                              onClick={(e) =>
                                equipEmblem(
                                  {
                                    name: item.name,
                                    img: item.img,
                                    level: lv,
                                    stats: computedStats,
                                  },
                                  e.shiftKey
                                )
                              }
                            >
                              {lv}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                });
              } else {
                const embData = EMBLEM_DB[type];
                if (!embData) return null;
                const colorMap = {
                  Red: "#ff5a6a",
                  Yellow: "#ffcc00",
                  Green: "#00ff00",
                  Blue: "#00ffff",
                };
                return (
                  <div key={type} style={{ marginBottom: "20px" }}>
                    <div
                      className="rune-group-title"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        color: colorMap[type] || "#fff",
                      }}
                    >
                      <img
                        src={`${IMAGE_BASE_URL}/emblems/${embData.img}.png`}
                        style={{ width: 24, height: 24 }}
                        alt=""
                        onError={(e) => (e.target.src = PLACEHOLDER_IMG)}
                      />
                      {embData.name} 엠블렘
                    </div>
                    <div
                      style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}
                    >
                      {[...Array(15)].map((_, lvIndex) => {
                        const lv = lvIndex + 1;
                        const computedStats = {};
                        if (embData.stats) {
                          Object.keys(embData.stats).forEach((k) => {
                            computedStats[k] = embData.stats[k][lv];
                          });
                        }
                        return (
                          <button
                            key={lv}
                            className="bs-option-btn"
                            style={{
                              width: "45px",
                              padding: "5px 0",
                              fontSize: "0.8rem",
                            }}
                            onClick={(e) =>
                              equipEmblem(
                                {
                                  name: embData.name,
                                  img: embData.img,
                                  level: lv,
                                  stats: computedStats,
                                },
                                e.shiftKey
                              )
                            }
                          >
                            {lv}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              }
            })}
          </div>
          <div className="modal-footer-btns">
            <button className="action-btn btn-cancel" onClick={backToMain}>
              취소 (ESC)
            </button>
            <button
              className="action-btn btn-reset"
              onClick={handleResetBuffer}
            >
              초기화
            </button>
            <button className="action-btn btn-apply" onClick={handleApply}>
              적용 (Enter)
            </button>
          </div>
        </div>
      );
    }

    return null;
  };

  // ===========================================================================
  // [4] 최종 렌더링 (Wrapper)
  // ===========================================================================
  return (
    <div
      className="item-picker-modal"
      onClick={
        ["JOURNAL", "BLACKSMITH", "SKILL_RUNE", "AVATAR_MAIN"].includes(type)
          ? close
          : backToMain
      }
      tabIndex={0}
      onKeyDown={handleKeyDown}
      style={{ outline: "none" }}
    >
      <div className="picker-content" onClick={(e) => e.stopPropagation()}>
        <div
          className="picker-header"
          style={{
            position: "relative",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: "60px",
            padding: "0 60px",
          }}
        >
          {![
            "JOURNAL",
            "BLACKSMITH",
            "SKILL_RUNE",
            "AVATAR_MAIN",
            "JOB_SELECTOR",
            "CLASS_SELECTOR",
          ].includes(type) && (
            <button
              style={{
                position: "absolute",
                left: "20px",
                top: "50%",
                transform: "translateY(-50%)",
                fontSize: "1.5rem",
                zIndex: 20,
                border: "none",
                background: "transparent",
                color: "#aaa",
                cursor: "pointer",
                padding: "10px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              onClick={backToMain}
            >
              ⬅
            </button>
          )}
          <h3
            style={{
              margin: 0,
              fontSize: "1.1rem",
              fontWeight: "800",
              textAlign: "center",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              maxWidth: "100%",
              color: "#e0e0e0",
            }}
          >
            {MODAL_TITLE_MAP[type] || type}
          </h3>
          <button
            className="picker-close-btn"
            style={{
              position: "absolute",
              right: "20px",
              top: "50%",
              transform: "translateY(-50%)",
              zIndex: 20,
            }}
            onClick={close}
          >
            ✕
          </button>
        </div>

        <div key={type} className="modal-body-transition">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default InnerModalManager;
