// src/utils/urlHelper.js

// 현재 URL의 쿼리 파라미터(?menu=BOARD)를 객체로 가져오기
export const getQueryParams = () => {
  const params = new URLSearchParams(window.location.search);
  return Object.fromEntries(params.entries()); // { menu: "BOARD", id: "1" } 형태로 반환
};

// URL 업데이트 (새로고침 없이 주소만 변경)
export const updateURL = (newParams) => {
  const url = new URL(window.location);

  Object.keys(newParams).forEach((key) => {
    if (newParams[key] === null || newParams[key] === undefined) {
      url.searchParams.delete(key); // 값이 null이면 파라미터 삭제
    } else {
      url.searchParams.set(key, newParams[key]); // 값 설정
    }
  });

  // 브라우저 히스토리에 기록 (뒤로가기 가능)
  window.history.pushState({}, "", url);
};
