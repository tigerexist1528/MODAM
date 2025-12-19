import React, { useEffect, useState, useRef } from "react"; // ★ useRef 추가
import { supabase } from "../../utils/supabaseClient";
import MiniItemPicker from "./MiniItemPicker";
import { GET_ITEM_ICON_LOCAL } from "../../utils/data"; // 이미지 유틸 가져오기

// ★ 연마 확률 설정 (0~9단계에서 시도)
const PROBABILITIES = {
  0: [45, 55, 0, 0], // 0->1
  1: [30, 40, 30, 0], // 1->2
  2: [20, 50, 30, 0], // 2->3
  3: [20, 45, 30, 5], // 3->4
  4: [17, 44, 30, 9], // 4->5
  5: [15, 42, 30, 13], // 5->6
  6: [10, 60, 0, 30], // 6->7
  7: [7, 53, 0, 40], // 7->8
  8: [3, 37, 0, 60], // 8->9
  9: [1, 29, 0, 70], // 9->10
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
    // 6개 꽉 차면 경고
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
    const [succRate, mainRate, dropRate, breakRate] = PROBABILITIES[level];

    const rand = Math.random() * 100;
    let type = "";
    let msg = "";
    let newLevel = level;
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
    } else if (rand < succRate + mainRate) {
      type = "MAINTAIN";
      msg = "연마 유지";
      maintain_cnt += 1;
    } else if (rand < succRate + mainRate + dropRate) {
      type = "DROP";
      msg = "연마 하락...";
      newLevel = Math.max(0, level - 1);
      drop_cnt += 1;
    } else {
      type = "BREAK";
      msg = "장비 파괴!!!";
      newLevel = 0;
      break_cnt += 1;
      isBroken = true;
    }

    setResultData({ type, msg });
    setGameState("RESULT");

    const updatedStats = {
      ...current,
      polish_level: newLevel,
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

        {gameState === "POLISHING" && (
          <div
            className="result-overlay"
            onClick={handleSkip}
            style={{ cursor: "pointer" }}
          >
            <div style={{ color: "#fff", fontSize: "1.5rem" }}>
              🔨 연마중...
            </div>
            <div
              style={{ color: "#888", fontSize: "0.8rem", marginTop: "10px" }}
            >
              (클릭하여 스킵)
            </div>
          </div>
        )}

        {gameState === "RESULT" && (
          <div
            className="result-overlay"
            style={{
              background:
                resultData.type === "MAX"
                  ? "rgba(0,0,50,0.9)"
                  : "rgba(0,0,0,0.85)",
              cursor: "pointer",
            }}
            onClick={handleCloseResult}
          >
            <div className={`result-text res-${resultData.type.toLowerCase()}`}>
              {resultData.msg}
            </div>
            {resultData.type === "SUCCESS" && (
              <div style={{ color: "#ffcc00", fontSize: "1.5rem" }}>
                +{currentWeapon.polish_level} 단계!
              </div>
            )}
          </div>
        )}

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
          {/* ★ [수정됨] 무기가 있든 없든, 빈칸이 있으면 항상 버튼 표시 */}
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
                // ★ [수정됨] 빈 슬롯을 클릭하면 '새 무기 추가' 모달이 열리도록 변경
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
