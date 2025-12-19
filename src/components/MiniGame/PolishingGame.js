import React, { useEffect, useState, useRef } from "react";
import { supabase } from "../../utils/supabaseClient";
import MiniItemPicker from "./MiniItemPicker";
import { GET_ITEM_ICON_LOCAL } from "../../utils/data";

// ★ 연마 확률표 (표 기반)
// n-1 -> n 단계 시도 확률 [성공, 유지, 하락, 파괴]
// 기본, 1차 실패(하락) 후, 2차 이상 실패(하락) 후
const PROBABILITIES = {
  1: {
    // 0 -> 1
    0: [45, 55, 0, 0],
    1: [45, 55, 0, 0],
    2: [45, 55, 0, 0],
  },
  2: {
    // 1 -> 2
    0: [30, 40, 30, 0],
    1: [30, 50, 20, 0],
    2: [30, 70, 0, 0],
  },
  3: {
    // 2 -> 3
    0: [20, 50, 30, 0],
    1: [20, 60, 20, 0],
    2: [20, 80, 0, 0],
  },
  4: {
    // 3 -> 4
    0: [20, 45, 30, 5],
    1: [20, 55, 20, 5],
    2: [20, 75, 0, 5],
  },
  5: {
    // 4 -> 5
    0: [17, 44, 30, 9],
    1: [17, 54, 20, 9],
    2: [17, 74, 0, 9],
  },
  6: {
    // 5 -> 6
    0: [15, 42, 30, 13],
    1: [15, 52, 20, 13],
    2: [15, 72, 0, 13],
  },
  7: {
    // 6 -> 7
    0: [10, 60, 0, 30],
    1: [10, 60, 0, 30],
    2: [10, 60, 0, 30],
  },
  8: {
    // 7 -> 8
    0: [7, 53, 0, 40],
    1: [7, 53, 0, 40],
    2: [7, 53, 0, 40],
  },
  9: {
    // 8 -> 9
    0: [3, 37, 0, 60],
    1: [3, 37, 0, 60],
    2: [3, 37, 0, 60],
  },
  10: {
    // 9 -> 10
    0: [1, 29, 0, 70],
    1: [1, 29, 0, 70],
    2: [1, 29, 0, 70],
  },
};

const PolishingGame = ({ userSession }) => {
  const [currentWeapon, setCurrentWeapon] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  const [gameState, setGameState] = useState("IDLE");
  const [resultData, setResultData] = useState({ type: "", msg: "" });
  const [isProcessing, setIsProcessing] = useState(false);

  const latestWeaponRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    if (userSession) fetchInventory();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [userSession]);

  useEffect(() => {
    latestWeaponRef.current = currentWeapon;
  }, [currentWeapon]);

  const fetchInventory = async () => {
    const { data, error } = await supabase
      .from("minigame_inventory")
      .select("*")
      .order("created_at", { ascending: true });

    if (!error && data) setInventory(data);
  };

  const handleSelectWeapon = async (item) => {
    if (inventory.length >= 6) {
      alert("보관함이 가득 찼습니다! (최대 6개)");
      return;
    }

    const imgUrl = GET_ITEM_ICON_LOCAL(item.name, "무기");

    const newWeapon = {
      user_id: userSession?.user?.id,
      weapon_name: item.name,
      weapon_id: item.id.toString(),
      image_url: imgUrl,
      polish_level: 0,
      fail_streak_level: 0, // ★ 실패 보정 단계 초기화
      max_level: 0,
      total_try: 0,
      success_cnt: 0,
      maintain_cnt: 0,
      drop_cnt: 0,
      break_cnt: 0,
    };

    const { data, error } = await supabase
      .from("minigame_inventory")
      .insert([newWeapon])
      .select();

    if (!error && data) {
      const addedItem = data[0];
      setInventory([...inventory, addedItem]);
      setCurrentWeapon(addedItem);
      latestWeaponRef.current = addedItem;
    }
  };

  const equipFromInventory = (dbItem) => {
    if (gameState === "POLISHING") return;

    if (gameState === "RESULT" || isProcessing) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      setGameState("IDLE");
      setIsProcessing(false);
    }

    setCurrentWeapon(dbItem);
    latestWeaponRef.current = dbItem;
  };

  const deleteFromInventory = async (e, dbId) => {
    e.stopPropagation();
    if (!window.confirm("정말 삭제하시겠습니까?")) return;

    const { error } = await supabase
      .from("minigame_inventory")
      .delete()
      .eq("id", dbId);
    if (!error) {
      setInventory((prev) => prev.filter((item) => item.id !== dbId));
      if (currentWeapon?.id === dbId) {
        setCurrentWeapon(null);
        latestWeaponRef.current = null;
      }
    }
  };

  const handlePolish = () => {
    const current = latestWeaponRef.current;
    if (!current || gameState !== "IDLE" || isProcessing) return;
    if (current.polish_level >= 10) return alert("이미 최고 단계입니다!");

    setGameState("POLISHING");
    setIsProcessing(true);

    timerRef.current = setTimeout(() => {
      calculateResult();
    }, 1500);
  };

  const handleSkip = (e) => {
    if (e) e.stopPropagation();

    if (gameState === "POLISHING") {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      calculateResult();
    }
  };

  const calculateResult = async () => {
    const current = latestWeaponRef.current;
    if (!current) return;

    const level = current.polish_level;
    const targetLevel = level + 1; // 목표 레벨
    const streak = current.fail_streak_level || 0; // 현재 실패 보정 단계

    // ★ 확률표에서 현재 상황에 맞는 확률 가져오기
    const [succRate, mainRate, dropRate, breakRate] =
      PROBABILITIES[targetLevel][streak];

    const rand = Math.random() * 100;
    let type = "";
    let msg = "";
    let newLevel = level;
    let newStreak = streak;
    let isBroken = false;

    let {
      max_level = 0,
      total_try = 0,
      success_cnt = 0,
      maintain_cnt = 0,
      drop_cnt = 0,
      break_cnt = 0,
    } = current;

    total_try += 1;

    if (rand < succRate) {
      type = "SUCCESS";
      msg = "연마 성공!";
      newLevel = level + 1;
      success_cnt += 1;
      if (newLevel > max_level) max_level = newLevel;
      if (newLevel === 10) {
        type = "MAX";
        msg = "✨ 10단계 달성! ✨";
      }
      newStreak = 0; // 성공 시 보정 초기화
    } else if (rand < succRate + mainRate) {
      type = "MAINTAIN";
      msg = "연마 유지";
      maintain_cnt += 1;
      newStreak = 0; // 유지 시 보정 초기화
    } else if (rand < succRate + mainRate + dropRate) {
      type = "DROP";
      msg = "연마 하락...";
      newLevel = Math.max(0, level - 1);
      drop_cnt += 1;
      newStreak = Math.min(2, streak + 1); // ★ 하락 시 보정 단계 증가 (최대 2단계)
    } else {
      type = "BREAK";
      msg = "장비 파괴!!!";
      newLevel = 0;
      break_cnt += 1;
      isBroken = true;
      newStreak = 0; // 파괴 시 보정 초기화
    }

    setResultData({ type, msg });
    setGameState("RESULT");

    const updatedStats = {
      ...current,
      polish_level: newLevel,
      fail_streak_level: newStreak,
      max_level,
      total_try,
      success_cnt,
      maintain_cnt,
      drop_cnt,
      break_cnt,
    };

    latestWeaponRef.current = updatedStats;
    setCurrentWeapon(updatedStats);
    setInventory((prev) =>
      prev.map((item) => (item.id === current.id ? updatedStats : item))
    );

    supabase
      .from("minigame_inventory")
      .update({
        polish_level: newLevel,
        fail_streak_level: newStreak,
        max_level,
        total_try,
        success_cnt,
        maintain_cnt,
        drop_cnt,
        break_cnt,
      })
      .eq("id", current.id)
      .then(({ error }) => {
        if (error) console.error("DB Save Error:", error);
      });

    setTimeout(
      () => {
        setGameState("IDLE");
        setIsProcessing(false);
      },
      type === "MAX" ? 4000 : 1500
    );
  };

  const handleCloseResult = (e) => {
    if (e) e.stopPropagation();
    setGameState("IDLE");
    setIsProcessing(false);
  };

  return (
    <div className="minigame-container">
      <h2>🔨 무기 연마 시뮬레이터</h2>
      <p style={{ color: "#aaa", marginBottom: "20px" }}>
        재화 소모 없이 무한으로 연마해보세요! (최대 10단계)
      </p>

      {/* 메인 스테이지 */}
      <div className="polishing-stage">
        {/* ★ 실패 보정 배지 */}
        {currentWeapon && currentWeapon.fail_streak_level > 0 && (
          <div className="fail-streak-badge">
            실패확률 감소 {currentWeapon.fail_streak_level}단계 적용 중
          </div>
        )}

        <div
          className="weapon-slot"
          onClick={() => {
            if (!currentWeapon || gameState !== "IDLE") {
              if (!currentWeapon) setIsPickerOpen(true);
            }
          }}
        >
          {currentWeapon ? (
            <>
              <img
                src={currentWeapon.image_url}
                alt={currentWeapon.weapon_name}
              />
              <div className="polish-level-badge">
                +{currentWeapon.polish_level}
              </div>
            </>
          ) : (
            <span style={{ color: "#666", fontSize: "0.8rem" }}>무기 선택</span>
          )}
        </div>

        {/* 통계판 */}
        {currentWeapon && (
          <div className="stats-board">
            <div className="stats-title">📊 강화 기록</div>
            <div className="stats-row highlight">
              <span>최고 달성</span>
              <span className="stats-val" style={{ color: "#00ffff" }}>
                +{currentWeapon.max_level || 0}
              </span>
            </div>
            <div className="stats-row">
              <span>총 시도</span>
              <span className="stats-val">
                {currentWeapon.total_try || 0}회
              </span>
            </div>
            <hr
              style={{
                border: "0",
                borderTop: "1px solid #444",
                margin: "8px 0",
              }}
            />
            <div className="stats-row">
              <span style={{ color: "#ffcc00" }}>성공</span>
              <span className="stats-val">
                {currentWeapon.success_cnt || 0}
              </span>
            </div>
            <div className="stats-row">
              <span style={{ color: "#ff8800" }}>유지</span>
              <span className="stats-val">
                {currentWeapon.maintain_cnt || 0}
              </span>
            </div>
            <div className="stats-row">
              <span style={{ color: "#ff5555" }}>하락</span>
              <span className="stats-val">{currentWeapon.drop_cnt || 0}</span>
            </div>
            <div className="stats-row">
              <span style={{ color: "#880000" }}>파괴</span>
              <span className="stats-val">{currentWeapon.break_cnt || 0}</span>
            </div>
          </div>
        )}

        {/* 오버레이 (CSS Transition 적용) */}
        <div
          className={`result-overlay ${gameState !== "IDLE" ? "active" : ""}`}
          onClick={gameState === "POLISHING" ? handleSkip : handleCloseResult}
          style={{
            background:
              resultData.type === "MAX" && gameState === "RESULT"
                ? "rgba(0,0,50,0.9)"
                : "rgba(0,0,0,0.85)",
            cursor: "pointer",
            pointerEvents: gameState !== "IDLE" ? "auto" : "none", // IDLE일 땐 클릭 안되게
          }}
        >
          {gameState === "POLISHING" && (
            <>
              <div style={{ color: "#fff", fontSize: "1.5rem" }}>
                🔨 연마중...
              </div>
              <div
                style={{ color: "#888", fontSize: "0.8rem", marginTop: "10px" }}
              >
                (클릭하여 스킵)
              </div>
            </>
          )}

          {gameState === "RESULT" && (
            <>
              <div
                className={`result-text res-${resultData.type.toLowerCase()}`}
              >
                {resultData.msg}
              </div>
              {resultData.type === "SUCCESS" && (
                <div style={{ color: "#ffcc00", fontSize: "1.5rem" }}>
                  +{currentWeapon.polish_level} 단계!
                </div>
              )}
            </>
          )}
        </div>

        <button
          className="polish-btn"
          onClick={handlePolish}
          disabled={
            !currentWeapon ||
            gameState !== "IDLE" ||
            isProcessing ||
            currentWeapon.polish_level >= 10
          }
        >
          {gameState === "IDLE" ? "연마하기" : "진행중..."}
        </button>
      </div>

      {/* 인벤토리 */}
      <div className="inventory-box">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: "10px",
          }}
        >
          <span style={{ fontWeight: "bold", color: "#ccc" }}>
            📦 나의 보관함 ({inventory.length}/6)
          </span>
          {inventory.length < 6 && (
            <button
              onClick={() => setIsPickerOpen(true)}
              style={{
                fontSize: "0.8rem",
                background: "#333",
                border: "1px solid #555",
                color: "#fff",
                padding: "4px 8px",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              + 새 무기 가져오기
            </button>
          )}
        </div>

        <div className="inventory-grid">
          {[...Array(6)].map((_, idx) => {
            const item = inventory[idx];
            return (
              <div
                key={idx}
                className={`inv-slot ${
                  currentWeapon?.id === item?.id ? "active" : ""
                }`}
                onClick={() => {
                  if (item) equipFromInventory(item);
                  else setIsPickerOpen(true);
                }}
              >
                {item ? (
                  <>
                    <img src={item.image_url} alt="weapon" />
                    <div className="inv-level">+{item.polish_level}</div>
                    <div
                      className="inv-close"
                      onClick={(e) => deleteFromInventory(e, item.id)}
                    >
                      X
                    </div>
                  </>
                ) : (
                  <span style={{ color: "#333", fontSize: "1.5rem" }}>+</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <MiniItemPicker
        activeModal={isPickerOpen}
        close={() => setIsPickerOpen(false)}
        onSelect={handleSelectWeapon}
      />
    </div>
  );
};

export default PolishingGame;
