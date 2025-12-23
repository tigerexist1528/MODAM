import React from "react";
import { PLACEHOLDER_IMG } from "../utils/data";

const SkillAnalysisPage = ({
  analysisData,
  analysisSubTab,
  setAnalysisSubTab,
}) => {
  let dataList = [];
  let totalDmgDisplay = 0;
  let isShareVisible = false;

  if (analysisSubTab === "MY_TREE") {
    dataList = analysisData.myTree;
    totalDmgDisplay = analysisData.totalDmg;
    isShareVisible = true;
  } else if (analysisSubTab === "NUGOL") {
    dataList = analysisData.nugol;
    totalDmgDisplay = analysisData.nugolTotalDmg;
    isShareVisible = true;
  } else {
    dataList = analysisData.potential;
    isShareVisible = false;
  }

  return (
    <div
      className="analysis-page-container"
      style={{ padding: "20px", maxWidth: "1200px", margin: "0 auto" }}
    >
      {/* LNB (Sub Tab) */}
      <div
        className="lnb-bar"
        style={{
          display: "flex",
          gap: "20px",
          marginBottom: "20px",
          borderBottom: "1px solid #444",
          paddingBottom: "10px",
        }}
      >
        <button
          className={`lnb-item ${analysisSubTab === "MY_TREE" ? "active" : ""}`}
          onClick={() => setAnalysisSubTab("MY_TREE")}
          style={{
            background: "none",
            border: "none",
            color: analysisSubTab === "MY_TREE" ? "var(--text-gold)" : "#888",
            fontSize: "1.1rem",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          이론상 1분딜
        </button>
        <button
          className={`lnb-item ${analysisSubTab === "NUGOL" ? "active" : ""}`}
          onClick={() => setAnalysisSubTab("NUGOL")}
          style={{
            background: "none",
            border: "none",
            color: analysisSubTab === "NUGOL" ? "var(--text-gold)" : "#888",
            fontSize: "1.1rem",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          누골 1분 (실전)
        </button>
        <button
          className={`lnb-item ${
            analysisSubTab === "POTENTIAL" ? "active" : ""
          }`}
          onClick={() => setAnalysisSubTab("POTENTIAL")}
          style={{
            background: "none",
            border: "none",
            color: analysisSubTab === "POTENTIAL" ? "var(--text-gold)" : "#888",
            fontSize: "1.1rem",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          전체 스킬 계수표
        </button>
      </div>

      {/* Total Summary */}
      {(analysisSubTab === "MY_TREE" || analysisSubTab === "NUGOL") && (
        <div
          className="analysis-summary"
          style={{
            background: "rgba(0,0,0,0.3)",
            padding: "15px",
            borderRadius: "8px",
            marginBottom: "20px",
            border: "1px solid #444",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: "1.2rem", fontWeight: "bold" }}>
              {analysisSubTab === "NUGOL"
                ? "Top 18 스킬 합산 데미지"
                : "총 데미지 합계"}
            </span>
            {analysisSubTab === "NUGOL" && (
              <span style={{ fontSize: "0.8rem", color: "#888" }}>
                * 스킬 슬롯 제한을 고려하여 상위 18개 스킬만 합산합니다.
              </span>
            )}
          </div>
          <span
            style={{
              fontSize: "1.5rem",
              fontWeight: "bold",
              color: "var(--grade-exceed)",
            }}
          >
            {totalDmgDisplay.toLocaleString()}
          </span>
        </div>
      )}

      {/* Data Table */}
      <div className="data-table-wrapper" style={{ overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "0.9rem",
          }}
        >
          <thead>
            <tr
              style={{
                borderBottom: "2px solid #555",
                color: "#aaa",
                textAlign: "left",
              }}
            >
              <th style={{ padding: "10px" }}>스킬</th>
              <th style={{ padding: "10px", textAlign: "right" }}>
                1분 데미지
              </th>
              <th style={{ padding: "10px", textAlign: "center" }}>
                사용 횟수
              </th>
              {isShareVisible && (
                <th style={{ padding: "10px", textAlign: "right" }}>점유율</th>
              )}
            </tr>
          </thead>
          <tbody>
            {dataList.map((row, idx) => {
              const isDimmed = row.isExcluded;
              const rowStyle = {
                borderBottom: "1px solid #333",
                background:
                  idx % 2 === 0 ? "rgba(255,255,255,0.02)" : "transparent",
                opacity: isDimmed ? 0.4 : 1,
              };

              return (
                <tr key={idx} style={rowStyle}>
                  <td
                    style={{
                      padding: "10px",
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                    }}
                  >
                    <div
                      style={{
                        width: "32px",
                        height: "32px",
                        background: "#000",
                        borderRadius: "4px",
                        overflow: "hidden",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        border: "1px solid #444",
                      }}
                    >
                      {row.isStatus ? (
                        <span style={{ fontSize: "0.7rem", color: "#ff77ff" }}>
                          DoT
                        </span>
                      ) : (
                        <img
                          src={row.icon}
                          alt=""
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
                          onError={(e) => (e.target.src = PLACEHOLDER_IMG)}
                        />
                      )}
                    </div>
                    <span
                      style={{
                        color: row.isStatus ? "#ff77ff" : "#ddd",
                        fontWeight: row.isStatus ? "bold" : "normal",
                      }}
                    >
                      {row.name}{" "}
                      {isDimmed && (
                        <span style={{ fontSize: "0.7rem", color: "#888" }}>
                          (미사용)
                        </span>
                      )}
                    </span>
                  </td>
                  <td
                    style={{
                      padding: "10px",
                      textAlign: "right",
                      color: isDimmed ? "#888" : "var(--text-gold)",
                      fontWeight: "bold",
                    }}
                  >
                    {row.damage.toLocaleString()}
                  </td>
                  <td
                    style={{
                      padding: "10px",
                      textAlign: "center",
                      color: "#ccc",
                    }}
                  >
                    {row.count}
                  </td>
                  {isShareVisible && (
                    <td style={{ padding: "10px", textAlign: "right" }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "flex-end",
                          gap: "8px",
                        }}
                      >
                        <span style={{ width: "45px" }}>
                          {row.share.toFixed(1)}%
                        </span>
                        <div
                          style={{
                            width: "60px",
                            height: "6px",
                            background: "#333",
                            borderRadius: "3px",
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              width: `${row.share}%`,
                              height: "100%",
                              background: isDimmed
                                ? "#555"
                                : "var(--grade-unique)",
                            }}
                          ></div>
                        </div>
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SkillAnalysisPage;
