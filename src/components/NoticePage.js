import React, { useEffect, useState, useMemo, useRef } from "react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { supabase } from "../utils/supabaseClient";

const NoticePage = ({ setActivePage }) => {
  const [view, setView] = useState("LIST"); // LIST, WRITE, DETAIL
  const [notices, setNotices] = useState([]);
  const [currentNotice, setCurrentNotice] = useState(null);

  const [isAdmin, setIsAdmin] = useState(false);
  const [session, setSession] = useState(null);
  const quillRef = useRef(null);

  // ★ [필수] 파트너님의 UUID를 입력하세요!
  const ADMIN_ID = "2f9ff0d3-4b34-42dd-9be6-ba4fea6aa3ff";

  // 입력 폼
  const [form, setForm] = useState({ title: "", content: "" });
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    checkAdmin();
    fetchNotices();
  }, []);

  // 관리자 권한 확인
  const checkAdmin = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    setSession(session);
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

  const fetchNoticeDetail = async (notice) => {
    setCurrentNotice(notice);
    setView("DETAIL");
  };

  // --- 글쓰기/수정 핸들러 (관리자 전용) ---
  const handleWriteSubmit = async () => {
    if (!isAdmin) return alert("관리자만 작성할 수 있습니다.");
    if (!form.title || !form.content)
      return alert("제목과 내용을 입력해주세요.");

    // 내용 비었는지 체크
    const textOnly = form.content.replace(/<[^>]*>?/gm, "").trim();
    if (!textOnly && !form.content.includes("<img"))
      return alert("내용을 입력해주세요.");

    if (editingId) {
      // [수정]
      const { error } = await supabase
        .from("notices")
        .update({ title: form.title, content: form.content })
        .eq("id", editingId);

      if (error) alert("수정 실패: " + error.message);
      else {
        alert("수정되었습니다.");
        resetForm();
      }
    } else {
      // [작성]
      const { error } = await supabase.from("notices").insert([
        {
          title: form.title,
          content: form.content,
        },
      ]);

      if (error) alert("작성 실패: " + error.message);
      else {
        alert("등록되었습니다.");
        resetForm();
      }
    }
  };

  const resetForm = () => {
    setForm({ title: "", content: "" });
    setEditingId(null);
    fetchNotices();
    setView("LIST");
  };

  const handleEditClick = () => {
    setForm({ title: currentNotice.title, content: currentNotice.content });
    setEditingId(currentNotice.id);
    setView("WRITE");
  };

  const handleDelete = async () => {
    if (!window.confirm("정말 삭제하시겠습니까?")) return;
    const { error } = await supabase
      .from("notices")
      .delete()
      .eq("id", currentNotice.id);
    if (!error) {
      alert("삭제되었습니다.");
      resetForm();
    } else {
      alert("삭제 실패");
    }
  };

  // --- 이미지 핸들러 (공용 스토리지 사용) ---
  const imageHandler = () => {
    const input = document.createElement("input");
    input.setAttribute("type", "file");
    input.setAttribute("accept", "image/*");
    input.click();

    input.onchange = async () => {
      const file = input.files[0];
      if (!file) return;

      const fileExt = file.name.split(".").pop();
      const fileName = `notice_${Date.now()}_${Math.random()
        .toString(36)
        .substring(2)}.${fileExt}`;
      const filePath = `${fileName}`;

      // 기존 board_images 버킷을 같이 사용해도 무방합니다.
      const { error: uploadError } = await supabase.storage
        .from("board_images")
        .upload(filePath, file);

      if (uploadError) return alert("이미지 업로드 실패!");

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
      className="notice-page-container"
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
          📢 공지사항
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

          {/* 관리자에게만 글쓰기 버튼 보임 */}
          {view === "LIST" && isAdmin && (
            <button
              onClick={() => {
                setForm({ title: "", content: "" });
                setEditingId(null);
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
              공지 작성
            </button>
          )}
        </div>
      </div>

      {/* 1. 목록 화면 */}
      {view === "LIST" && (
        <div className="notice-list">
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
                <th style={{ padding: "10px", width: "100px" }}>날짜</th>
              </tr>
            </thead>
            <tbody>
              {notices.map((notice) => (
                <tr
                  key={notice.id}
                  onClick={() => fetchNoticeDetail(notice)}
                  style={{
                    borderBottom: "1px solid #333",
                    cursor: "pointer",
                    transition: "0.2s",
                  }}
                  className="hover-row"
                >
                  <td style={{ padding: "12px 10px" }}>
                    {/* 중요 공지(Patch 등) 태그 처리 로직 */}
                    {notice.title.includes("Patch") ||
                    notice.title.includes("패치") ? (
                      <span style={{ color: "#ff5a6a", marginRight: "5px" }}>
                        [패치]
                      </span>
                    ) : null}
                    {notice.title.replace(/\[.*?\]/g, "")}
                    {notice.content.includes("<img") && (
                      <span style={{ fontSize: "0.8rem", marginLeft: "5px" }}>
                        📷
                      </span>
                    )}
                  </td>
                  <td
                    style={{
                      textAlign: "center",
                      color: "#666",
                      fontSize: "0.8rem",
                    }}
                  >
                    {formatDate(notice.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {notices.length === 0 && (
            <div
              style={{ padding: "40px", textAlign: "center", color: "#666" }}
            >
              등록된 공지사항이 없습니다.
            </div>
          )}
        </div>
      )}

      {/* 2. 글쓰기 화면 (관리자용) */}
      {view === "WRITE" && isAdmin && (
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
            {editingId ? "공지 수정" : "새 공지 작성"}
          </h3>
          <input
            type="text"
            placeholder="제목 (예: [Patch] 신규 업데이트)"
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
              onClick={resetForm}
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
              등록 완료
            </button>
          </div>
        </div>
      )}

      {/* 3. 상세 보기 화면 */}
      {view === "DETAIL" && currentNotice && (
        <div className="notice-detail">
          <div
            style={{
              borderBottom: "1px solid #444",
              paddingBottom: "15px",
              marginBottom: "20px",
            }}
          >
            <h1 style={{ fontSize: "1.5rem", marginBottom: "10px" }}>
              {currentNotice.title}
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
              <span>{formatDate(currentNotice.created_at)}</span>
              {isAdmin && (
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
            dangerouslySetInnerHTML={{ __html: currentNotice.content }}
          ></div>

          <div style={{ textAlign: "right" }}>
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

export default NoticePage;
