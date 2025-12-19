import React, { useEffect, useState, useMemo, useRef } from "react";
import ReactQuill, { Quill } from "react-quill";
import "react-quill/dist/quill.snow.css";
import { supabase } from "../utils/supabaseClient";
import { updateURL, getQueryParams } from "../utils/urlHelper";

// --- [에디터 설정] ---
const Size = Quill.import("attributors/style/size");
Size.whitelist = [
  "10px",
  "12px",
  "14px",
  "16px",
  "18px",
  "20px",
  "24px",
  "30px",
  "48px",
];
Quill.register(Size, true);

// 2. 폰트 (Font) - 주요 폰트 등록
const Font = Quill.import("attributors/style/font");
Font.whitelist = [
  "Pretendard",
  "MalgunGothic",
  "Arial",
  "Gulim",
  "Dotum",
  "Gungsuh",
  "MODAM",
];
Quill.register(Font, true);
// --------------------------------

const ADMIN_ID = "2f9ff0d3-4b34-42dd-9be6-ba4fea6aa3ff";

const BoardPage = ({ setActivePage, userStats, category }) => {
  const [view, setView] = useState("LIST");
  const [posts, setPosts] = useState([]);
  const [bestPosts, setBestPosts] = useState([]);
  const [currentPost, setCurrentPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [votes, setVotes] = useState({ likes: 0, dislikes: 0, myVote: null });
  const [session, setSession] = useState(null);
  const [sortOrder, setSortOrder] = useState("LATEST");

  // ★ 검색 기능 상태
  const [searchType, setSearchType] = useState("title");
  const [searchKeyword, setSearchKeyword] = useState("");

  const [form, setForm] = useState({
    title: "",
    content: "",
    isNotice: false,
    category: "FREE",
  });
  const [editingId, setEditingId] = useState(null);
  const [commentInput, setCommentInput] = useState("");
  const quillRef = useRef(null);
  const [myNickname, setMyNickname] = useState("모험가");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchMyProfile(session.user.id);
    });
  }, []);

  const fetchMyProfile = async (userId) => {
    try {
      const { data } = await supabase
        .from("profiles")
        .select("nickname")
        .eq("id", userId)
        .single();
      if (data?.nickname) setMyNickname(data.nickname);
    } catch (e) {
      console.error(e);
    }
  };

  const loadPostFromURL = async (id) => {
    try {
      const { data, error } = await supabase
        .from("posts")
        .select("*")
        .eq("id", id)
        .single();
      if (error || !data) {
        alert("존재하지 않거나 삭제된 게시글입니다.");
        updateURL({ id: null });
        setView("LIST");
        return;
      }
      await supabase.rpc("increment_view_count", { row_id: data.id });
      setCurrentPost(data);
      fetchComments(data.id);
      fetchVotes(data.id);
      setView("DETAIL");
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    window.history.replaceState({ menu: "BOARD", view: "LIST" }, "");
    const handlePopState = (event) => {
      if (event.state?.view) {
        setView(event.state.view);
        if (event.state.view === "LIST") setCurrentPost(null);
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // ★ [수정] 카테고리 변경 시 초기화 로직 (검색어 초기화 포함)
  useEffect(() => {
    const params = getQueryParams();

    // 1. 게시판 이동 시 검색어 초기화
    setSearchKeyword("");
    setSearchType("title");

    if (params.id) {
      loadPostFromURL(params.id);
    } else {
      setView("LIST");
      setCurrentPost(null);
    }
    setSortOrder("LATEST");
    fetchPosts("LATEST"); // 초기화된 검색어로 목록 로딩
    fetchBestPosts();
  }, [category]);

  // ★ [수정] 검색 필터가 적용된 fetchPosts
  const fetchPosts = async (order = sortOrder, keyword = "") => {
    try {
      let query = supabase.from("posts").select("*");
      if (category) query = query.eq("category", category);

      // 검색어가 있으면 필터링 (인자로 받은 keyword가 우선)
      const finalKeyword = keyword || searchKeyword;
      if (finalKeyword) {
        if (searchType === "title")
          query = query.ilike("title", `%${finalKeyword}%`);
        else if (searchType === "content")
          query = query.ilike("content", `%${finalKeyword}%`);
        else if (searchType === "nickname")
          query = query.ilike("nickname", `%${finalKeyword}%`);
      }

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
      console.error(error);
    }
  };

  // 검색 버튼 핸들러
  const handleSearch = () => {
    fetchPosts(sortOrder, searchKeyword);
  };

  const fetchBestPosts = async () => {
    try {
      let query = supabase
        .from("posts")
        .select("*")
        .order("like_count", { ascending: false })
        .limit(5);
      if (category) query = query.eq("category", category);
      const { data } = await query;
      setBestPosts(data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchPostDetail = async (post) => {
    updateURL({ id: post.id });
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

  // ★ [수정] 글 등록/수정 후 해당 게시판으로 자동 이동
  const handleWriteSubmit = async () => {
    if (!session) return alert("로그인이 필요합니다.");
    if (!form.title.trim()) return alert("제목을 입력해주세요.");

    const textOnly = form.content.replace(/<[^>]*>?/gm, "").trim();
    if (!textOnly && !form.content.includes("<img"))
      return alert("내용을 입력해주세요.");

    const targetCategory = form.category || category || "FREE";
    const payload = {
      title: form.title,
      content: form.content,
      is_notice: form.isNotice,
      category: targetCategory,
    };

    try {
      if (editingId) {
        const { data, error } = await supabase
          .from("posts")
          .update(payload)
          .eq("id", editingId)
          .eq("user_id", session.user.id)
          .select();

        if (error) throw error;
        if (!data || data.length === 0)
          return alert("수정 실패: 권한이 없습니다.");
        alert("수정되었습니다.");
      } else {
        const { error } = await supabase.from("posts").insert([
          {
            ...payload,
            user_id: session.user.id,
            nickname: myNickname || "모험가",
            view_count: 0,
            like_count: 0,
          },
        ]);
        if (error) throw error;
        alert("등록되었습니다.");
      }

      // ★ [핵심] 글 등록 후 해당 카테고리로 이동 및 새로고침
      // 1. URL 업데이트 (카테고리 변경, ID 제거)
      updateURL({ category: targetCategory, id: null });

      // 2. App.js가 URL 변경을 감지하도록 강제 이벤트 발생 (Hooks 사용 시 필요)
      window.dispatchEvent(new Event("popstate"));

      // 3. 뷰 및 폼 초기화
      setForm({ title: "", content: "", isNotice: false, category: "FREE" });
      setEditingId(null);
      setCurrentPost(null);
      setView("LIST");
    } catch (error) {
      alert("작업 실패: " + error.message);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("정말 삭제하시겠습니까?")) return;
    const { error } = await supabase
      .from("posts")
      .delete()
      .eq("id", currentPost.id)
      .eq("user_id", session.user.id);
    if (!error) {
      alert("삭제되었습니다.");
      handleGoList();
    } else {
      alert("삭제 실패 (본인 글만 삭제 가능)");
    }
  };

  const handleGoList = () => {
    updateURL({ id: null });
    setForm({ title: "", content: "", isNotice: false, category: "FREE" });
    setEditingId(null);
    setCurrentPost(null);
    fetchPosts(sortOrder);
    setView("LIST");
  };

  const handleVote = async (type) => {
    if (!session) return alert("로그인이 필요합니다.");
    await supabase
      .from("post_votes")
      .delete()
      .match({ post_id: currentPost.id, user_id: session.user.id });
    if (votes.myVote !== type) {
      await supabase.from("post_votes").insert([
        {
          post_id: currentPost.id,
          user_id: session.user.id,
          vote_type: type,
        },
      ]);
    }
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
    fetchVotes(currentPost.id);
  };

  const handleCommentSubmit = async () => {
    if (!session) return alert("로그인이 필요합니다.");
    if (!commentInput.trim()) return;
    const { error } = await supabase.from("comments").insert([
      {
        post_id: currentPost.id,
        content: commentInput,
        user_id: session.user.id,
        nickname: myNickname || "모험가",
      },
    ]);
    if (!error) {
      setCommentInput("");
      fetchComments(currentPost.id);
    }
  };

  const formatDate = (date) => new Date(date).toLocaleDateString();
  const handleSort = (order) => {
    setSortOrder(order);
    fetchPosts(order);
  };

  const imageHandler = () => {
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
          [{ font: Font.whitelist }],
          [{ size: Size.whitelist }],
          [{ header: [1, 2, 3, false] }],
          ["bold", "italic", "underline", "strike"],
          [{ color: [] }, { background: [] }],
          [{ align: [] }],
          [{ list: "ordered" }, { list: "bullet" }],
          ["link", "image", "video"],
          ["clean"],
        ],
        handlers: { image: imageHandler },
      },
    }),
    []
  );

  const noticePosts = posts.filter((p) => p.is_notice);

  return (
    <div className="board-container">
      <div className="board-header">
        {/* ★ [수정] 글쓰기(WRITE) 모드에서는 헤더 로고 숨김 (메인으로 버튼만 남김) */}
        {view !== "WRITE" ? (
          <div className="board-title">
            <span>
              {category === "NOTICE"
                ? "📢"
                : category === "GUIDE"
                ? "📘"
                : category === "FREE"
                ? "💬"
                : "📝"}
            </span>
            {category === "NOTICE" && "공지사항"}
            {category === "GUIDE" && "공략 게시판"}
            {category === "FREE" && "자유 게시판"}
            {!category && "전체 게시판"}
          </div>
        ) : (
          <div className="board-title"></div> /* 공백 유지 */
        )}
        <button className="btn-dark" onClick={() => setActivePage("HOME")}>
          🏠 메인으로
        </button>
      </div>

      {view === "LIST" && (
        <>
          {category !== "NOTICE" && bestPosts.length > 0 && (
            <div className="best-posts-area">
              <span className="best-label">🏆 주간 베스트 인기글</span>
              <table className="cafe-table">
                <tbody>
                  {bestPosts.map((post, idx) => (
                    <tr key={post.id} onClick={() => fetchPostDetail(post)}>
                      <td style={{ color: "#ffcc00", fontWeight: "bold" }}>
                        {idx + 1}
                      </td>
                      <td className="col-title">
                        <span className="best-badge">BEST</span>
                        <span className="post-title-text">{post.title}</span>
                      </td>
                      <td>{post.nickname}</td>
                      <td>❤️ {post.like_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

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
                setForm({
                  title: "",
                  content: "",
                  isNotice: false,
                  category: category || "FREE",
                });
                setEditingId(null);
                setView("WRITE");
              }}
            >
              🖊️ 글쓰기
            </button>
          </div>

          <table className="cafe-table">
            <thead>
              <tr>
                <th>번호</th>
                <th>제목</th>
                <th>작성자</th>
                <th>날짜</th>
                <th>조회</th>
                <th>추천</th>
              </tr>
            </thead>
            <tbody>
              {noticePosts.map((post) => (
                <tr
                  key={`notice-${post.id}`}
                  className="notice-pinned-row"
                  onClick={() => fetchPostDetail(post)}
                >
                  <td style={{ color: "#ff5a6a", fontWeight: "bold" }}>공지</td>
                  <td className="col-title">
                    <span
                      className="post-title-text"
                      style={{ fontWeight: "bold", color: "#ffcc00" }}
                    >
                      {post.title}
                    </span>
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
              {posts.map((post, idx) => (
                <tr key={post.id} onClick={() => fetchPostDetail(post)}>
                  <td>{posts.length - idx}</td>
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

          {/* ★ [추가] 하단 검색창 (테이블 아래) */}
          <div className="search-bar-area" style={{ marginTop: "30px" }}>
            <select
              className="search-select"
              value={searchType}
              onChange={(e) => setSearchType(e.target.value)}
            >
              <option value="title">제목</option>
              <option value="content">내용</option>
              <option value="nickname">작성자</option>
            </select>
            <input
              className="search-input"
              placeholder="검색어를 입력하세요"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSearch()}
            />
            <button className="search-btn" onClick={handleSearch}>
              검색
            </button>
          </div>
        </>
      )}

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
          <div
            style={{
              marginBottom: "15px",
              display: "flex",
              alignItems: "center",
            }}
          >
            <select
              className="category-select"
              value={form.category}
              onChange={(e) => {
                const val = e.target.value;
                setForm((prev) => ({ ...prev, category: val }));
              }}
            >
              <option value="FREE">💬 자유 게시판</option>
              <option value="GUIDE">📘 공략 게시판</option>
              {session && session.user.id === ADMIN_ID && (
                <option value="NOTICE">📢 공지사항</option>
              )}
            </select>
            {session && session.user.id === ADMIN_ID && (
              <label
                style={{
                  cursor: "pointer",
                  color: "#ff5a6a",
                  fontWeight: "bold",
                  marginLeft: "10px",
                }}
              >
                <input
                  type="checkbox"
                  checked={form.isNotice}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setForm((prev) => ({ ...prev, isNotice: checked }));
                  }}
                />{" "}
                상단 공지 고정
              </label>
            )}
          </div>
          <input
            className="write-input"
            type="text"
            placeholder="제목을 입력해 주세요."
            value={form.title}
            onChange={(e) => {
              const val = e.target.value;
              setForm((prev) => ({ ...prev, title: val }));
            }}
          />

          <div
            style={{
              background: "#fff",
              height: "500px",
              marginBottom: "50px",
              borderRadius: "4px",
            }}
          >
            <ReactQuill
              ref={quillRef}
              theme="snow"
              value={form.content}
              onChange={(val) => setForm((prev) => ({ ...prev, content: val }))}
              modules={modules}
              style={{ height: "450px", color: "#000" }}
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

      {view === "DETAIL" && currentPost && (
        <div className="post-detail">
          <div className="detail-header">
            <div className="detail-title">
              <span
                style={{
                  fontSize: "1rem",
                  color: "#ffcc00",
                  marginRight: "10px",
                }}
              >
                [
                {currentPost.category === "NOTICE"
                  ? "공지"
                  : currentPost.category === "GUIDE"
                  ? "공략"
                  : "자유"}
                ]
              </span>
              {currentPost.title}
            </div>
            <div className="detail-meta">
              <span>{currentPost.nickname}</span>
              <span>| {formatDate(currentPost.created_at)}</span>
              <span>| 조회 {currentPost.view_count}</span>
              <span>| 추천 {votes.likes}</span>
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
                        category: currentPost.category,
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
