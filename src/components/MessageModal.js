// src/components/MessageModal.js
import React from "react";
// 스타일은 기존 styles.css를 공유해서 씁니다.

const MessageModal = ({ onClose, title, message }) => {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* 1. 성공 아이콘 (체크 표시) */}
        <div style={{ marginBottom: "15px" }}>
          <svg
            width="50"
            height="50"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#4cd964"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
        </div>

        {/* 2. 제목과 메시지 */}
        <h3 style={{ margin: "0 0 10px 0", color: "#fff" }}>{title}</h3>
        <p style={{ color: "#ccc", marginBottom: "25px" }}>{message}</p>

        {/* 3. 확인 버튼 */}
        <button className="modal-confirm-btn" onClick={onClose}>
          확인
        </button>
      </div>
    </div>
  );
};

export default MessageModal;
