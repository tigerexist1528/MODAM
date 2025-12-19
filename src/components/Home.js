import React, { useEffect, useState } from "react";
import { supabase } from "../utils/supabaseClient";

// ★ 더미 이벤트 데이터 (나중에 DB나 크롤링으로 대체 가능)
// 실제 던파 모바일 홈페이지 이벤트 링크를 href에 넣으면 됩니다.
const DUMMY_EVENTS = [
  {
    id: 1,
    title: "윈터 슬라이딩 ❄️",
    dDay: "진행중",
    date: "2025년 12월 18일(목) ~ 2026년 1월 22일(목) 오전 6시까지",
    imgUrl:
      "https://dszw1qtcnsa5e.cloudfront.net/community/20251216/b8dd8acc-b0ef-4f10-b8a6-678066501aba/KMDF01%EC%9C%88%ED%84%B0%EC%8A%AC%EB%9D%BC%EC%9D%B4%EB%94%A9%EC%83%81%EC%A0%90%EC%84%AC%EB%84%A4%EC%9D%BC768x492.png", // 이미지 주소 교체 필요
    link: "https://dnfm.nexon.com/News/Event/View/3309301",
  },
  {
    id: 2,
    title: "크리스마스 트리를 부탁해! 🎄",
    dDay: "진행중",
    date: "2025년 12월 18일(목) ~ 2026년 1월 8일(목) 오전 6시까지",
    imgUrl:
      "https://dszw1qtcnsa5e.cloudfront.net/community/20251217/a5d3184c-5751-45e6-b85d-dbcee6cdb360/KMDF02%ED%81%AC%EB%A6%AC%EC%8A%A4%EB%A7%88%EC%8A%A4%ED%8A%B8%EB%A6%AC%EB%A5%BC%EB%B6%80%ED%83%81%ED%95%B4%EC%83%81%EC%A0%90%EC%84%AC%EB%84%A4%EC%9D%BC768x492.png",
    link: "https://dnfm.nexon.com/News/Event/View/3309300",
  },
  {
    id: 3,
    title: "윈터 코인 상점 ❄️",
    dDay: "진행중",
    date: "2025년 12월 18일(목) ~ 2026년 1월 22일(목) 오전 6시까지",
    imgUrl:
      "https://dszw1qtcnsa5e.cloudfront.net/community/20251215/63b733ab-1314-4694-a221-ce6bd0255590/KMDF03%EC%9C%88%ED%84%B0%EC%BD%94%EC%9D%B8%EC%83%81%EC%A0%90%EC%83%81%EC%A0%90%EC%84%AC%EB%84%A4%EC%9D%BC768x492.png",
    link: "https://dnfm.nexon.com/News/Event/View/3309299",
  },
  {
    id: 4,
    title: "12/18(목) 업데이트 안내",
    dDay: "진행중",
    date: "2025년 12월 18일(목)",
    imgUrl:
      "https://dszw1qtcnsa5e.cloudfront.net/community/20250604/c9257841-65df-4ec2-aa70-9f1615c4d587/image202506041421311.jpeg",
    link: "https://dnfm.nexon.com/News/Update/View/3309306t",
  },
];

const Home = ({ setActivePage, setBoardCategory }) => {
  const [notices, setNotices] = useState([]);

  // 공지사항 5개만 가져오기
  useEffect(() => {
    fetchLatestNotices();
  }, []);

  const fetchLatestNotices = async () => {
    // ★ [수정] 'notices' 테이블 -> 실제 게시판인 'posts' 테이블로 변경
    // 카테고리가 'NOTICE'인 글만 최신순으로 5개 가져옴
    const { data, error } = await supabase
      .from("posts")
      .select("id, title, created_at, category") // category 확인용
      .eq("category", "NOTICE") // ★ 공지사항만 필터링
      .order("created_at", { ascending: false })
      .limit(5);

    if (!error && data) {
      setNotices(data);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return `${date.getMonth() + 1}.${date.getDate()}`;
  };

  return (
    <div className="home-container">
      {/* 1. 히어로 배너 (사이트 대문) */}
      <section className="hero-section">
        <div className="hero-bg-effect"></div>
        <div className="hero-content">
          <h1 className="hero-title">
            <span>MODAM</span> CALCULATOR
          </h1>
          <p className="hero-subtitle">
            던전앤파이터 모바일 데미지 계산의 모든 것.
            <br />
            최적의 세팅을 지금 바로 확인하세요.
          </p>
          <button className="hero-btn" onClick={() => setActivePage("CALC")}>
            계산기 바로가기 &rarr;
          </button>
        </div>
      </section>

      {/* 2. 진행중인 이벤트 (슬라이더) */}
      <section className="section-container">
        <div className="section-header">
          <div className="section-title">🔥 진행중인 이벤트</div>
          <div
            className="section-more"
            onClick={() =>
              window.open("https://dnfm.nexon.com/News/Event", "_blank")
            }
          >
            공식 홈페이지 바로가기 &gt;
          </div>
        </div>

        <div className="event-slider">
          {DUMMY_EVENTS.map((evt) => (
            <a
              key={evt.id}
              href={evt.link}
              target="_blank"
              rel="noreferrer"
              className="event-card"
            >
              <img src={evt.imgUrl} alt={evt.title} className="event-img" />
              <div className="event-info">
                <span className="d-day-badge">{evt.dDay}</span>
                <div className="event-title">{evt.title}</div>
                <div className="event-date">{evt.date}</div>
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* 3. 하단 정보 그리드 (공지사항 + 퀵메뉴) */}
      <section className="bottom-grid">
        {/* [A] 최신 공지사항 */}
        <div className="info-card">
          <div
            className="section-header"
            style={{ marginBottom: "15px", borderBottom: "1px solid #333" }}
          >
            <div className="section-title" style={{ fontSize: "1.1rem" }}>
              📢 최신 소식
            </div>
            <div
              className="section-more"
              onClick={() => setActivePage("BOARD")}
            >
              + 더보기
            </div>
          </div>
          <div className="notice-list-simple">
            {notices.length === 0 ? (
              <div
                style={{ color: "#666", textAlign: "center", padding: "20px" }}
              >
                등록된 공지사항이 없습니다.
              </div>
            ) : (
              notices.map((notice) => (
                <div
                  key={notice.id}
                  className="notice-row"
                  onClick={() => setActivePage("BOARD")}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      overflow: "hidden",
                    }}
                  >
                    <span className="notice-cat">Notice</span>
                    <span className="notice-subj">{notice.title}</span>
                  </div>
                  <span className="notice-dt">
                    {formatDate(notice.created_at)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* [B] 퀵 메뉴 */}
        <div className="info-card">
          <div
            className="section-header"
            style={{ marginBottom: "15px", borderBottom: "1px solid #333" }}
          >
            <div className="section-title" style={{ fontSize: "1.1rem" }}>
              ⚡ 바로가기
            </div>
          </div>
          <div className="quick-menu-grid">
            <div className="quick-btn" onClick={() => setActivePage("CALC")}>
              <span className="quick-icon">🧮</span>
              데미지 계산기
            </div>
            <div className="quick-btn" onClick={() => setActivePage("BOARD")}>
              <span className="quick-icon">📝</span>
              공략 게시판
            </div>
            <div className="quick-btn" onClick={() => setActivePage("RANK")}>
              <span className="quick-icon">🏆</span>
              직업 랭킹
            </div>
            <div className="quick-btn" onClick={() => setActivePage("GAME")}>
              <span className="quick-icon">🎮</span>
              미니 게임
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
