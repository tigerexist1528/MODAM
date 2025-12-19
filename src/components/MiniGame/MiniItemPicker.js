import React, { useState } from "react";

// ★ 기존 프로젝트의 DB 및 유틸리티 가져오기
import { WEAPON_DB } from "../../data";
import {
  GET_ITEM_ICON_LOCAL,
  PLACEHOLDER_IMG,
  getGradeColor,
} from "../../utils/data";

const MiniItemPicker = ({ activeModal, close, onSelect }) => {
  const [searchTerm, setSearchTerm] = useState(""); // 검색어 상태

  const handleClose = (e) => {
    if (e.target === e.currentTarget) close();
  };

  if (!activeModal) return null;

  // ★ 검색어 필터링 (이름으로 검색)
  const filteredItems = WEAPON_DB.filter((item) =>
    item.name.includes(searchTerm)
  );

  return (
    <div
      className="bottom-sheet-overlay"
      onClick={handleClose}
      style={{ zIndex: 9999 }}
    >
      <div
        className="bottom-sheet"
        onClick={(e) => e.stopPropagation()}
        style={{ height: "70vh", display: "flex", flexDirection: "column" }}
      >
        {/* 1. 헤더 + 검색창 */}
        <div
          className="sheet-header"
          style={{
            flexDirection: "column",
            alignItems: "stretch",
            gap: "10px",
            height: "auto",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span className="sheet-title">무기 선택 (미니게임)</span>
            <button className="sheet-close" onClick={close}>
              ✕
            </button>
          </div>

          <input
            type="text"
            placeholder="무기 이름 검색... (예: 몽대)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: "8px",
              border: "1px solid #444",
              background: "#1a1a1a",
              color: "#fff",
              fontSize: "1rem",
            }}
          />
        </div>

        {/* 2. 아이템 리스트 (스크롤 영역) */}
        <div className="sheet-body" style={{ flex: 1, padding: "10px" }}>
          <div className="card-grid">
            {filteredItems.slice(0, 50).map(
              (
                item // 렌더링 최적화 (최대 50개)
              ) => (
                <div
                  key={item.id}
                  className="item-card"
                  onClick={() => {
                    onSelect(item);
                    close();
                    setSearchTerm(""); // 닫을 때 검색어 초기화
                  }}
                >
                  {/* 썸네일 */}
                  <div className="card-thumb">
                    <img
                      src={GET_ITEM_ICON_LOCAL(item.name, "무기")}
                      alt={item.name}
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = PLACEHOLDER_IMG;
                      }}
                    />
                  </div>

                  {/* 정보 */}
                  <div className="card-info">
                    <div className="card-set" style={{ fontSize: "0.7rem" }}>
                      {item.level || 65}제
                    </div>
                    <div
                      className="card-name"
                      style={{ color: getGradeColor(item.grade) }}
                    >
                      {item.name}
                    </div>
                  </div>
                </div>
              )
            )}

            {/* 검색 결과가 없을 때 */}
            {filteredItems.length === 0 && (
              <div
                style={{
                  gridColumn: "1 / -1",
                  textAlign: "center",
                  padding: "40px",
                  color: "#666",
                }}
              >
                검색 결과가 없습니다.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MiniItemPicker;
