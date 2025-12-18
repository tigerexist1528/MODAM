import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

const rootElement = document.getElementById("root");
const root = ReactDOM.createRoot(rootElement);

root.render(
  // <React.StrictMode>  <-- 이 태그가 없어야 합니다!!
  <App />
  // </React.StrictMode>
);
