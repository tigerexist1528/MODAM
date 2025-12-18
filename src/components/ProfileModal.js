// src/components/ProfileModal.js
import React, { useState, useEffect } from "react";
import { supabase } from "../utils/supabaseClient";
import "../styles.css";

const ProfileModal = ({ session, onClose, isFirstTime }) => {
  const [nickname, setNickname] = useState("");
  const [loading, setLoading] = useState(false);
  const [daysLeft, setDaysLeft] = useState(0); // 변경 가능까지 남은 일수

  useEffect(() => {
    fetchProfile();
  }, [session]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      if (data) {
        setNickname(data.nickname);
        checkChangeable(data.last_nickname_change);
      }
    } catch (error) {
      // 프로필이 없는 경우(최초)는 무시
    }
  };

  // 30일 제한 체크 로직
  const checkChangeable = (lastChangeDate) => {
    if (!lastChangeDate) return;
    const last = new Date(lastChangeDate);
    const now = new Date();
    const diffTime = Math.abs(now - last);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 30) {
      setDaysLeft(30 - diffDays);
    }
  };

  const handleSave = async () => {
    if (!nickname.trim()) return alert("닉네임을 입력해주세요!");

    // 30일 제한 걸리면 차단 (최초 설정일 땐 통과)
    if (!isFirstTime && daysLeft > 0) {
      return alert(
        `닉네임은 30일에 한 번만 변경 가능합니다.\n${daysLeft}일 뒤에 시도해주세요.`
      );
    }

    setLoading(true);
    const updates = {
      id: session.user.id,
      nickname: nickname,
      updated_at: new Date(),
      // 닉네임 바꿀 때만 날짜 갱신
      last_nickname_change: new Date(),
    };

    const { error } = await supabase.from("profiles").upsert(updates);

    if (error) {
      alert("이미 사용 중인 닉네임이거나 오류가 발생했습니다.");
    } else {
      alert(isFirstTime ? "환영합니다!" : "프로필이 수정되었습니다.");
      onClose(); // 저장 후 닫기
      window.location.reload(); // 정보 갱신을 위해 새로고침
    }
    setLoading(false);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>{isFirstTime ? "닉네임 설정" : "내 정보 수정"}</h2>
        <p style={{ color: "#aaa", fontSize: "14px" }}>
          {isFirstTime
            ? "커뮤니티에서 사용할 닉네임을 정해주세요."
            : "닉네임 변경은 30일에 1회만 가능합니다."}
        </p>

        <div style={{ margin: "20px 0" }}>
          <label
            style={{ display: "block", marginBottom: "8px", color: "#fff" }}
          >
            닉네임
          </label>
          <input
            type="text"
            className="nickname-input"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="한글/영문/숫자 (최대 8자)"
            maxLength={8}
          />
          {!isFirstTime && daysLeft > 0 && (
            <p style={{ color: "#ff6b6b", fontSize: "12px", marginTop: "5px" }}>
              ⚠ 다음 변경까지 {daysLeft}일 남음
            </p>
          )}
        </div>

        <button
          className="modal-confirm-btn"
          onClick={handleSave}
          disabled={loading}
        >
          {loading ? "저장 중..." : "저장하기"}
        </button>

        {/* 최초 설정이 아닐 때만 닫기 버튼 표시 (최초일 땐 강제로 설정해야 함) */}
        {!isFirstTime && (
          <button
            className="close-btn"
            onClick={onClose}
            style={{ top: "15px", right: "15px" }}
          >
            &times;
          </button>
        )}
      </div>
    </div>
  );
};

export default ProfileModal;
