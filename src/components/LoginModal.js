// src/components/LoginModal.js
import React from "react";
import { supabase } from "../utils/supabaseClient";
import "../App.css"; // 스타일 파일 (아래에서 추가할 예정)

const LoginModal = ({ onClose }) => {
  // 로그인 처리 함수
  const handleLogin = async (provider) => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: provider,
        options: {
          redirectTo: window.location.origin, // 현재 도메인(modamcalc.com)으로 돌아오기
        },
      });
      if (error) throw error;
    } catch (error) {
      alert("로그인 중 오류가 발생했습니다: " + error.message);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose}>
          &times;
        </button>

        <h2>로그인</h2>
        <p>로그인 방식을 선택해주세요.</p>

        <div className="login-buttons">
          {/* 카카오 로그인 버튼 */}
          <button
            className="login-btn kakao"
            onClick={() => handleLogin("kakao")}
          >
            <img
              src="https://developers.kakao.com/assets/img/about/logos/kakaolink/kakaolink_btn_small.png"
              alt="kakao"
            />
            카카오 로그인
          </button>

          {/* 구글 로그인 버튼 */}
          <button
            className="login-btn google"
            onClick={() => handleLogin("google")}
          >
            <img
              src="https://upload.wikimedia.org/wikipedia/commons/5/53/Google_%22G%22_Logo.svg"
              alt="google"
            />
            Google 로그인
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginModal;
