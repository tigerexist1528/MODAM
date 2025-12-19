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
  // --- 상태 ---
  const [currentWeapon, setCurrentWeapon] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  // 애니메이션 상태
  const [gameState, setGameState] = useState("IDLE"); // IDLE, POLISHING, RESULT
  const [resultData, setResultData] = useState({ type: "", msg: "" });

  const timerRef = useRef(null);

  // --- 초기 로딩 ---
  useEffect(() => {
    if (userSession) fetchInventory();

    // 컴포넌트가 사라질 때 타이머 정리 (메모리 누수 방지)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [userSession]);

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
    };

    const { data, error } = await supabase
      .from("minigame_inventory")
      .insert([newWeapon])
      .select();

    if (!error && data) {
      setInventory([...inventory, data[0]]);
      setCurrentWeapon(data[0]);
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

  // --- ★ 연마 시작 (타이머 저장) ---
  const handlePolish = () => {
    if (!currentWeapon) return;
    if (currentWeapon.polish_level >= 10) return alert("이미 최고 단계입니다!");

    setGameState("POLISHING");

    // 1.5초 뒤에 결과 실행 (이 타이머 ID를 저장해둠)
    timerRef.current = setTimeout(() => {
      calculateResult();
    }, 1500);
  };

  // --- ★ 스킵 기능 (클릭 시 실행) ---
  const handleSkip = () => {
    if (gameState === "POLISHING") {
      if (timerRef.current) {
        clearTimeout(timerRef.current); // 기존 타이머 취소
        timerRef.current = null;
      }
      calculateResult(); // 즉시 결과 계산 실행
    }
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

    // 결과창은 스킵 없이 보여주되, MAX 성공은 좀 더 오래 보여줌
    setTimeout(
      () => {
        setGameState("IDLE");
      },
      type === "MAX" ? 4000 : 1500
    );
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

        {/* ★ 연마 중 오버레이 (클릭 시 스킵 기능 추가) */}
        {gameState === "POLISHING" && (
          <div
            className="result-overlay"
            onClick={handleSkip} // ★ 클릭하면 스킵!
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

        {/* 결과 오버레이 (클릭하면 결과창 닫기 추가 - 보너스 기능) */}
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
            onClick={() => setGameState("IDLE")} // 결과창도 클릭하면 바로 닫힘
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

      <MiniItemPicker
        activeModal={isPickerOpen}
        close={() => setIsPickerOpen(false)}
        onSelect={handleSelectWeapon}
      />
    </div>
  );
};

export default PolishingGame;
