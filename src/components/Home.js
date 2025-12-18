import React, { useEffect, useState } from "react";
import { supabase } from "../utils/supabaseClient";

const Home = ({ setActivePage }) => {
  // --- 상태 관리 ---
  const [notices, setNotices] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isWriting, setIsWriting] = useState(false);
  const [expandedId, setExpandedId] = useState(null); // ★ [NEW] 열린 글 ID 저장

  // 새 공지 입력값
  const [newNotice, setNewNotice] = useState({ title: "", content: "" });

  // ★ [필수] 본인의 UUID를 여기에 넣으세요
  const ADMIN_ID = "2f9ff0d3-4b34-42dd-9be6-ba4fea6aa3ff";

  // --- 초기화 ---
  useEffect(() => {
    fetchNotices();
    checkAdmin();
  }, []);

  const checkAdmin = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session && session.user.id === ADMIN_ID) {
      setIsAdmin(true);
    }
  };

  const fetchNotices = async () => {
    const { data, error } = await supabase
      .from("notices")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error) setNotices(data || []);
  };

  const handleWrite = async () => {
    if (!newNotice.title) return alert("제목을 입력해주세요.");

    const { error } = await supabase
      .from("notices")
      .insert([{ title: newNotice.title, content: newNotice.content || "" }]);

    if (error) {
      alert("작성 실패: " + error.message);
    } else {
      alert("등록되었습니다.");
      setNewNotice({ title: "", content: "" });
      setIsWriting(false);
      fetchNotices();
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation(); // 클릭 이벤트가 부모(글 열기)로 전파되는 것 방지
    if (!window.confirm("정말 삭제하시겠습니까?")) return;

    const { error } = await supabase.from("notices").delete().eq("id", id);
    if (error) alert("삭제 실패");
    else fetchNotices();
  };

  // ★ [NEW] 글 열고 닫기 함수
  const toggleExpand = (id) => {
    if (expandedId === id) {
      setExpandedId(null); // 이미 열려있으면 닫기
    } else {
      setExpandedId(id); // 아니면 열기
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return `${String(date.getMonth() + 1).padStart(2, "0")}.${String(
      date.getDate()
    ).padStart(2, "0")}`;
  };

  const getTagColor = (title) => {
    if (title.includes("Patch") || title.includes("패치")) return "#ff5a6a";
    if (title.includes("New") || title.includes("오픈")) return "#00ff00";
    return "var(--grade-unique)";
  };

  return (
    <div className="home-container">
      {/* 1. 히어로 배너 */}
      <div className="hero-banner">
        <div className="hero-title">MODAM</div>
        <div className="hero-subtitle">
          던전앤파이터 모바일의 모든 것을 담다.
          <br />
          데미지 계산 & 유틸리티 사이트
        </div>
        <button className="cta-button" onClick={() => setActivePage("CALC")}>
          데미지 계산기 시작하기
        </button>
      </div>

      {/* 2. 대시보드 그리드 */}
      <div className="dashboard-grid">
        {/* [A] 공지사항 */}
        <div className="content-card">
          <div className="card-header">
            <div className="card-title">📢 공지사항</div>
            <div style={{ display: "flex", gap: "10px", fontSize: "0.8rem" }}>
              {/* 더보기 버튼: 클릭 시 전체 페이지(NOTICE)로 이동 */}
              <span
                onClick={() => setActivePage("NOTICE")}
                style={{ color: "#666", cursor: "pointer" }}
              >
                더보기 +
              </span>
            </div>
          </div>

          <div className="notice-list">
            {notices.length === 0 ? (
              <div
                style={{
                  padding: "20px",
                  textAlign: "center",
                  color: "#666",
                  fontSize: "0.9rem",
                }}
              >
                등록된 공지사항이 없습니다.
              </div>
            ) : (
              // 홈에서는 최신 3~4개만, 제목만 깔끔하게 보여줌
              notices.slice(0, 4).map((notice) => (
                <div
                  key={notice.id}
                  className="notice-item"
                  onClick={() => setActivePage("NOTICE")} // 누르면 전체보기로 이동
                  style={{ cursor: "pointer" }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      overflow: "hidden",
                    }}
                  >
                    <span
                      className="notice-tag"
                      style={{ color: getTagColor(notice.title) }}
                    >
                      {notice.title.startsWith("[")
                        ? notice.title.split("]")[0].replace("[", "")
                        : "Notice"}
                    </span>
                    <span
                      style={{
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {notice.title.replace(/^\[.*?\]\s*/, "")}
                    </span>
                  </div>
                  <span className="notice-date">
                    {formatDate(notice.created_at)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* [B] 유틸리티 메뉴 */}
        <div className="content-card">
          <div className="card-header">
            <div className="card-title">🛠️ 유틸리티</div>
          </div>
          <div className="menu-grid">
            <div className="menu-item" onClick={() => setActivePage("CALC")}>
              <span className="menu-icon">🧮</span>
              <span className="menu-label">계산기</span>
            </div>
            <div className="menu-item" onClick={() => alert("준비 중입니다!")}>
              <span className="menu-icon">📚</span>
              <span className="menu-label">아이템 도감</span>
            </div>
            <div className="menu-item" onClick={() => alert("준비 중입니다!")}>
              <span className="menu-icon">📊</span>
              <span className="menu-label">직업 랭킹</span>
            </div>
            <div className="menu-item" onClick={() => setActivePage("BOARD")}>
              {" "}
              <span className="menu-icon">📝</span>
              <span className="menu-label">공략 게시판</span>
            </div>
          </div>
        </div>

        {/* [C] 업데이트 예정 */}
        <div className="content-card">
          <div className="card-header">
            <div className="card-title">🚀 업데이트 예정</div>
          </div>
          <ul
            style={{
              color: "#aaa",
              paddingLeft: "20px",
              lineHeight: "1.8",
              fontSize: "0.9rem",
            }}
          >
            <li>길드 모집 등 홍보 게시판 기능</li>
            <li>모바일 환경 UI 최적화 (2차)</li>
            <li>모든 직업 스킬트리 추가</li>
            <li>일부 장비 누락된 효과 추가</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Home;
