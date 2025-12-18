import React from "react";

/**
 * 텍스트 포맷터 컴포넌트
 * 예: "3레어5상급 [공격속도]" ->
 * 3레어5상급
 * [공격속도] (회색, 작게)
 */
const TextFormatter = ({ text }) => {
  if (!text) return null;

  const parts = text.split("[");

  // '[' 가 없는 일반 텍스트면 그냥 출력
  if (parts.length === 1) return <>{text}</>;

  return (
    <>
      {parts[0]}
      <br />
      <span style={{ fontSize: "0.85em", color: "#aaa" }}>[{parts[1]}</span>
    </>
  );
};

export default TextFormatter;
