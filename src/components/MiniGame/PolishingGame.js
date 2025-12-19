import React, { useEffect, useState } from "react";
import { supabase } from "../../utils/supabaseClient";
import MiniItemPicker from "./MiniItemPicker";
import { GET_ITEM_ICON_LOCAL } from "../../utils/data"; // 이미지 유틸 가져오기

// ★ 연마 확률 설정 (0~9단계에서 시도)
const PROBABILITIES = {
  0: [100, 0, 0, 0], // 0->1: 100% 성공
  1: [90, 10, 0, 0], // 1->2
  2: [80, 20, 0, 0], // 2->3
  3: [70, 30, 0, 0], // 3->4
  4: [60, 40, 0, 0], // 4->5
  5: [50, 40, 10, 0], // 5->6 (하락 시작)
  6: [40, 40, 19, 1], // 6->7 (파괴 1%)
  7: [30, 40, 28, 2], // 7->8 (파괴 2%)
  8: [20, 40, 37, 3], // 8->9 (파괴 3%)
  9: [10, 40, 45, 5], // 9->10 (파괴 5%, 성공 10%)
};

const PolishingGame = ({ userSession }) => {
  // --- 상태 ---
  const [currentWeapon, setCurrentWeapon] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  // 애니메이션 상태
  const [gameState, setGameState] = useState("IDLE"); // IDLE, POLISHING, RESULT
  const [resultData, setResultData] = useState({ type: "", msg: "" });

  // --- 초기 로딩 ---
  useEffect(() => {
    if (userSession) fetchInventory();
  }, [userSession]);

  const fetchInventory = async () => {
    const { data, error } = await supabase
      .from("minigame_inventory")
      .select("*")
      .order("created_at", { ascending: true });

    if (!error && data) setInventory(data);
  };

  // --- 무기 선택 핸들러 (Picker에서 호출) ---
  const handleSelectWeapon = async (item) => {
    if (inventory.length >= 6) {
      alert("보관함이 가득 찼습니다! (최대 6개)");
      return;
    }

    // ★ 유틸리티를 사용해 정확한 이미지 경로 생성
    const imgUrl = GET_ITEM_ICON_LOCAL(item.name, "무기");

    const newWeapon = {
      user_id: userSession?.user?.id,
      weapon_name: item.name,
      weapon_id: item.id.toString(), // ID는 문자열로 저장
      image_url: imgUrl, // 생성된 이미지 경로 저장
      polish_level: 0,
    };

    // DB Insert
    const { data, error } = await supabase
      .from("minigame_inventory")
      .insert([newWeapon])
      .select();

    if (!error && data) {
      setInventory([...inventory, data[0]]);
      setCurrentWeapon(data[0]);
    } else {
      console.error("저장 실패:", error);
    }
  };

  const equipFromInventory = (dbItem) => {
    if (gameState !== "IDLE") return;
    setCurrentWeapon(dbItem);
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
      if (currentWeapon?.id === dbId) setCurrentWeapon(null);
    }
  };

  const handlePolish = () => {
    if (!currentWeapon) return;
    if (currentWeapon.polish_level >= 10) return alert("이미 최고 단계입니다!");

    setGameState("POLISHING");

    setTimeout(() => {
      calculateResult();
    }, 1500);
  };

  const calculateResult = async () => {
    const level = currentWeapon.polish_level;
    const [succRate, mainRate, dropRate, breakRate] = PROBABILITIES[level];

    const rand = Math.random() * 100;
    let type = "";
    let msg = "";
    let newLevel = level;
    let isBroken = false;

    if (rand < succRate) {
      type = "SUCCESS";
      msg = "연마 성공!";
      newLevel = level + 1;
      if (newLevel === 10) {
        type = "MAX";
        msg = "✨ 10단계 달성! ✨";
      }
    } else if (rand < succRate + mainRate) {
      type = "MAINTAIN";
      msg = "연마 유지";
    } else if (rand < succRate + mainRate + dropRate) {
      type = "DROP";
      msg = "연마 하락...";
      newLevel = Math.max(0, level - 1);
    } else {
      type = "BREAK";
      msg = "장비 파괴!!!";
      newLevel = 0;
      isBroken = true;
    }

    setResultData({ type, msg });
    setGameState("RESULT");

    if (newLevel !== level || isBroken) {
      await supabase
        .from("minigame_inventory")
        .update({ polish_level: newLevel })
        .eq("id", currentWeapon.id);

      setCurrentWeapon((prev) => ({ ...prev, polish_level: newLevel }));
      setInventory((prev) =>
        prev.map((item) =>
          item.id === currentWeapon.id
            ? { ...item, polish_level: newLevel }
            : item
        )
      );
    }

    setTimeout(
      () => {
        setGameState("IDLE");
      },
      type === "MAX" ? 4000 : 2000
    );
  };

  return (
    <div className="minigame-container">
      <h2>🔨 무기 연마 시뮬레이터</h2>
      <p style={{ color: "#aaa", marginBottom: "20px" }}>
        재화 소모 없이 무한으로 연마해보세요! (최대 10단계)
      </p>

      {/* 1. 메인 스테이지 */}
      <div className="polishing-stage">
        <div
          className="weapon-slot"
          onClick={() => {
            if (!currentWeapon) setIsPickerOpen(true);
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

        {gameState === "POLISHING" && (
          <div className="result-overlay">
            <div style={{ color: "#fff", fontSize: "1.5rem" }}>
              🔨 연마중...
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
            }}
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
            currentWeapon.polish_level >= 10
          }
        >
          {gameState === "IDLE" ? "연마하기" : "진행중..."}
        </button>
      </div>

      {/* 2. 인벤토리 */}
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
          {!currentWeapon && (
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
                onClick={() => item && equipFromInventory(item)}
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

      {/* 3. 아이템 선택 모달 */}
      <MiniItemPicker
        activeModal={isPickerOpen}
        close={() => setIsPickerOpen(false)}
        onSelect={handleSelectWeapon}
      />
    </div>
  );
};

export default PolishingGame;
