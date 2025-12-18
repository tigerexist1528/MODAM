import React, { useEffect, useState, useMemo, useRef } from "react";
import ReactQuill from "react-quill"; // ★ 오리지널 버전 사용
import "react-quill/dist/quill.snow.css";
import { supabase } from "../utils/supabaseClient";

const BoardPage = ({ setActivePage, userStats }) => {
  const [view, setView] = useState("LIST");
  const [posts, setPosts] = useState([]);
  const [currentPost, setCurrentPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [votes, setVotes] = useState({ likes: 0, dislikes: 0, myVote: null });

  const [session, setSession] = useState(null);
  const quillRef = useRef(null);

  // 입력 폼
  const [form, setForm] = useState({ title: "", content: "" });
  const [commentInput, setCommentInput] = useState("");

  // ★ [추가] 수정 모드인지 확인하는 상태 (수정할 글의 ID를 저장)
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => setSession(session));
    fetchPosts();
  }, []);

  // --- [API] 기본 기능 ---
  const fetchPosts = async () => {
    const { data, error } = await supabase
      .from("posts")
      .select("*, post_votes(vote_type)")
      .order("created_at", { ascending: false });
    if (!error) setPosts(data);
  };

  const fetchPostDetail = async (post) => {
    // 에러 무시하고 조회수 증가
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

  // --- ★ [수정] 글쓰기/수정 완료 핸들러 ---
  const handleWriteSubmit = async () => {
    if (!session) return alert("로그인이 필요합니다.");
    if (!form.title || !form.content)
      return alert("제목과 내용을 입력해주세요.");

    // 내용 비었는지 체크 (HTML 태그 제거 후 확인)
    const textOnly = form.content.replace(/<[^>]*>?/gm, "").trim();
    if (!textOnly && !form.content.includes("<img"))
      return alert("내용을 입력해주세요.");

    if (editingId) {
      // ★ [수정 모드] Update 실행
      const { error } = await supabase
        .from("posts")
        .update({
          title: form.title,
          content: form.content,
          // 닉네임은 수정 시점의 것으로 업데이트할지, 유지할지 선택 (여기선 유지)
        })
        .eq("id", editingId)
        .eq("user_id", session.user.id); // 본인 확인 한번 더

      if (error) {
        alert("수정 실패: " + error.message);
      } else {
        alert("수정되었습니다.");
        setForm({ title: "", content: "" });
        setEditingId(null); // 수정 모드 해제
        fetchPosts(); // 목록 갱신

        // 수정한 글의 상세 화면으로 다시 이동 (선택 사항)
        const { data: updatedPost } = await supabase
          .from("posts")
          .select("*")
          .eq("id", editingId)
          .single();
        if (updatedPost) fetchPostDetail(updatedPost);
        else setView("LIST");
      }
    } else {
      // ★ [작성 모드] Insert 실행
      const { error } = await supabase.from("posts").insert([
        {
          title: form.title,
          content: form.content,
          user_id: session.user.id,
          nickname: userStats.character.nickname || "모험가",
        },
      ]);

      if (error) {
        alert("작성 실패: " + error.message);
      } else {
        setForm({ title: "", content: "" });
        fetchPosts();
        setView("LIST");
      }
    }
  };

  // --- ★ [추가] 수정 버튼 클릭 시 실행 ---
  const handleEditClick = () => {
    if (!currentPost) return;
    setForm({
      title: currentPost.title,
      content: currentPost.content,
    });
    setEditingId(currentPost.id); // 수정 중인 글 ID 저장
    setView("WRITE"); // 글쓰기 화면으로 이동
  };

  const handleDelete = async () => {
    if (!window.confirm("정말 삭제하시겠습니까?")) return;
    const { error } = await supabase
      .from("posts")
      .delete()
      .eq("id", currentPost.id);
    if (!error) {
      alert("삭제되었습니다.");
      setView("LIST");
      fetchPosts();
    } else {
      alert("삭제 실패");
    }
  };

  const handleCommentSubmit = async () => {
    if (!session) return alert("로그인이 필요합니다.");
    if (!commentInput) return;
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
    fetchVotes(currentPost.id);
  };

  // --- 이미지 핸들러 ---
  const imageHandler = () => {
    const input = document.createElement("input");
    input.setAttribute("type", "file");
    input.setAttribute("accept", "image/*");
    input.click();

    input.onchange = async () => {
      const file = input.files[0];
      if (!file) return;

      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}_${Math.random()
        .toString(36)
        .substring(2)}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("board_images")
        .upload(filePath, file);

      if (uploadError) {
        console.error(uploadError);
        return alert("이미지 업로드 실패!");
      }

      const { data } = supabase.storage
        .from("board_images")
        .getPublicUrl(filePath);
      const editor = quillRef.current.getEditor();
      const range = editor.getSelection();
      editor.insertEmbed(range.index, "image", data.publicUrl);
    };
  };

  const modules = useMemo(
    () => ({
      toolbar: {
        container: [
          [{ header: [1, 2, 3, false] }],
          ["bold", "italic", "underline", "strike"],
          [{ color: [] }, { background: [] }],
          [{ list: "ordered" }, { list: "bullet" }],
          ["link", "image"],
          ["clean"],
        ],
        handlers: { image: imageHandler },
      },
    }),
    []
  );

  const formatDate = (date) => new Date(date).toLocaleDateString();

  return (
    <div
      className="board-container"
      style={{
        maxWidth: "1000px",
        margin: "0 auto",
        padding: "20px",
        color: "#fff",
        minHeight: "80vh",
      }}
    >
      {/* 헤더 */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
          borderBottom: "1px solid #444",
          paddingBottom: "15px",
        }}
      >
        <h2
          style={{ fontSize: "1.8rem", margin: 0, cursor: "pointer" }}
          onClick={() => setView("LIST")}
        >
          📝 공략 게시판
        </h2>
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={() => setActivePage("HOME")}
            style={{
              background: "#444",
              border: "none",
              color: "#fff",
              padding: "8px 15px",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            🏠 메인으로
          </button>
          {view === "LIST" && (
            <button
              onClick={() => {
                if (!session) return alert("로그인 후 이용 가능합니다.");
                setForm({ title: "", content: "" }); // 초기화
                setEditingId(null); // 수정 모드 해제
                setView("WRITE");
              }}
              style={{
                background: "var(--text-gold)",
                border: "none",
                color: "#000",
                fontWeight: "bold",
                padding: "8px 15px",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              글쓰기
            </button>
          )}
        </div>
      </div>

      {/* 1. 글 목록 화면 */}
      {view === "LIST" && (
        <div className="post-list">
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "0.95rem",
            }}
          >
            <thead>
              <tr style={{ borderBottom: "2px solid #555", color: "#aaa" }}>
                <th style={{ padding: "10px", textAlign: "left" }}>제목</th>
                <th style={{ padding: "10px", width: "120px" }}>작성자</th>
                <th style={{ padding: "10px", width: "100px" }}>날짜</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((post) => (
                <tr
                  key={post.id}
                  onClick={() => fetchPostDetail(post)}
                  style={{
                    borderBottom: "1px solid #333",
                    cursor: "pointer",
                    transition: "0.2s",
                  }}
                  className="hover-row"
                >
                  <td style={{ padding: "12px 10px" }}>
                    {post.title}
                    {post.content.includes("<img") && (
                      <span style={{ fontSize: "0.8rem", marginLeft: "5px" }}>
                        📷
                      </span>
                    )}
                  </td>
                  <td style={{ textAlign: "center", color: "#ccc" }}>
                    {post.nickname}
                  </td>
                  <td
                    style={{
                      textAlign: "center",
                      color: "#666",
                      fontSize: "0.8rem",
                    }}
                  >
                    {formatDate(post.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {posts.length === 0 && (
            <div
              style={{ padding: "40px", textAlign: "center", color: "#666" }}
            >
              아직 등록된 게시글이 없습니다.
            </div>
          )}
        </div>
      )}

      {/* 2. 글 쓰기/수정 화면 */}
      {view === "WRITE" && (
        <div
          className="write-form"
          style={{
            background: "rgba(255,255,255,0.9)",
            padding: "20px",
            borderRadius: "8px",
            color: "#000",
          }}
        >
          <h3 style={{ marginTop: 0, marginBottom: "15px" }}>
            {editingId ? "글 수정하기" : "새 글 작성하기"}
          </h3>
          <input
            type="text"
            placeholder="제목을 입력하세요"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            style={{
              width: "100%",
              padding: "12px",
              marginBottom: "10px",
              background: "#fff",
              border: "1px solid #ccc",
              color: "#000",
              fontSize: "1.1rem",
              fontWeight: "bold",
            }}
          />

          <div
            style={{
              background: "#fff",
              marginBottom: "50px",
              height: "400px",
            }}
          >
            <ReactQuill
              ref={quillRef}
              theme="snow"
              value={form.content}
              onChange={(val) => setForm({ ...form, content: val })}
              modules={modules}
              style={{ height: "350px", color: "#000" }}
              placeholder="내용을 작성하세요."
            />
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "10px",
              marginTop: "10px",
            }}
          >
            <button
              onClick={() => {
                setForm({ title: "", content: "" });
                setEditingId(null);
                setView("LIST");
              }}
              style={{
                padding: "10px 20px",
                background: "#666",
                border: "none",
                color: "#fff",
                cursor: "pointer",
                borderRadius: "4px",
              }}
            >
              취소
            </button>
            <button
              onClick={handleWriteSubmit}
              style={{
                padding: "10px 20px",
                background: "var(--text-gold)",
                border: "none",
                color: "#000",
                fontWeight: "bold",
                cursor: "pointer",
                borderRadius: "4px",
              }}
            >
              {editingId ? "수정 완료" : "등록 완료"}
            </button>
          </div>
        </div>
      )}

      {/* 3. 상세 보기 화면 */}
      {view === "DETAIL" && currentPost && (
        <div className="post-detail">
          <div
            style={{
              borderBottom: "1px solid #444",
              paddingBottom: "15px",
              marginBottom: "20px",
            }}
          >
            <h1 style={{ fontSize: "1.5rem", marginBottom: "10px" }}>
              {currentPost.title}
            </h1>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                color: "#888",
                fontSize: "0.9rem",
              }}
            >
              <div>
                <span>
                  작성자:{" "}
                  <span style={{ color: "#fff" }}>{currentPost.nickname}</span>
                </span>
                <span style={{ marginLeft: "10px" }}>
                  {formatDate(currentPost.created_at)}
                </span>
              </div>

              {/* ★ [수정/삭제 버튼 영역] */}
              {session && session.user.id === currentPost.user_id && (
                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    onClick={handleEditClick}
                    style={{
                      background: "#555",
                      border: "none",
                      color: "#fff",
                      padding: "5px 10px",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontSize: "0.8rem",
                    }}
                  >
                    수정
                  </button>
                  <button
                    onClick={handleDelete}
                    style={{
                      background: "#ff5a6a",
                      border: "none",
                      color: "#fff",
                      padding: "5px 10px",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontSize: "0.8rem",
                    }}
                  >
                    삭제
                  </button>
                </div>
              )}
            </div>
          </div>

          <div
            className="ql-editor"
            style={{
              minHeight: "200px",
              color: "#eee",
              marginBottom: "40px",
              lineHeight: "1.6",
              padding: 0,
            }}
            dangerouslySetInnerHTML={{ __html: currentPost.content }}
          ></div>

          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "20px",
              marginBottom: "40px",
            }}
          >
            <button
              onClick={() => handleVote("like")}
              style={{
                padding: "10px 20px",
                borderRadius: "20px",
                border:
                  votes.myVote === "like"
                    ? "1px solid #ff5a6a"
                    : "1px solid #444",
                background:
                  votes.myVote === "like"
                    ? "rgba(255, 90, 106, 0.1)"
                    : "transparent",
                color: votes.myVote === "like" ? "#ff5a6a" : "#ccc",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "5px",
              }}
            >
              👍 좋아요 {votes.likes}
            </button>
            <button
              onClick={() => handleVote("dislike")}
              style={{
                padding: "10px 20px",
                borderRadius: "20px",
                border:
                  votes.myVote === "dislike"
                    ? "1px solid #aaa"
                    : "1px solid #444",
                background:
                  votes.myVote === "dislike"
                    ? "rgba(255,255,255,0.1)"
                    : "transparent",
                color: votes.myVote === "dislike" ? "#fff" : "#888",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "5px",
              }}
            >
              👎 별로예요 {votes.dislikes}
            </button>
          </div>

          <div
            className="comments-section"
            style={{
              background: "rgba(0,0,0,0.2)",
              padding: "20px",
              borderRadius: "8px",
            }}
          >
            <h3
              style={{
                borderBottom: "1px solid #444",
                paddingBottom: "10px",
                marginTop: 0,
              }}
            >
              댓글 {comments.length}
            </h3>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "15px",
                marginBottom: "20px",
              }}
            >
              {comments.map((comment) => (
                <div
                  key={comment.id}
                  style={{
                    borderBottom: "1px solid #333",
                    paddingBottom: "10px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: "5px",
                    }}
                  >
                    <span style={{ fontWeight: "bold", fontSize: "0.9rem" }}>
                      {comment.nickname}
                    </span>
                    <span style={{ fontSize: "0.75rem", color: "#666" }}>
                      {formatDate(comment.created_at)}
                    </span>
                  </div>
                  <div style={{ color: "#ccc", fontSize: "0.95rem" }}>
                    {comment.content}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              <input
                type="text"
                placeholder={
                  session ? "댓글을 입력하세요..." : "로그인이 필요합니다."
                }
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleCommentSubmit()}
                disabled={!session}
                style={{
                  flex: 1,
                  padding: "10px",
                  borderRadius: "4px",
                  border: "1px solid #444",
                  background: "#222",
                  color: "#fff",
                }}
              />
              <button
                onClick={handleCommentSubmit}
                disabled={!session}
                style={{
                  padding: "0 20px",
                  background: "#555",
                  border: "none",
                  color: "#fff",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                등록
              </button>
            </div>
          </div>
          <div style={{ marginTop: "20px", textAlign: "right" }}>
            <button
              onClick={() => setView("LIST")}
              style={{
                background: "none",
                border: "1px solid #555",
                color: "#888",
                padding: "8px 15px",
                cursor: "pointer",
              }}
            >
              목록으로 돌아가기
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BoardPage;
