import React, { useState, useEffect, useMemo, useRef } from "react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { supabase } from "../utils/supabaseClient";
import "../styles.css";

// 관리자 ID (본인 UUID 확인 필수)
const ADMIN_ID = "2f9ff0d3-4b34-42dd-9be6-ba4fea6aa3ff";

const FaqModal = ({ onClose, session }) => {
  const [view, setView] = useState("LIST"); // LIST, DETAIL, WRITE
  const [faqs, setFaqs] = useState([]);
  const [currentFaq, setCurrentFaq] = useState(null);
  const [keyword, setKeyword] = useState("");

  // 글쓰기 폼 상태
  const [form, setForm] = useState({ title: "", content: "" });
  const [editingId, setEditingId] = useState(null);
  const quillRef = useRef(null);

  // 1. FAQ 목록 불러오기
  useEffect(() => {
    fetchFaqs();
  }, []);

  const fetchFaqs = async (searchKeyword = "") => {
    try {
      let query = supabase
        .from("faqs")
        .select("*")
        .order("created_at", { ascending: false });

      if (searchKeyword) {
        query = query.ilike("title", `%${searchKeyword}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      setFaqs(data || []);
    } catch (e) {
      console.error(e);
    }
  };

  // 2. 관리자 글쓰기/수정 저장
  const handleSave = async () => {
    if (!form.title.trim() || !form.content.trim())
      return alert("내용을 입력하세요.");

    try {
      if (editingId) {
        // 수정
        await supabase
          .from("faqs")
          .update({ ...form, updated_at: new Date() })
          .eq("id", editingId);
        alert("수정되었습니다.");
      } else {
        // 등록
        await supabase.from("faqs").insert([form]);
        alert("등록되었습니다.");
      }
      setForm({ title: "", content: "" });
      setEditingId(null);
      fetchFaqs();
      setView("LIST");
    } catch (e) {
      alert("저장 실패: " + e.message);
    }
  };

  // 3. 삭제
  const handleDelete = async (id) => {
    if (!window.confirm("삭제하시겠습니까?")) return;
    await supabase.from("faqs").delete().eq("id", id);
    alert("삭제되었습니다.");
    if (view === "DETAIL") setView("LIST");
    fetchFaqs();
  };

  // 4. 이미지 핸들러 (BoardPage와 동일)
  const imageHandler = () => {
    const input = document.createElement("input");
    input.setAttribute("type", "file");
    input.setAttribute("accept", "image/*");
    input.click();
    input.onchange = async () => {
      const file = input.files[0];
      if (!file) return;
      const fileName = `faq_${Date.now()}_${Math.random()
        .toString(36)
        .substring(2)}`;
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
          [{ header: [1, 2, false] }],
          ["bold", "italic", "underline"],
          [{ color: [] }, { background: [] }],
          ["link", "image"],
        ],
        handlers: { image: imageHandler },
      },
    }),
    []
  );

  return (
    <div className="modal-overlay">
      <div
        className="modal-content"
        style={{
          maxWidth: "800px",
          width: "90%",
          height: "80vh",
          display: "flex",
          flexDirection: "column",
          padding: "0",
        }}
      >
        {/* 헤더 */}
        <div
          style={{
            padding: "20px",
            borderBottom: "1px solid #333",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "#1a1a1a",
            borderTopLeftRadius: "12px",
            borderTopRightRadius: "12px",
          }}
        >
          <h2 style={{ margin: 0, color: "#fff" }}>❓ 자주 묻는 질문 (FAQ)</h2>
          <button
            className="close-btn"
            onClick={onClose}
            style={{ position: "static" }}
          >
            &times;
          </button>
        </div>

        {/* 바디 */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "20px",
            background: "#111",
            textAlign: "left",
          }}
        >
          {/* A. 목록 화면 */}
          {view === "LIST" && (
            <>
              <div className="search-bar-area">
                <input
                  className="search-input"
                  placeholder="궁금한 내용을 검색해보세요."
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && fetchFaqs(keyword)}
                />
                <button
                  className="search-btn"
                  onClick={() => fetchFaqs(keyword)}
                >
                  검색
                </button>
              </div>

              {/* 관리자 글쓰기 버튼 */}
              {session && session.user.id === ADMIN_ID && (
                <div style={{ textAlign: "right", marginBottom: "15px" }}>
                  <button
                    className="btn-gold"
                    onClick={() => {
                      setForm({ title: "", content: "" });
                      setView("WRITE");
                    }}
                  >
                    + 질문 등록
                  </button>
                </div>
              )}

              <div className="faq-list">
                {faqs.map((faq) => (
                  <div
                    key={faq.id}
                    className="faq-item"
                    onClick={() => {
                      setCurrentFaq(faq);
                      setView("DETAIL");
                    }}
                  >
                    <span className="faq-q-mark">Q.</span>
                    <span className="faq-title">{faq.title}</span>
                    <span style={{ fontSize: "20px", color: "#666" }}>›</span>
                  </div>
                ))}
                {faqs.length === 0 && (
                  <p
                    style={{
                      textAlign: "center",
                      color: "#666",
                      marginTop: "50px",
                    }}
                  >
                    등록된 질문이 없습니다.
                  </p>
                )}
              </div>
            </>
          )}

          {/* B. 상세 화면 */}
          {view === "DETAIL" && currentFaq && (
            <div style={{ color: "#eee" }}>
              <button
                className="btn-dark"
                onClick={() => setView("LIST")}
                style={{ marginBottom: "20px" }}
              >
                ← 목록으로
              </button>

              <div
                style={{
                  borderBottom: "1px solid #333",
                  paddingBottom: "15px",
                  marginBottom: "20px",
                }}
              >
                <h2
                  style={{
                    fontSize: "1.4rem",
                    color: "#ffcc00",
                    marginBottom: "10px",
                  }}
                >
                  Q. {currentFaq.title}
                </h2>
                {session && session.user.id === ADMIN_ID && (
                  <div style={{ marginTop: "10px" }}>
                    <button
                      className="btn-dark"
                      style={{ marginRight: "10px" }}
                      onClick={() => {
                        setForm(currentFaq);
                        setEditingId(currentFaq.id);
                        setView("WRITE");
                      }}
                    >
                      수정
                    </button>
                    <button
                      className="btn-reset"
                      style={{ padding: "8px 16px" }}
                      onClick={() => handleDelete(currentFaq.id)}
                    >
                      삭제
                    </button>
                  </div>
                )}
              </div>

              <div
                className="ql-editor"
                dangerouslySetInnerHTML={{ __html: currentFaq.content }}
                style={{ lineHeight: "1.6" }}
              ></div>
            </div>
          )}

          {/* C. 글쓰기 화면 (관리자 전용) */}
          {view === "WRITE" && (
            <div
              className="write-container"
              style={{ border: "none", padding: "0" }}
            >
              <input
                className="write-input"
                placeholder="질문 제목을 입력하세요 (예: 비밀번호는 어떻게 찾나요?)"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
              <div
                style={{
                  background: "#fff",
                  height: "400px",
                  borderRadius: "4px",
                  marginBottom: "50px",
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
                  textAlign: "center",
                  gap: "10px",
                  display: "flex",
                  justifyContent: "center",
                }}
              >
                <button className="btn-dark" onClick={() => setView("LIST")}>
                  취소
                </button>
                <button className="btn-gold" onClick={handleSave}>
                  등록 완료
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FaqModal;
