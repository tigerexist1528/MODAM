import React, { useState } from "react";

// -----------------------------------------------------------------------------
// StatSlider 컴포넌트 (UX 개선: 백스페이스 허용, 초과 시 흔들림)
// -----------------------------------------------------------------------------
export const StatSlider = ({ value, max, onChange, onCancel, onApply }) => {
  const [isInputMode, setIsInputMode] = useState(false);
  const [localVal, setLocalVal] = useState("");
  const [isShaking, setIsShaking] = useState(false); // 흔들림 효과 상태

  // 입력 모드 진입
  const handleFocus = () => {
    setLocalVal(value === 0 ? "" : String(value));
    setIsInputMode(true);
  };

  // 입력 핸들러
  const handleInputChange = (e) => {
    const inputStr = e.target.value;

    // 1. 다 지웠을 때 (백스페이스 허용)
    if (inputStr === "") {
      setLocalVal("");
      // 부모에겐 0으로 알리지만, 입력창은 비워둠
      return;
    }

    const num = Number(inputStr);

    // 2. 숫자가 아니면 무시
    if (isNaN(num)) return;

    // 3. 최대값 초과 시 (흔들림 효과 & Max로 고정)
    if (num > max) {
      setLocalVal(String(max)); // 강제로 최대값 표시
      onChange(max); // 부모 업데이트

      // 흔들림 애니메이션 트리거
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 300); // 0.3초 후 해제
      return;
    }

    // 4. 정상 입력
    setLocalVal(inputStr);
    onChange(num);
  };

  // 포커스 해제 시 (비어있으면 0으로 채움)
  const handleBlur = () => {
    if (localVal === "") {
      setLocalVal("0");
      onChange(0);
    }
    setIsInputMode(false);
  };

  return (
    <div className="slider-container">
      {/* 숫자 표시 & 입력 박스 */}
      <div
        className={`slider-display-box ${isShaking ? "shake-box" : ""}`}
        onClick={handleFocus}
      >
        {isInputMode ? (
          <input
            autoFocus
            type="number"
            className="slider-val-input"
            value={localVal}
            onChange={handleInputChange}
            onBlur={handleBlur}
            placeholder="0"
          />
        ) : (
          <div className={`slider-val-text ${isShaking ? "shake-box" : ""}`}>
            {value}
          </div>
        )}
        <div style={{ color: "#666", fontSize: "0.8rem", marginTop: "5px" }}>
          클릭하여 직접 입력
        </div>
      </div>

      {/* 슬라이더 컨트롤 */}
      <div className="slider-control-row">
        <button className="slider-btn" onClick={() => onChange(0)}>
          MIN
        </button>
        <button
          className="slider-step-btn"
          onClick={() => onChange(Math.max(0, value - 1))}
        >
          －
        </button>
        <input
          type="range"
          className="custom-range"
          min="0"
          max={max}
          step="1"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
        />
        <button
          className="slider-step-btn"
          onClick={() => onChange(Math.min(max, value + 1))}
        >
          ＋
        </button>
        <button className="slider-btn" onClick={() => onChange(max)}>
          MAX
        </button>
      </div>

      <div
        className="modal-footer-btns"
        style={{ width: "100%", marginTop: "20px" }}
      >
        <button className="action-btn btn-cancel" onClick={onCancel}>
          취소 (ESC)
        </button>
        <button className="action-btn btn-apply" onClick={onApply}>
          적용 (Enter)
        </button>
      </div>
    </div>
  );
};
