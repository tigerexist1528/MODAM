import React from "react";

// App.js에서 systemModal(상태)과 setSystemModal(함수)을 받아옵니다.
const SystemModal = ({ systemModal, setSystemModal }) => {
  // 모달 타입이 없으면 아무것도 안 그림
  if (!systemModal.type) return null;

  // 닫기 함수
  const close = () => setSystemModal({ ...systemModal, type: null });

  return (
    <div
      style={{
        zIndex: 99999,
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        backdropFilter: "blur(2px)",
      }}
      onClick={close}
    >
      <div
        style={{
          width: "380px",
          background: "#1a1a1a",
          padding: "25px",
          borderRadius: "12px",
          border: "1px solid #444",
          boxShadow: "0 10px 40px rgba(0,0,0,0.8)",
          textAlign: "center",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            color: "#fff",
            fontSize: "1.1rem",
            marginBottom: "20px",
            whiteSpace: "pre-wrap",
            lineHeight: "1.5",
          }}
        >
          {systemModal.message}
        </div>

        {/* 이름 입력창 */}
        {systemModal.type === "NAME_INPUT" && (
          <div style={{ display: "flex", gap: "8px" }}>
            <input
              id="sys_input_name"
              type="text"
              placeholder="예: 레이드 세팅"
              autoFocus
              style={{
                flex: 1,
                padding: "10px",
                borderRadius: "6px",
                border: "1px solid #555",
                background: "#333",
                color: "#fff",
                outline: "none",
              }}
            />
            <button
              className="action-btn"
              onClick={() => {
                const val = document
                  .getElementById("sys_input_name")
                  .value.trim();
                if (val) {
                  systemModal.onConfirm(val);
                  close();
                }
              }}
            >
              확인
            </button>
          </div>
        )}

        {/* 덮어쓰기 선택 */}
        {systemModal.type === "SAVE_CHOICE" && (
          <div
            style={{ display: "flex", gap: "10px", justifyContent: "center" }}
          >
            <button
              className="action-btn"
              style={{ background: "#d97706" }}
              onClick={() => {
                systemModal.onConfirm("overwrite");
                close();
              }}
            >
              덮어쓰기
            </button>
            <button
              className="action-btn"
              style={{ background: "#2563eb" }}
              onClick={() => {
                systemModal.onConfirm("new");
                close();
              }}
            >
              새로 만들기
            </button>
          </div>
        )}

        {/* 공유 링크 */}
        {systemModal.type === "SHARE" && (
          <div>
            <div
              style={{
                background: "#000",
                padding: "10px",
                borderRadius: "6px",
                color: "#aaa",
                fontSize: "0.85rem",
                marginBottom: "15px",
                wordBreak: "break-all",
              }}
            >
              {systemModal.data}
            </div>
            <button
              className="action-btn"
              style={{ width: "100%", background: "#16a34a" }}
              onClick={() => {
                navigator.clipboard.writeText(systemModal.data);
                alert("복사되었습니다!");
                close();
              }}
            >
              📋 링크 복사하기
            </button>
          </div>
        )}

        {/* 확인/취소 */}
        {(systemModal.type === "CONFIRM" || systemModal.type === "ALERT") && (
          <div
            style={{ display: "flex", gap: "10px", justifyContent: "center" }}
          >
            {systemModal.type === "CONFIRM" && (
              <button
                className="action-btn"
                onClick={() => {
                  systemModal.onConfirm();
                  close();
                }}
              >
                확인
              </button>
            )}
            <button
              className="action-btn"
              style={{ background: "#555" }}
              onClick={close}
            >
              {systemModal.type === "CONFIRM" ? "취소" : "닫기"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SystemModal;
