import React, { useEffect, useState, useMemo, useRef } from "react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { supabase } from "../utils/supabaseClient";

// ★ [관리자 ID] 본인의 UUID (Home.js와 동일하게 설정)
const ADMIN_ID = "2f9ff0d3-4b34-42dd-9be6-ba4fea6aa3ff";

const BoardPage = ({ setActivePage, userStats, category }) => {
  // --- 상태 관리 ---
  const [view, setView] = useState("LIST"); // LIST, DETAIL, WRITE
  const [posts, setPosts] = useState([]);
  const [bestPosts, setBestPosts] = useState([]); // 인기글
  const [currentPost, setCurrentPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [votes, setVotes] = useState({ likes: 0, dislikes: 0, myVote: null });

  const [session, setSession] = useState(null);
  const [sortOrder, setSortOrder] = useState("LATEST"); // LATEST, VIEW, LIKE

  // 글쓰기 관련
  const [form, setForm] = useState({ title: "", content: "", isNotice: false });
  const [editingId, setEditingId] = useState(null);
  const [commentInput, setCommentInput] = useState("");
  const quillRef = useRef(null);

  // --- 1. 초기화 & 카테고리 변경 감지 ---
  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => setSession(session));
  }, []);

  // ★ [핵심] 카테고리가 바뀌면 무조건 목록으로 돌아가고, 데이터를 다시 부름
  useEffect(() => {
    setView("LIST");
    setSortOrder("LATEST"); // 정렬 초기화
    fetchPosts("LATEST");
    fetchBestPosts();
  }, [category]);

  // --- 2. 데이터 불러오기 ---
  const fetchPosts = async (order = sortOrder) => {
    try {
      let query = supabase.from("posts").select("*");

      // 카테고리 필터
      if (category) query = query.eq("category", category);

      // 정렬 로직
      if (order === "LATEST")
        query = query.order("created_at", { ascending: false });
      else if (order === "VIEW")
        query = query.order("view_count", { ascending: false });
      else if (order === "LIKE")
        query = query.order("like_count", { ascending: false });

      const { data, error } = await query;
      if (error) throw error;
      setPosts(data || []);
    } catch (error) {
      console.error("게시글 로딩 실패:", error);
    }
  };

  // 인기글 (좋아요 상위 5개)
  const fetchBestPosts = async () => {
    try {
      // 카테고리 상관없이 전체 기간 or 해당 카테고리 내에서 인기글
      let query = supabase
        .from("posts")
        .select("*")
        .order("like_count", { ascending: false })
        .limit(5); // 상위 5개

      if (category) query = query.eq("category", category);

      const { data } = await query;
      setBestPosts(data || []);
    } catch (e) {
      console.error(e);
    }
  };

  // 상세 보기
  const fetchPostDetail = async (post) => {
    // 조회수 증가 (RPC 함수 호출)
    await supabase.rpc("increment_view_count", { row_id: post.id });

    setCurrentPost(post);
    fetchComments(post.id);
    fetchVotes(post.id);
    setView("DETAIL");
  };

  const fetchComments = async (postId) => {
    const { data } = await supabase
      .from("comments")
      .select("*")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });
    setComments(data || []);
  };

  const fetchVotes = async (postId) => {
    const { data } = await supabase
      .from("post_votes")
      .select("vote_type, user_id")
      .eq("post_id", postId);

    if (data) {
      const likes = data.filter((v) => v.vote_type === "like").length;
      const dislikes = data.filter((v) => v.vote_type === "dislike").length;
      let myVote = null;
      if (session) {
        const myRecord = data.find((v) => v.user_id === session.user.id);
        if (myRecord) myVote = myRecord.vote_type;
      }
      setVotes({ likes, dislikes, myVote });
    }
  };

  // --- 3. 글쓰기/수정/삭제 ---
  const handleWriteSubmit = async () => {
    if (!session) return alert("로그인이 필요합니다.");
    if (!form.title.trim()) return alert("제목을 입력해주세요.");

    // 내용 태그 제거 후 빈값 체크
    const textOnly = form.content.replace(/<[^>]*>?/gm, "").trim();
    if (!textOnly && !form.content.includes("<img"))
      return alert("내용을 입력해주세요.");

    const payload = {
      title: form.title,
      content: form.content,
      is_notice: form.isNotice, // 공지 여부
      category: category,
    };

    if (editingId) {
      // 수정
      const { error } = await supabase
        .from("posts")
        .update(payload)
        .eq("id", editingId)
        .eq("user_id", session.user.id);

      if (error) alert("수정 실패: " + error.message);
      else {
        alert("수정되었습니다.");
        handleGoList();
      }
    } else {
      // 작성
      const { error } = await supabase.from("posts").insert([
        {
          ...payload,
          user_id: session.user.id,
          nickname: userStats.character.nickname || "모험가",
          view_count: 0,
          like_count: 0,
        },
      ]);

      if (error) alert("작성 실패: " + error.message);
      else {
        handleGoList();
      }
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("정말 삭제하시겠습니까?")) return;
    const { error } = await supabase
      .from("posts")
      .delete()
      .eq("id", currentPost.id);
    if (!error) {
      alert("삭제되었습니다.");
      handleGoList();
    }
  };

  // 목록으로 돌아가기 (초기화 포함)
  const handleGoList = () => {
    setForm({ title: "", content: "", isNotice: false });
    setEditingId(null);
    setCurrentPost(null);
    fetchPosts(sortOrder);
    fetchBestPosts();
    setView("LIST");
  };

  // --- 4. 좋아요/댓글 ---
  const handleVote = async (type) => {
    if (!session) return alert("로그인이 필요합니다.");

    // 기존 투표 삭제
    await supabase
      .from("post_votes")
      .delete()
      .match({ post_id: currentPost.id, user_id: session.user.id });

    // 새 투표 추가 (이미 누른거 취소가 아닐 경우)
    if (votes.myVote !== type) {
      await supabase.from("post_votes").insert([
        {
          post_id: currentPost.id,
          user_id: session.user.id,
          vote_type: type,
        },
      ]);
    }

    // ★ [중요] DB의 like_count 컬럼도 수동으로 업데이트 해줘야 정렬이 됨
    // (실무에선 트리거를 쓰지만, 여기선 간단히 JS로 계산해서 업데이트)
    const { count } = await supabase
      .from("post_votes")
      .select("*", { count: "exact", head: true })
      .eq("post_id", currentPost.id)
      .eq("vote_type", "like");
    const newLikeCount =
      votes.myVote !== "like" && type === "like"
        ? (count || 0) + 1
        : count || 0;

    await supabase
      .from("posts")
      .update({ like_count: newLikeCount })
      .eq("id", currentPost.id);

    fetchVotes(currentPost.id); // UI 갱신
  };

  const handleCommentSubmit = async () => {
    if (!session) return alert("로그인이 필요합니다.");
    if (!commentInput.trim()) return;

    const { error } = await supabase.from("comments").insert([
      {
        post_id: currentPost.id,
        content: commentInput,
        user_id: session.user.id,
        nickname: userStats.character.nickname || "모험가",
      },
    ]);

    if (!error) {
      setCommentInput("");
      fetchComments(currentPost.id);
    }
  };

  // --- 5. 렌더링 헬퍼 ---
  const formatDate = (date) => new Date(date).toLocaleDateString();

  // 정렬 핸들러
  const handleSort = (order) => {
    setSortOrder(order);
    fetchPosts(order);
  };

  // 에디터 모듈 (이미지 핸들러 포함)
  const imageHandler = () => {
    /* 기존 코드 유지 (생략 가능하나 기능 보존을 위해 남김) */
    const input = document.createElement("input");
    input.setAttribute("type", "file");
    input.setAttribute("accept", "image/*");
    input.click();
    input.onchange = async () => {
      const file = input.files[0];
      if (!file) return;
      const fileName = `${Date.now()}_${Math.random()
        .toString(36)
        .substring(2)}.${file.name.split(".").pop()}`;
      const { error } = await supabase.storage
        .from("board_images")
        .upload(fileName, file);
      if (!error) {
        const { data } = supabase.storage
          .from("board_images")
          .getPublicUrl(fileName);
        const editor = quillRef.current.getEditor();
        const range = editor.getSelection();
        editor.insertEmbed(range.index, "image", data.publicUrl);
      }
    };
  };

  const modules = useMemo(
    () => ({
      toolbar: {
        container: [
          [{ header: [1, 2, 3, false] }],
          ["bold", "italic", "underline", "strike"],
          [{ color: [] }, { background: [] }],
          ["link", "image"],
        ],
        handlers: { image: imageHandler },
      },
    }),
    []
  );

  return (
    <div className="board-container">
      {/* --- [헤더 영역] --- */}
      <div className="board-header">
        <div className="board-title">
          <span>
            {category === "NOTICE" ? "📢" : category === "GUIDE" ? "📘" : "💬"}
          </span>
          {category === "NOTICE" && "공지사항"}
          {category === "GUIDE" && "공략 게시판"}
          {category === "FREE" && "자유 게시판"}
          {!category && "전체 게시판"}
        </div>
        <button className="btn-dark" onClick={() => setActivePage("HOME")}>
          🏠 메인으로
        </button>
      </div>

      {/* --- [VIEW: LIST] 목록 화면 --- */}
      {view === "LIST" && (
        <>
          {/* 인기글 섹션 (공지 제외) */}
          {category !== "NOTICE" && bestPosts.length > 0 && (
            <div className="best-posts-area">
              <span className="best-label">🏆 주간 베스트 인기글</span>
              <table className="cafe-table">
                <tbody>
                  {bestPosts.map((post, idx) => (
                    <tr key={post.id} onClick={() => fetchPostDetail(post)}>
                      <td
                        style={{
                          width: "50px",
                          color: "#ffcc00",
                          fontWeight: "bold",
                        }}
                      >
                        {idx + 1}
                      </td>
                      <td className="col-title">
                        <span className="best-badge">BEST</span>
                        <span className="post-title-text">{post.title}</span>
                      </td>
                      <td style={{ width: "120px" }}>{post.nickname}</td>
                      <td style={{ width: "80px" }}>❤️ {post.like_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* 툴바 (정렬 & 글쓰기) */}
          <div className="board-toolbar">
            <div>
              <button
                className={`sort-btn ${sortOrder === "LATEST" ? "active" : ""}`}
                onClick={() => handleSort("LATEST")}
              >
                최신순
              </button>
              <button
                className={`sort-btn ${sortOrder === "VIEW" ? "active" : ""}`}
                onClick={() => handleSort("VIEW")}
              >
                조회순
              </button>
              <button
                className={`sort-btn ${sortOrder === "LIKE" ? "active" : ""}`}
                onClick={() => handleSort("LIKE")}
              >
                좋아요순
              </button>
            </div>
            <button
              className="btn-gold"
              onClick={() => {
                if (!session) return alert("로그인이 필요합니다.");
                setForm({ title: "", content: "", isNotice: false });
                setView("WRITE");
              }}
            >
              🖊️ 글쓰기
            </button>
          </div>

          {/* 메인 게시글 목록 */}
          <table className="cafe-table">
            <thead>
              <tr>
                <th style={{ width: "60px" }}>번호</th>
                <th>제목</th>
                <th style={{ width: "120px" }}>작성자</th>
                <th style={{ width: "100px" }}>날짜</th>
                <th style={{ width: "70px" }}>조회</th>
                <th style={{ width: "70px" }}>추천</th>
              </tr>
            </thead>
            <tbody>
              {/* 공지사항 상단 고정 */}
              {posts
                .filter((p) => p.is_notice)
                .map((post) => (
                  <tr
                    key={post.id}
                    className="notice-row"
                    onClick={() => fetchPostDetail(post)}
                  >
                    <td>
                      <span style={{ color: "#ff5a6a", fontWeight: "bold" }}>
                        공지
                      </span>
                    </td>
                    <td className="col-title">
                      <span className="notice-badge">필독</span>
                      <span
                        className="post-title-text"
                        style={{ fontWeight: "bold" }}
                      >
                        {post.title}
                      </span>
                    </td>
                    <td>{post.nickname}</td>
                    <td>{formatDate(post.created_at)}</td>
                    <td>{post.view_count}</td>
                    <td>{post.like_count}</td>
                  </tr>
                ))}

              {/* 일반 게시글 */}
              {posts
                .filter((p) => !p.is_notice)
                .map((post) => (
                  <tr key={post.id} onClick={() => fetchPostDetail(post)}>
                    <td>{post.id.toString().slice(-4)}</td>
                    <td className="col-title">
                      <span className="post-title-text">{post.title}</span>
                      {post.content.includes("<img") && (
                        <span style={{ marginLeft: "5px" }}>📷</span>
                      )}
                    </td>
                    <td>{post.nickname}</td>
                    <td>{formatDate(post.created_at)}</td>
                    <td>{post.view_count}</td>
                    <td>{post.like_count}</td>
                  </tr>
                ))}

              {posts.length === 0 && (
                <tr>
                  <td colSpan="6" style={{ padding: "50px", color: "#666" }}>
                    게시글이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </>
      )}

      {/* --- [VIEW: WRITE] 글쓰기 화면 --- */}
      {view === "WRITE" && (
        <div className="write-container">
          <h2
            style={{
              marginTop: 0,
              borderBottom: "1px solid #333",
              paddingBottom: "15px",
            }}
          >
            {editingId ? "글 수정" : "새 글 작성"}
          </h2>

          <div style={{ marginBottom: "15px" }}>
            {/* 카테고리 표시 */}
            <span
              style={{
                color: "#ffcc00",
                marginRight: "15px",
                fontWeight: "bold",
              }}
            >
              [
              {category === "NOTICE"
                ? "공지사항"
                : category === "GUIDE"
                ? "공략"
                : "자유"}
              ]
            </span>

            {/* ★ [관리자 전용] 공지사항 체크박스 */}
            {session && session.user.id === ADMIN_ID && (
              <label
                style={{
                  cursor: "pointer",
                  color: "#ff5a6a",
                  fontWeight: "bold",
                }}
              >
                <input
                  type="checkbox"
                  checked={form.isNotice}
                  onChange={(e) =>
                    setForm({ ...form, isNotice: e.target.checked })
                  }
                />{" "}
                상단 공지 등록
              </label>
            )}
          </div>

          <input
            className="write-input"
            type="text"
            placeholder="제목을 입력해 주세요."
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />

          <div
            style={{
              background: "#fff",
              height: "450px",
              marginBottom: "50px",
              borderRadius: "4px",
            }}
          >
            <ReactQuill
              ref={quillRef}
              theme="snow"
              value={form.content}
              onChange={(val) => setForm({ ...form, content: val })}
              modules={modules}
              style={{ height: "400px", color: "#000" }}
              placeholder="내용을 입력하세요."
            />
          </div>

          <div
            style={{
              textAlign: "center",
              gap: "10px",
              display: "flex",
              justifyContent: "center",
            }}
          >
            <button className="btn-dark" onClick={handleGoList}>
              취소
            </button>
            <button className="btn-gold" onClick={handleWriteSubmit}>
              등록 완료
            </button>
          </div>
        </div>
      )}

      {/* --- [VIEW: DETAIL] 상세 보기 화면 --- */}
      {view === "DETAIL" && currentPost && (
        <div className="post-detail">
          <div className="detail-header">
            <div className="detail-title">{currentPost.title}</div>
            <div className="detail-meta">
              <span>{currentPost.nickname}</span>
              <span>| {formatDate(currentPost.created_at)}</span>
              <span>| 조회 {currentPost.view_count}</span>
              <span>| 추천 {votes.likes}</span>

              {/* 수정/삭제 버튼 */}
              {session && session.user.id === currentPost.user_id && (
                <div
                  style={{ marginLeft: "auto", display: "flex", gap: "10px" }}
                >
                  <span
                    style={{ cursor: "pointer", color: "#fff" }}
                    onClick={() => {
                      setForm({
                        title: currentPost.title,
                        content: currentPost.content,
                        isNotice: currentPost.is_notice,
                      });
                      setEditingId(currentPost.id);
                      setView("WRITE");
                    }}
                  >
                    수정
                  </span>
                  <span
                    style={{ cursor: "pointer", color: "#ff5a6a" }}
                    onClick={handleDelete}
                  >
                    삭제
                  </span>
                </div>
              )}
            </div>
          </div>

          <div
            className="detail-content ql-editor"
            dangerouslySetInnerHTML={{ __html: currentPost.content }}
          ></div>

          <div style={{ textAlign: "center", marginBottom: "40px" }}>
            <button
              onClick={() => handleVote("like")}
              style={{
                background: votes.myVote === "like" ? "#ff5a6a" : "#333",
                color: "#fff",
                padding: "12px 30px",
                border: "none",
                borderRadius: "30px",
                fontSize: "1.1rem",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              ❤️ 좋아요 {votes.likes}
            </button>
          </div>

          <div className="comment-box">
            <h3
              style={{
                marginTop: 0,
                borderBottom: "1px solid #333",
                paddingBottom: "10px",
              }}
            >
              댓글 {comments.length}
            </h3>
            {comments.map((comment) => (
              <div
                key={comment.id}
                style={{ borderBottom: "1px dashed #333", padding: "10px 0" }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "5px",
                  }}
                >
                  <strong style={{ color: "#ddd" }}>{comment.nickname}</strong>
                  <span style={{ fontSize: "0.8rem", color: "#666" }}>
                    {formatDate(comment.created_at)}
                  </span>
                </div>
                <div style={{ color: "#aaa" }}>{comment.content}</div>
              </div>
            ))}

            <div className="comment-input-area">
              <input
                className="comment-input"
                placeholder={
                  session ? "댓글을 남겨보세요." : "로그인이 필요합니다."
                }
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleCommentSubmit()}
                disabled={!session}
              />
              <button className="btn-dark" onClick={handleCommentSubmit}>
                등록
              </button>
            </div>
          </div>

          <div style={{ marginTop: "20px", textAlign: "right" }}>
            <button className="btn-dark" onClick={handleGoList}>
              목록으로
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BoardPage;
