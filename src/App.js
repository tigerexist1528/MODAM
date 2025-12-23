import React, { useState, useEffect } from "react";
import { supabase } from "./utils/supabaseClient";
import "./styles.css";

// =============================================================================
// [1] Import Session
// =============================================================================
// data.js에서 필요한 데이터들을 가져옵니다.
import { updateURL } from "./utils/urlHelper";
import { applyJobMechanics } from "./utils/JobMechanics";

import {
  // 1. 핵심 아이템 DB
  loadGameData,
  WEAPON_DB,
  GEAR_DB,

  // 2. 내실/강화 데이터
  SKILL_DB,
  REINFORCE_DB,
  POLISH_DB,
  MAGIC_OPTS_BY_GROUP,
  ENCHANT_LIST_BY_SLOT,
  EMBLEM_DB,
  TRAINING_DB,
  AVATAR_DB,
  WEAPON_AVATAR_DB,
  SKILL_RUNE_DB,
  GEAR_POINT_BONUS_DB,
} from "./data";

// utils/data에서 필요한 데이터를 가져옵니다.
import {
  IMAGE_BASE_URL,
  PLACEHOLDER_IMG,
  SLOT_ENG_NAMES,
  GET_ITEM_ICON_LOCAL,
  GET_JOB_ICON,
  getGradeColor,
  getOptionTierClass,
  getSetOptionSummary,
  getAvatarSummary,
  getGroupedItems,
  getSpecialSets,
  STAT_KOR_MAP,
  formatStatsToKor,
  getPrefixIconUrl,
  getMergedSealText,
  //
  EQUIP_SLOTS,
  EXCEED_SLOTS,
  SPECIAL_SLOTS,
  JOB_STRUCTURE,
  WEAPON_TYPES,
  EMBLEM_RULES,
  initialState,
} from "./utils/data";

// components에서 필요한 데이터를 가져옵니다.
import Home from "./components/Home";
import LoginModal from "./components/LoginModal";
import ProfileModal from "./components/ProfileModal";
import MessageModal from "./components/MessageModal";
import BoardPage from "./components/BoardPage";
import FaqModal from "./components/FaqModal";
import PresetBar from "./components/PresetBar";
import SkillAnalysisPage from "./components/SkillAnalysisPage";
import { ItemCard } from "./components/ItemCard";
import GearSlotCard from "./components/GearSlotCard";
import RichTooltip from "./components/RichTooltip";
import { StatSlider } from "./components/StatSlider";
import { StatRowWithSource } from "./components/StatRowWithSource";
import SystemModal from "./components/SystemModal";
import BottomStatPanel from "./components/BottomStatPanel";
import TextFormatter from "./components/common/TextFormatter";
// modal
import ItemPickerSheet from "./components/modals/ItemPickerSheet";
import InnerModalManager from "./components/modals/InnerModalManager";
// hooks
import { useImagePreloader } from "./hooks/useImagePreloader";
import { useTooltipControl } from "./hooks/useTooltipControl";
import { usePresetManager } from "./hooks/usePresetManager";
import { useUrlNavigation } from "./hooks/useUrlNavigation";
// minigame
import PolishingGame from "./components/MiniGame/PolishingGame";

// =============================================================================
// [2] Main Component: App
// =============================================================================
export default function App() {
  // --- State Declarations ---
  // 1. 로딩 상태 추가
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  // 2. 앱 시작 시 데이터 불러오기
  useEffect(() => {
    const init = async () => {
      const success = await loadGameData();
      if (success) {
        setIsDataLoaded(true); // 데이터 준비 끝! 렌더링 시작
      }
    };
    init();
  }, []);

  useEffect(() => {
    const fetchUniqueEffects = async () => {
      try {
        // 'uniqueeffect' 테이블에서 모든 데이터('*') 가져오기
        const { data, error } = await supabase.from("uniqueeffect").select("*");

        if (error) throw error;

        if (data) {
          // 가져온 데이터를 아까 만든 state 그릇에 담기
          setUniqueEffectDb(data);
        }
      } catch (error) {
        console.error("고유 효과 데이터 로딩 실패:", error);
      }
    };

    fetchUniqueEffects();
  }, []); // 빈 배열([]): 앱 시작 시 한 번만 실행

  const [activePage, setActivePage] = useState("HOME");
  // 페이지 네비게이션 상태 (MAIN: 메인, ANALYSIS: 스킬 분석)
  const [activeTab, setActiveTab] = useState("MAIN");
  // [1] 사용자 스탯 (닉네임 추가됨!)
  const [userStats, setUserStats] = useState(initialState);

  const [isReordering, setIsReordering] = useState(false);
  // ★ [NEW] 적 레벨 상태 (기본값 85로 설정)
  const [enemyLevel, setEnemyLevel] = useState(85);
  const [isEnemyLevelShaking, setIsEnemyLevelShaking] = useState(false);
  // ★ [NEW] 툴팁 상태 추가
  const [tooltipData, setTooltipData] = useState(null); // { item, blacksmith, x, y, visible }
  const [simpleTooltipData, setSimpleTooltipData] = useState(null); // { text, x, y, visible }
  // ★ [NEW] 장비 해제 확인용 모달 상태
  const [unequipTarget, setUnequipTarget] = useState(null); // 슬롯 이름 저장 (예: "무기")
  // UI Control States
  const [activeModal, setActiveModal] = useState({ type: null, slot: null });
  const [searchQuery, setSearchQuery] = useState("");
  const [weaponFilter, setWeaponFilter] = useState("");
  const [specialPickerStep, setSpecialPickerStep] = useState(0);
  const [selectedSpecialSet, setSelectedSpecialSet] = useState(null);
  // [NEW] 대장간 임시 수정용 버퍼 (취소 기능을 위함)
  const [editBuffer, setEditBuffer] = useState({});
  // 스킬 분석용 데이터 저장소
  const [analysisData, setAnalysisData] = useState({
    myTree: [], // 내 스킬트리 기준 (1분 딜)
    potential: [], // 전체 스킬 Max 레벨 기준 (계수표)
    totalDmg: 0, // 내 스킬트리 총합
  });
  const [analysisSubTab, setAnalysisSubTab] = useState("MY_TREE");

  // Result States
  const [statDetailModal, setStatDetailModal] = useState(null);
  const [finalStats, setFinalStats] = useState(initialState.stats || {});

  const [finalDamageInfo, setFinalDamageInfo] = useState({
    normal: 0,
    status: 0,
    total: 0,
  });

  // ★ 수정: 초기값을 { armor: [], ... } 형태의 객체로 지정해야 합니다.
  const [activeSets, setActiveSets] = useState({
    armor: [],
    accessory: [],
    special: [],
  });
  const [totalGearPoint, setTotalGearPoint] = useState(0);
  const [isLevelShaking, setIsLevelShaking] = useState(false);
  const [pendingSkillReset, setPendingSkillReset] = useState(null);
  const [uniqueEffectDb, setUniqueEffectDb] = useState([]);

  // =================================================================================
  // [Auth & Preset System] 인증 및 프리셋 관리 로직
  // =================================================================================
  // 1. 상태 선언 (가장 먼저)
  const [session, setSession] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false); // 프로필 수정창
  const [isFirstTimeSetup, setIsFirstTimeSetup] = useState(false); // 최초 설정 여부
  const { activeMenu, navigateTo } = useUrlNavigation("HOME");
  const [activeBoardTab, setActiveBoardTab] = useState(null);
  const [systemModal, setSystemModal] = useState({
    type: null,
    message: "",
    onConfirm: null,
    data: null,
  });
  const [isFaqOpen, setIsFaqOpen] = useState(false);
  // 2. openAlert 함수 정의
  const openAlert = (msg) => setSystemModal({ type: "ALERT", message: msg });

  // 3. 준비된 재료들을 가지고 프리셋 매니저 훅 호출
  const {
    presetList,
    setPresetList,
    currentPresetId,
    handleNewClick,
    handleShareClick,
    handleSaveClick,
    movePreset,
    handleImportClick,
    handleDeleteClick,
    loadPreset,
    loadSharedPreset,
    fetchPresets, // ★ 여기서도 받아줍니다.
  } = usePresetManager(
    userStats,
    setUserStats,
    session,
    openAlert,
    setSystemModal
  );

  // 4. useEffect (인증 로직 + 프로필 체크)
  useEffect(() => {
    // A. 초기 접속 시 세션 체크
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      fetchPresets(session); // (기존 기능 유지)
      if (session) checkUserProfile(session.user.id); // ★ (추가) 닉네임 확인
    });

    // B. 로그인/로그아웃 상태 변화 감지
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      fetchPresets(session); // (기존 기능 유지)

      if (session) {
        checkUserProfile(session.user.id); // ★ (추가) 로그인하면 닉네임 확인
      } else {
        setUserProfile(null); // ★ (추가) 로그아웃하면 닉네임 비우기
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchPresets]);

  // 4-2. 공유 링크 감지 로직 (독립된 훅으로 분리)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const shareId = params.get("share_id");
    if (shareId) {
      loadSharedPreset(shareId);
    }
  }, [loadSharedPreset]); // 공유 링크 로드 함수가 바뀔 때마다 실행

  const checkUserProfile = async (userId) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle(); // 에러 방지용 maybeSingle()

    if (error && error.code !== "PGRST116") {
      console.error("프로필 확인 에러:", error);
      return;
    }

    if (data) {
      setUserProfile(data);
    } else {
      setIsFirstTimeSetup(true);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    // setPresetList([]); // 필요하시면 유지
    setIsLogoutModalOpen(true);
  };

  // --- Updater Functions ---
  const updateStat = (category, key, value) => {
    setUserStats((prev) => ({
      ...prev,
      [category]: {
        ...prev[category], // 기존 category 데이터 유지 (중요!)
        [key]: value, // 변경된 부분만 덮어쓰기
      },
    }));
  };

  const handleGearUpdate = (slot, newItemId) => {
    setUserStats((prev) => {
      const next = { ...prev };
      const db = slot === "무기" ? WEAPON_DB : GEAR_DB;
      const item = db.find((i) => i.id === Number(newItemId));

      next.equipment[slot] = {
        itemId: Number(newItemId),
        setName: item ? item.setName : "선택 안함",
        grade: item ? item.grade : "일반",
      };
      // 익시드 부위 해제 시 고유옵션 초기화
      if (
        EXCEED_SLOTS.includes(slot) &&
        (!item || !item.grade.includes("익시드"))
      ) {
        next.uniqueEffects[slot] = "선택 안함";
      }
      return next;
    });
  };

  // 1. 이미지 미리 로딩 (한 줄로 끝!)
  useImagePreloader();

  // 2. 툴팁 제어 로직 (state를 넘겨줘야 함)
  useTooltipControl(tooltipData, setTooltipData);

  // -----------------------------------------------------------------
  // [3] Calculation Engine (소스 추적 기능 완벽 통합 Ver)
  // -----------------------------------------------------------------
  useEffect(() => {
    const timer = setTimeout(() => {
      // 1. 초기화
      let nextStats = JSON.parse(JSON.stringify(initialState.stats));

      // ★ [핵심] 스탯 출처 기록용 저장소 초기화
      // 이 변수가 없거나 초기화되지 않으면 내역이 쌓이지 않습니다.
      const statSources = {};

      // 복리 연산 팩터 초기화
      let globalSkillAtkMultiplier = 1.0;
      let totalAllTypeDmgRatio = 1.0;
      let totalFinalDmgRatio = 1.0;
      const specificSkillMultipliers = {};
      const specificSkillIdMultipliers = {}; // (New) ID별 저장소

      // 헬퍼: 스탯 합산 및 출처 기록 (최종 통합 Ver)
      const mergeStats = (sourceStats, sourceName = "기타") => {
        if (!sourceStats) return;

        // 상태이상 Flat Key 목록
        const statusKeys = [
          "poisonDmg",
          "bleedDmg",
          "burnDmg",
          "shockDmg",
          "poisonInc",
          "bleedInc",
          "burnInc",
          "shockInc",
        ];

        Object.keys(sourceStats).forEach((key) => {
          const val = sourceStats[key];
          if (val === null || val === undefined) return;

          // =========================================================
          // 1. 상태이상(Status) 처리 (Flat Key & Object)
          // =========================================================

          // Case A: bleedDmg: 15 처럼 바로 들어온 경우
          if (statusKeys.includes(key)) {
            if (val !== 0) {
              // 값 합산
              if (!nextStats.status[key]) nextStats.status[key] = 0;
              nextStats.status[key] += val;
              // 소스 기록
              if (!statSources[key]) statSources[key] = [];
              statSources[key].push({ source: sourceName, value: val });
            }
            return;
          }

          // Case B: status: { ... } 객체로 들어온 경우
          if (key === "status" && typeof val === "object") {
            Object.entries(val).forEach(([sKey, sVal]) => {
              if (sVal === 0) return;
              if (!nextStats.status[sKey]) nextStats.status[sKey] = 0;
              nextStats.status[sKey] += sVal;

              if (!statSources[sKey]) statSources[sKey] = [];
              statSources[sKey].push({ source: sourceName, value: sVal });
            });
            return;
          }

          // =========================================================
          // 2. 객체형 스탯 (Skill 등) 처리
          // =========================================================
          if (typeof val === "object" && !Array.isArray(val)) {
            if (key === "skill") {
              if (val.dmg) {
                Object.keys(val.dmg).forEach((lvKey) => {
                  const v = val.dmg[lvKey];
                  if (v !== 0) {
                    if (!specificSkillMultipliers[lvKey])
                      specificSkillMultipliers[lvKey] = 1.0;
                    specificSkillMultipliers[lvKey] *= Math.max(0, 1 + v / 100);

                    const recKey = `skill_dmg_${lvKey}`;
                    if (!statSources[recKey]) statSources[recKey] = [];
                    statSources[recKey].push({ source: sourceName, value: v });
                  }
                });
              }
              if (val.idDmg) {
                Object.keys(val.idDmg).forEach((sId) => {
                  const v = val.idDmg[sId];
                  if (v !== 0) {
                    // 저장소 초기화
                    if (!specificSkillIdMultipliers[sId])
                      specificSkillIdMultipliers[sId] = 1.0;

                    // 복리 연산 (1.25 * 1.1 ...)
                    specificSkillIdMultipliers[sId] *= Math.max(0, 1 + v / 100);

                    // 소스 기록 (어디서 올라갔는지 확인용)
                    const recKey = `skill_dmg_id_${sId}`;
                    if (!statSources[recKey]) statSources[recKey] = [];
                    statSources[recKey].push({ source: sourceName, value: v });
                  }
                });
              }
              ["lv", "cdr"].forEach((subKey) => {
                if (val[subKey]) {
                  if (!nextStats.skill[subKey]) nextStats.skill[subKey] = {};
                  Object.keys(val[subKey]).forEach((deepKey) => {
                    nextStats.skill[subKey][deepKey] =
                      (nextStats.skill[subKey][deepKey] || 0) +
                      val[subKey][deepKey];

                    const recKey = `skill_${subKey}_${deepKey}`;
                    if (!statSources[recKey]) statSources[recKey] = [];
                    statSources[recKey].push({
                      source: sourceName,
                      value: val[subKey][deepKey],
                    });
                  });
                }
              });
            } else {
              // 그 외 객체 (elInflict 등)
              if (!nextStats[key]) nextStats[key] = {};
              Object.keys(val).forEach((subKey) => {
                nextStats[key][subKey] =
                  (nextStats[key][subKey] || 0) + val[subKey];

                const recKey = `${key}_${subKey}`;
                if (!statSources[recKey]) statSources[recKey] = [];
                statSources[recKey].push({
                  source: sourceName,
                  value: val[subKey],
                });
              });
            }
            return;
          }

          // =========================================================
          // 3. 숫자형 스탯 (특수 로직 포함)
          // =========================================================
          if (typeof val === "number") {
            if (val === 0) return;

            // ★ [핵심] 무조건 소스부터 기록합니다. (예외 없음)
            // allTypeDmg 등도 여기서 기록되므로 누락되지 않습니다.
            if (!statSources[key]) statSources[key] = [];
            statSources[key].push({ source: sourceName, value: val });

            // ★ [계산] 그 다음, 키에 맞는 계산을 수행합니다.
            if (key === "skillAtkInc") {
              globalSkillAtkMultiplier *= Math.max(0, 1 + val / 100);
            } else if (key === "allTypeDmg") {
              totalAllTypeDmgRatio *= Math.max(0, 1 + val / 100);
            } else if (key === "finalDmg") {
              totalFinalDmgRatio *= Math.max(0, 1 + val / 100);
            } else if (key === "elInflict1" || key === "elInflict2") {
              nextStats[key] = Math.max(nextStats[key], val);
            } else if (key === "allEle") {
              // 모속강은 4속성에 각각 더해줌
              nextStats.fireEle = (nextStats.fireEle || 0) + val;
              nextStats.waterEle = (nextStats.waterEle || 0) + val;
              nextStats.lightEle = (nextStats.lightEle || 0) + val;
              nextStats.darkEle = (nextStats.darkEle || 0) + val;
              // allEle 자체는 위에서 이미 기록됨
            } else {
              // 나머지 일반 스탯 (힘, 물공, 속강 등)은 단순 합산
              if (nextStats[key] === undefined) nextStats[key] = 0;
              nextStats[key] += val;
            }
          }
        });
      };

      // -----------------------------------------------------------------
      // 장비, 세트, 내실 등 모든 스탯 합산
      // -----------------------------------------------------------------

      // 1. 장비 옵션 적용 (Weapon ~ Artifact)
      const setStatusMap = {};

      EQUIP_SLOTS.forEach((slot) => {
        const eq = userStats.equipment[slot];
        if (!eq || eq.itemId === 0) return;

        // DB에서 아이템 정보 찾기
        const db = slot === "무기" ? WEAPON_DB : GEAR_DB;
        const item = db.find((i) => i.id === eq.itemId);

        if (item) {
          // (1) 기본 스탯 병합 (이름 전달)
          // stats 내부에 status 객체가 중첩되어 있어도 mergeStats가 이름을 잘 전달합니다.
          if (item.stats) mergeStats(item.stats, item.name);

          // (2) 별도 status 객체 병합 (이름 전달)
          // 아이템 DB 구조상 status가 따로 빠져있는 경우를 위해 필수입니다.
          if (item.status) mergeStats(item.status, item.name);

          // (3) 성장형 스탯 (statGrowth) 처리
          // 혹시 상태이상 옵션이 성장형(레벨 비례)으로 붙어있는 경우 대비
          if (item.statGrowth) {
            const currentLv = userStats.character.level || 85; // 현재 캐릭터 레벨
            const growthStats = {};
            Object.entries(item.statGrowth).forEach(([k, v]) => {
              growthStats[k] = v * currentLv; // 단순 레벨 비례 예시
            });
            // ★ 성장 스탯도 반드시 이름을 넘겨야 합니다!
            mergeStats(growthStats, item.name);
          }

          // 세트 카운팅 (기존 로직 유지)
          const code = item.stats?.setCode;
          if (code) {
            if (!setStatusMap[code]) {
              let setType = "special";
              if (["머리어깨", "상의", "하의", "벨트", "신발"].includes(slot))
                setType = "armor";
              else if (["팔찌", "목걸이", "반지"].includes(slot))
                setType = "accessory";
              setStatusMap[code] = { total: 0, variants: {}, type: setType };
            }
            setStatusMap[code].total += 1;
            if (item.grade && item.grade.includes(":")) {
              const variant = item.grade.split(":")[1].trim();
              setStatusMap[code].variants[variant] =
                (setStatusMap[code].variants[variant] || 0) + 1;
            }
          }
        }

        // (4) 마법부여 / 엠블렘 등 부가 옵션 (별도 소스명 사용)
        // 만약 여기서 상태이상을 챙긴다면 "마법부여" 등으로 뜰 것입니다.
        if (eq.enchant && eq.enchant !== "선택 안함") {
          // (예시) 실제 구현에 따라 다름
          // mergeStats(enchantStats, "마법부여");
        }
      });

      // 2. 세트 효과
      const nextActiveSets = { armor: [], accessory: [], special: [] };
      const setEffectItems = GEAR_DB.filter(
        (item) => item.slot === "3세트 효과" || item.slot === "5세트 효과"
      );

      Object.keys(setStatusMap).forEach((code) => {
        const status = setStatusMap[code];
        const currentSetItems = setEffectItems.filter(
          (i) => i.stats.setCode == code
        );
        [3, 5].forEach((requiredCount) => {
          const candidates = currentSetItems.filter(
            (i) => i.slot === `${requiredCount}세트 효과`
          );
          if (candidates.length === 0) return;

          let appliedItem = null;
          for (const [variant, count] of Object.entries(status.variants)) {
            if (count >= requiredCount) {
              const variantItem = candidates.find((i) =>
                i.grade.includes(variant)
              );
              if (variantItem) {
                appliedItem = variantItem;
                break;
              }
            }
          }
          if (!appliedItem && status.total >= requiredCount) {
            appliedItem = candidates.find((i) => !i.grade.includes(":"));
          }

          if (appliedItem) {
            // 이름 정제
            let displayName = appliedItem.name;
            let prefix = null;
            if (appliedItem.name.includes(":")) {
              const parts = appliedItem.name.split(":");
              prefix = parts[0].trim();
              displayName = parts[1].trim();
            }
            const cleanName = displayName
              .replace("3세트 효과", "")
              .replace("5세트 효과", "")
              .trim();

            // ★ [적용] 여기서 딱 한 번만 적용합니다! (이름 포함)
            if (appliedItem.stats) mergeStats(appliedItem.stats, cleanName);
            if (appliedItem.status) mergeStats(appliedItem.status, cleanName);

            if (nextActiveSets[status.type]) {
              nextActiveSets[status.type].push({
                name: cleanName,
                prefix: prefix,
                count: requiredCount,
                setCode: code,
              });
            }
          }
        });
      });
      setActiveSets(nextActiveSets);

      // -----------------------------------------------------------------
      // 7. 고유 효과 (Unique Effect) 적용 - 엔진 규격 완벽 호환 Ver
      // -----------------------------------------------------------------
      const { uniqueEffects } = userStats;
      const { subJob } = userStats.character;

      if (uniqueEffects && uniqueEffectDb && uniqueEffectDb.length > 0) {
        // 1. 불필요한 DB 컬럼 제외 목록
        const excludedKeys = [
          "id",
          "created_at",
          "name",
          "type",
          "job",
          "grade",
          "description",
          "image_url",
          "updated_at",
          "slot",
          "option_name",
        ];

        // 2. 뱀 표기법(_a) -> 낙타 표기법(A) 변환기
        const toCamelCase = (str) => {
          return str.replace(/_([a-z0-9])/g, (match, letter) =>
            letter.toUpperCase()
          );
        };

        Object.entries(uniqueEffects).forEach(([slotName, optionName]) => {
          if (!optionName) return;

          const targetType = slotName === "무기" ? "무기" : "익시드";

          // DB에서 데이터 매칭
          const effectData = uniqueEffectDb.find(
            (item) =>
              item.type === targetType &&
              item.name === optionName &&
              item.job === subJob
          );

          if (effectData) {
            // ★ [핵심] 엔진(Source 10)이 좋아하는 구조로 초기화
            const finalStats = {
              skill: { dmg: {}, lv: {}, cdr: {} },
            };

            Object.entries(effectData).forEach(([key, val]) => {
              // 유효성 체크 (숫자가 아니거나 제외 키면 패스)
              if (excludedKeys.includes(key) || val === null || val === "")
                return;

              const numVal = Number(val);
              if (isNaN(numVal) || numVal === 0) return;

              // =========================================================
              // ★ [NEW] 2단계 코드 삽입 위치 (여기입니다!)
              // =========================================================

              // (1) 특정 스킬 ID 저격 로직 (예: stats_skill_dmg_id_105)
              const skillIdMatch = key.match(/skill_dmg_?id_?([a-zA-Z0-9_]+)/);

              if (skillIdMatch) {
                const skillId = skillIdMatch[1]; // "105" 추출

                // stats.skill 안에 'idDmg'라는 새 방이 없으면 만듭니다.
                if (!finalStats.skill.idDmg) finalStats.skill.idDmg = {};

                // 해당 ID에 값을 누적합니다.
                finalStats.skill.idDmg[skillId] =
                  (finalStats.skill.idDmg[skillId] || 0) + numVal;

                return; // 처리가 끝났으니 다음 키로 넘어갑니다.
              }

              // -------------------------------------------------------
              // Case A: 스킬 공격력 (예: stats_skill_dmg_lv45)
              // -------------------------------------------------------
              const skillDmgMatch = key.match(/skill_dmg_?lv_?(\d+)/);
              if (skillDmgMatch) {
                const lvNum = skillDmgMatch[1]; // "45"

                // ★★★ [수정] 엔진은 "lv45"를 원합니다! "45"가 아니라요.
                const engineKey = `lv${lvNum}`;

                finalStats.skill.dmg[engineKey] =
                  (finalStats.skill.dmg[engineKey] || 0) + numVal;
                return;
              }

              // -------------------------------------------------------
              // Case B: 스킬 레벨 (예: skill_lv_45)
              // -------------------------------------------------------
              const skillLvMatch = key.match(/skill_lv_?(\d+)/);
              if (skillLvMatch) {
                const lvNum = skillLvMatch[1];
                const engineKey = `lv${lvNum}`;

                finalStats.skill.lv[engineKey] =
                  (finalStats.skill.lv[engineKey] || 0) + numVal;
                return;
              }

              // -------------------------------------------------------
              // Case C: 일반 스탯 (예: phys_atk -> physAtk)
              // -------------------------------------------------------
              // 엔진(Source 31)의 일반 합산 로직을 태웁니다.
              const camelKey = toCamelCase(key);
              finalStats[camelKey] = (finalStats[camelKey] || 0) + numVal;
            });

            // 3. 엔진의 mergeStats 함수 호출
            // 이제 구조가 완벽하므로 Source 10-12번 로직(곱연산)을 타게 됩니다.
            mergeStats(finalStats, `고유효과(${slotName}-${optionName})`);
          }
        });
      }

      // 3. 강화/연마/마부/마봉/엠블렘
      EQUIP_SLOTS.forEach((slot) => {
        const rLevel = userStats.reinforce[slot] || 0;
        if (rLevel > 0) {
          const rStats = REINFORCE_DB[slot]?.[rLevel];
          if (rStats) mergeStats(rStats, slot + " 강화"); // [cite: 17]
        }
        const pLevel = userStats.polish[slot] || 0;
        if (pLevel > 0) {
          const pStats = POLISH_DB[slot]?.[pLevel];
          if (pStats) mergeStats(pStats, slot + " 연마"); // [cite: 17]
        }
        const enchName = userStats.enchant[slot];
        if (enchName && enchName !== "선택 안함") {
          const list = ENCHANT_LIST_BY_SLOT[slot] || [];
          const target = list.find((e) => e.name === enchName);
          if (target && target.stats) mergeStats(target.stats, target.name); // [cite: 18]
        }
        let mGroup = null;
        if (slot === "무기") mGroup = "무기";
        else if (["머리어깨", "상의", "하의", "벨트", "신발"].includes(slot))
          mGroup = "방어구";
        else if (["팔찌", "목걸이", "반지"].includes(slot)) mGroup = "악세서리";
        else mGroup = "특수장비";
        const mData = MAGIC_OPTS_BY_GROUP[mGroup];
        if (mData) {
          const uLabel = userStats.magic_unique[slot];
          const cLabel = userStats.magic_common[slot];
          if (uLabel && uLabel !== "선택 안함") {
            const uOpt = mData.unique.find((o) => o.label === uLabel);
            if (uOpt) mergeStats(uOpt.stats, "마법봉인(고유)"); // [cite: 21]
          }
          if (cLabel && cLabel !== "선택 안함") {
            const cOpt = mData.common.find((o) => o.label === cLabel);
            if (cOpt) mergeStats(cOpt.stats, "마법봉인(일반)"); // [cite: 22]
          }
        }
        const emblemData = userStats.emblem[slot];
        const emblemList = Array.isArray(emblemData)
          ? emblemData
          : emblemData
          ? [emblemData]
          : [];
        emblemList.forEach((emb) => {
          if (emb && emb.stats) mergeStats(emb.stats, emb.name + " 엠블렘"); // [cite: 26]
        });
      });

      // 4. 수련/아바타
      const { concentrator, hopae, breakthrough, sealMain, sealSub } =
        userStats.training;
      if (TRAINING_DB.concentrator) {
        for (let i = 1; i <= concentrator; i++)
          if (TRAINING_DB.concentrator[i])
            mergeStats(TRAINING_DB.concentrator[i], "마력응축기"); // [cite: 28]
      }
      if (TRAINING_DB.hopae) {
        for (let i = 1; i <= hopae; i++)
          if (TRAINING_DB.hopae[i]) mergeStats(TRAINING_DB.hopae[i], "호패"); // [cite: 29]
      }
      if (TRAINING_DB.breakthrough) {
        for (let i = 1; i <= breakthrough; i++)
          if (TRAINING_DB.breakthrough[i])
            mergeStats(TRAINING_DB.breakthrough[i], "돌파"); // [cite: 30]
      }
      if (TRAINING_DB.castle_seal) {
        if (TRAINING_DB.castle_seal.base)
          mergeStats(TRAINING_DB.castle_seal.base, "성안의 봉인(기본)");
        if (sealMain) {
          const csMain = TRAINING_DB.castle_seal.main.find(
            (o) => o.name === sealMain
          );
          if (csMain) mergeStats(csMain.stats, "성안(주요)"); // [cite: 33]
        }
        if (sealSub) {
          const csSub = TRAINING_DB.castle_seal.sub.find(
            (o) => o.name === sealSub
          );
          // ★ [수정] 성안(보조) 이름표 추가
          if (csSub) mergeStats(csSub.stats, "성안(보조)");
        }
      }
      const avSet = userStats.avatarSettings.set;
      if (avSet && avSet !== "없음" && AVATAR_DB[avSet])
        mergeStats(AVATAR_DB[avSet], avSet); // [cite: 35]

      // 5. 스킬룬
      const { slots, engrave } = userStats.skillRunes;

      // [A] 일반 룬
      slots.forEach((rune) => {
        if (rune && rune.stats && rune.type !== "special") {
          mergeStats(rune.stats, rune.name); // [cite: 38]
        }
      });

      // [B] 특수 룬
      const synergyJobs = ["와일드베인", "윈드시어"];
      const isSynergy = synergyJobs.includes(subJob);
      const threshold = isSynergy ? 1 : 2;

      let gahoCount = 0;
      let jiheCount = 0;
      slots.forEach((rune) => {
        if (rune && rune.type === "special") {
          if (rune.name.includes("가호")) gahoCount++;
          else if (rune.name.includes("지혜")) jiheCount++;
        }
      });

      if (gahoCount >= threshold) {
        const gahoData = SKILL_RUNE_DB.find(
          (r) => r.name.includes("가호") && r.type === "special"
        );
        if (gahoData && gahoData.stats) {
          mergeStats(gahoData.stats, "가호의 룬(세트)"); // [cite: 44]
        }
      }
      if (jiheCount >= threshold) {
        const jiheData = SKILL_RUNE_DB.find(
          (r) => r.name.includes("지혜") && r.type === "special"
        );
        if (jiheData && jiheData.stats) {
          mergeStats(jiheData.stats, "지혜의 룬(세트)"); // [cite: 46]
        }
      }

      // ★★★ [C] 룬 각인 (신규 추가) ★★★
      if (engrave && engrave.name && engrave.index) {
        // DB에서 해당 각인 정보를 찾습니다.
        // SKILL_RUNE_DB는 App.js 상단에서 이미 import 되어 있어야 합니다.
        const targetEngrave = SKILL_RUNE_DB.find(
          (r) =>
            r.type === "engrave" &&
            r.name === engrave.name &&
            r.index === engrave.index
        );

        if (targetEngrave && targetEngrave.stats) {
          // 스탯 합산 (출처 이름을 '룬 각인' 또는 구체적인 이름으로 표시)
          mergeStats(targetEngrave.stats, `룬 각인(${engrave.name})`);
        }
      }

      // 6. 장비 포인트
      let gpArmor = 0;
      let gpAcc = 0;
      let gpSpecial = 0;
      EQUIP_SLOTS.forEach((slot) => {
        if (slot === "무기") return;
        const item = userStats.equipment[slot];
        if (!item || item.itemId === 0) return;
        const dbItem = GEAR_DB.find((i) => i.id === item.itemId);
        const point = dbItem?.stats?.gearPoint || 0;
        if (["머리어깨", "상의", "하의", "벨트", "신발"].includes(slot))
          gpArmor += point;
        else if (["팔찌", "목걸이", "반지"].includes(slot)) gpAcc += point;
        else gpSpecial += point;
      });
      nextStats.gearPoint = gpArmor + gpAcc + gpSpecial;
      nextStats.gpDetails = { armor: gpArmor, acc: gpAcc, special: gpSpecial };

      const applyGearPointBonus = (type, currentPoint) => {
        const thresholds = GEAR_POINT_BONUS_DB[type] || [];
        const sorted = [...thresholds].sort(
          (a, b) => b.threshold - a.threshold
        );
        const bonus = sorted.find((tier) => currentPoint >= tier.threshold);
        // ★ [수정] 장비 포인트 보너스 이름표 추가
        if (bonus && bonus.stats) mergeStats(bonus.stats, "장비 포인트 보너스");
      };
      applyGearPointBonus("armor", gpArmor);
      applyGearPointBonus("accessory", gpAcc);
      applyGearPointBonus("special", gpSpecial);

      // -----------------------------------------------------------------
      // [Step 2] BUFF 스킬 적용 (수정: 보너스 레벨 합산 & 한계돌파 적용)
      // -----------------------------------------------------------------
      const mySkills = SKILL_DB.filter((s) => {
        const isJob =
          String(s.jobGroup).replace(/\s/g, "") ===
          String(userStats.character.baseJob).replace(/\s/g, "");
        const isSub =
          String(s.jobName).replace(/\s/g, "") ===
            String(subJob).replace(/\s/g, "") || s.jobName === "공용";
        return isJob && isSub;
      });

      mySkills.forEach((skill) => {
        // 1. 내가 직접 찍은 레벨 (SP 투자)
        const learnedLv = userStats.skill.levels[skill.id] || skill.minLv;

        // ★ 버프 타입이면서 스탯을 가진 스킬만 계산
        // (패시브여도 type이 buff로 되어있으면 여기서 처리됨)
        if (skill.type === "buff" && skill.stats && learnedLv > 0) {
          // 2. 아이템/아바타 등으로 올라간 보너스 레벨 가져오기
          // (Step 1에서 합산된 nextStats.skill.lv 데이터를 사용)
          const lvKey = `lv${skill.startLv}`;
          const bonusLv = nextStats.skill.lv[lvKey] || 0;

          // 3. 성장 한계선(Hard Cap) 설정
          // DB에 limitLv가 없으면 maxLv + 10까지 허용 (안전장치)
          let hardCap = skill.limitLv;
          if (!hardCap || hardCap <= skill.maxLv) {
            hardCap = skill.maxLv + 10;
          }

          // 4. 최종 적용 레벨 (중요 ★)
          // 기존 코드 오류 수정: learnedLv에 bonusLv를 더해줍니다.
          const finalLv = Math.min(learnedLv + bonusLv, hardCap);

          // 5. 성장 계수 (1레벨은 기본값이므로, 1을 뺀 나머지 레벨만큼 성장)
          const lvBonusMult = Math.max(0, finalLv - 1);

          // 최종 적용할 스탯 객체 생성
          const finalBuffStats = {};

          // (A) 기본 스탯 순회하며 성장치 적용
          // 공식: 1레벨기본값 + (레벨당성장치 × (최종레벨 - 1))
          Object.keys(skill.stats).forEach((key) => {
            const baseVal = skill.stats[key];
            const growthVal = skill.statGrowth?.[key] || 0;

            finalBuffStats[key] = baseVal + growthVal * lvBonusMult;
          });

          // (B) 1레벨엔 없지만 성장하면서 생기는 옵션 처리 (statGrowth에만 있는 키)
          if (skill.statGrowth) {
            Object.keys(skill.statGrowth).forEach((key) => {
              if (finalBuffStats[key] === undefined) {
                finalBuffStats[key] = skill.statGrowth[key] * lvBonusMult;
              }
            });
          }

          // 계산된 스탯 합산 (출처에 레벨 표시하여 검증 가능케 함)
          mergeStats(finalBuffStats, `${skill.name} (Lv.${finalLv})`);
        }
      });

      // -----------------------------------------------------------------
      // [Step 3] 최종 스펙 계산 (크리티컬 로직 포함)
      // -----------------------------------------------------------------
      const totalPhysAtkBase = nextStats.physAtk;
      const totalMagAtkBase = nextStats.magAtk;
      const totalStrBase = nextStats.str;
      const totalIntBase = nextStats.int;

      const finalPhysAtk = totalPhysAtkBase * (1 + nextStats.physAtkInc / 100);
      const finalMagAtk = totalMagAtkBase * (1 + nextStats.magAtkInc / 100);
      const finalStr = totalStrBase * (1 + nextStats.strInc / 100);
      const finalInt = totalIntBase * (1 + nextStats.intInc / 100);

      const mainStatVal = Math.max(finalStr, finalInt);
      const mainAtkVal = Math.max(finalPhysAtk, finalMagAtk);
      const statFactor = 1 + mainStatVal / 250;

      const { fireEle, waterEle, lightEle, darkEle } = nextStats;
      const inflicted = [];
      if (nextStats.elInflict1 > 0) inflicted.push(nextStats.elInflict1);
      if (nextStats.elInflict2 > 0) inflicted.push(nextStats.elInflict2);

      let maxEle = 0;
      if (inflicted.length > 0) {
        let currentMax = -9999;
        if (inflicted.includes(1)) currentMax = Math.max(currentMax, fireEle);
        if (inflicted.includes(2)) currentMax = Math.max(currentMax, waterEle);
        if (inflicted.includes(3)) currentMax = Math.max(currentMax, lightEle);
        if (inflicted.includes(4)) currentMax = Math.max(currentMax, darkEle);
        maxEle = Math.max(0, currentMax);
      }
      const eleFactor = 1 + maxEle * 0.0045;

      // 크리티컬 확률 정밀 계산 (변환비 f 적용 & 100% 상한선 적용)
      const charLevel = userStats.character.level || 85;
      let critConversionF = charLevel * 1.11 - 52.7;
      if (critConversionF <= 0) critConversionF = 1;

      // 1. 계산값 산출
      let rawPhysCritRate =
        3 + nextStats.physCritRate + nextStats.physCrit / critConversionF;
      let rawMagCritRate =
        3 + nextStats.magCritRate + nextStats.magCrit / critConversionF;

      // ★ [수정] 100% 상한선 적용 (UI 표시용 & 계산용 통일)
      const realPhysCritRate = Math.min(100, Math.max(0, rawPhysCritRate));
      const realMagCritRate = Math.min(100, Math.max(0, rawMagCritRate));

      // 데미지 기대값 계산용 (이제 real 값을 그대로 써도 안전함)
      const effectiveCritRate =
        mainStatVal === finalStr ? realPhysCritRate : realMagCritRate;

      // 크리티컬 데미지 공식 (곱연산)
      const critDmgMult = 1.5 * (1 + nextStats.critDmgInc / 100);

      const critFactor =
        1 - effectiveCritRate / 100 + (effectiveCritRate / 100) * critDmgMult;
      const dmgIncFactor =
        1 + (nextStats.dmgInc + nextStats.counterDmgInc) / 100;

      let highestEleVal = Math.max(fireEle, waterEle, lightEle, darkEle);
      let finalHighestEleAdd =
        (nextStats.highestEleAddDmg / 100) * (1.05 + 0.0045 * highestEleVal);
      let fireAdd = (nextStats.fireAddDmg / 100) * (1.05 + 0.0045 * fireEle);
      let waterAdd = (nextStats.waterAddDmg / 100) * (1.05 + 0.0045 * waterEle);
      let lightAdd = (nextStats.lightAddDmg / 100) * (1.05 + 0.0045 * lightEle);
      let darkAdd = (nextStats.darkAddDmg / 100) * (1.05 + 0.0045 * darkEle);

      const totalAddDmgVal =
        (nextStats.addDmg + nextStats.counterAddDmg) / 100 +
        finalHighestEleAdd +
        fireAdd +
        waterAdd +
        lightAdd +
        darkAdd;
      const addDmgFactor = 1 + totalAddDmgVal;

      const skillAtkFactor = globalSkillAtkMultiplier;
      const allTypeFactor = totalAllTypeDmgRatio;
      const finalDmgIncFactor = totalFinalDmgRatio;

      // ★★★ [NEW] 데미지 옵션 적용 (카운터, 백어택, 투함포) ★★★
      // 안전장치: damageOptions가 없을 경우를 대비해 빈 객체 처리
      const { counter, backAttack, potion } = userStats.damageOptions || {};

      let optionMultiplier = 1.0;

      // 1. 카운터 (최종 데미지 25% 증가 -> 1.25배)
      if (counter) optionMultiplier *= 1.25;

      // 2. 백어택 (최종 데미지 10% 증가 -> 1.10배)
      if (backAttack) optionMultiplier *= 1.1;

      // 3. 투신의 함성 포션 (최종 데미지 12% 증가 -> 1.12배)
      if (potion) optionMultiplier *= 1.12;

      // -----------------------------------------------------------------
      // [Step 4] 스킬 데미지 상세 계산 & 분석 데이터 생성 (누골 탭 추가)
      // -----------------------------------------------------------------
      let totalOneMinSkillDmg = 0; // 기존 (이론상 총합)
      const myTreeList = []; // 기존 (이론상)
      const potentialList = []; // 기존 (잠재력)
      const nugolList = []; // ★ [New] 누골 (실전형 정수 카운트)

      // [FIX] 특정 변수 대신, 범용 '우체통'을 하나 만듭니다.
      // 구조: { "SK_IS_14": 5000, "SK_IS_99": 1200 }
      const dmgTransferMap = {}; // 내 스킬트리용 우체통
      const nugolTransferMap = {}; // 누골용 우체통

      // [공통 팩터 계산] (변수명 충돌 수정 Ver)

      // 1. [방어력 감소] -> 데미지 증가율로 적용
      const defShredVal = nextStats.defShred || 0;
      const defShredFactor = 1 + defShredVal / 100;

      // 2. [적 레벨 기반 방어율] 계산
      // 적 레벨 기본값 85
      const targetLevel = enemyLevel > 0 ? enemyLevel : 85;

      // ★ [수정] 변수명 충돌 방지를 위해 charLevel -> myLevel로 변경
      const myLevel = userStats.character.level || 85;

      // ★ [최종 공식] 방어력 = 레벨^2 * 5.189
      const rawEnemyDef = targetLevel * targetLevel * 5.189;

      // 던파 클래식 방어율 공식 (myLevel 사용)
      const attackerConstant = myLevel * 200;
      const defRate = rawEnemyDef / (rawEnemyDef + attackerConstant);

      // 레벨에 따른 데미지 반영 비율 (1 - 방어율)
      const levelDefenseFactor = 1 - defRate;

      // 최종 공통 배율
      const commonFactor =
        statFactor *
        eleFactor *
        critFactor *
        dmgIncFactor *
        addDmgFactor *
        skillAtkFactor *
        allTypeFactor *
        finalDmgIncFactor *
        levelDefenseFactor *
        defShredFactor *
        optionMultiplier;

      const classSkills = SKILL_DB.filter((s) => {
        const isJob =
          String(s.jobGroup).replace(/\s/g, "") ===
          String(userStats.character.baseJob).replace(/\s/g, "");
        const isSub =
          String(s.jobName).replace(/\s/g, "") ===
            String(subJob).replace(/\s/g, "") || s.jobName === "공용";
        return isJob && isSub && (s.type === "active" || s.type === "onhit");
      });

      classSkills.forEach((skill) => {
        const lvKey = `lv${skill.startLv}`;
        const levelFactor = specificSkillMultipliers[lvKey] || 1.0; // 레벨 보너스
        const idFactor = specificSkillIdMultipliers[skill.id] || 1.0; // (New) ID 보너스
        const specificSkillFactor = levelFactor * idFactor;
        const specificCdrPct = nextStats.skill.cdr?.[lvKey] || 0;
        const finalCdrPct = Math.min(50, specificCdrPct);

        const tpLv = userStats.skill.tpLevels[skill.id] || 0;
        const tpGrowthVal = skill.tpGrowth || 0;
        const tpGrowth1Lv = skill.tpGrowth_1lv || 0;
        let tpBonusPct = 0;
        if (tpLv > 0) {
          if (tpGrowth1Lv > 0)
            tpBonusPct = tpGrowth1Lv + (tpLv - 1) * tpGrowthVal;
          else tpBonusPct = tpLv * tpGrowthVal;
        }
        const tpMultiplier = 1 + tpBonusPct / 100;

        // -------------------------------
        // [Logic 1] 내 스킬트리 (My Tree) & [Logic 3] 누골 (Nugol)
        // -------------------------------
        const learnedLv = userStats.skill.levels[skill.id] || skill.minLv;
        if (learnedLv > 0) {
          const bonusLv = nextStats.skill.lv[lvKey] || 0;
          const finalLv = Math.min(learnedLv + bonusLv, skill.limitLv);

          const finalRate =
            skill.baseDamageRate + skill.damageRateGrowth * (finalLv - 1);
          const finalFlat =
            skill.baseFlatDamage + skill.flatDamageGrowth * (finalLv - 1);
          const skillBaseDmg = mainAtkVal * (finalRate / 100) + finalFlat;

          // 1. 기본 1타 데미지 계산 (기존과 동일)
          const rawOneHitDmg =
            skillBaseDmg * tpMultiplier * commonFactor * specificSkillFactor;

          // ★ Context 포장하기 (완벽한 복사를 위해 재료 추가)
          const mechContext = {
            allSkills: SKILL_DB,
            commonFactor,
            mainAtkVal,
            tpMultiplier, // (내 스킬 TP)
            specificSkillFactor, // (내 스킬 룬/레벨링)

            // ▼ [NEW] 타겟 스킬 계산용 데이터들
            skillBonusLevels: nextStats.skill.lv, // 장비로 오른 레벨 (+Lv)
            skillDmgMap: specificSkillMultipliers, // 레벨 구간별 증뎀 (룬 등)
            skillIdDmgMap: specificSkillIdMultipliers, // ID 지정 증뎀 (고유옵 등)
          };

          // ★ 어댑터 호출 (mechanicTransferDmg 받아오기)
          const {
            finalDmg: oneHitDmg,
            additionalDmg: mechAdd,
            mechanicTransferDmg,
            transferTargetId, // ★ [NEW] 받는 사람 ID (예: "SK_IS_14")
            extraText,
          } = applyJobMechanics(skill, userStats, rawOneHitDmg, mechContext);

          // =========================================================
          // ★★★ [FIX] 실전성을 고려한 횟수 계산 로직 (수정됨) ★★★
          // =========================================================
          let cooldown = skill.cooltime;
          let realCooldown = cooldown * (1 - finalCdrPct / 100);

          // [1] 최소 동작 시간 (Human Delay) 정의
          // 쿨타임이 아무리 짧아도 스킬 시전 모션 때문에 최소 0.7~0.8초는 소요됩니다.
          // 공용 스킬(common)은 주력기가 아니므로 패널티를 더 줍니다(1.5초).
          let minActionTime = 0.75;
          if (skill.category === "common") minActionTime = 2.0; // 휘둘러치기 등 견제
          if (skill.category === "basic") minActionTime = 1.0; // 기본기

          // 실제 1회 사이클 시간 = 쿨타임과 최소동작시간 중 큰 값
          const effectiveCycleTime = Math.max(realCooldown, minActionTime);

          // (A) 이론상 횟수 (DPS용)
          let castsPerMin = 0;
          if (skill.type === "onhit") castsPerMin = 15; // 패시브/평타류 고정
          else {
            // 0초 쿨타임 방지 및 애니메이션 시간 반영
            if (effectiveCycleTime > 0) castsPerMin = 60 / effectiveCycleTime;
            else castsPerMin = 1;
          }

          // (B) 누골 실전 횟수 (정수, 쿨타임 딱 맞춰 못 쓰는 현실 반영)
          let nugolCount = 0;
          if (skill.type === "onhit") nugolCount = 15;
          else {
            // 누골 횟수도 'effectiveCycleTime'을 기준으로 계산
            if (effectiveCycleTime > 0) {
              // 60초 안에 몇 번 들어가는지 (첫타 0초 발동 가정)
              // 예: 쿨 40초 -> 0초, 40초 (2회)
              // 예: 쿨 0.5초(보정 0.8초) -> 60/0.8 = 75회
              if (effectiveCycleTime < 60) {
                nugolCount = Math.floor(60 / effectiveCycleTime);
                // 딱 떨어지지 않고 시간이 남으면 1회 더 칠 가능성 있음 (취향 차이)
                // 여기서는 보수적으로 floor 처리하거나 +1 할 수 있음
                if (60 % effectiveCycleTime > 0.1) nugolCount += 1;
              } else {
                nugolCount = 1; // 60초 넘으면 1회
              }
            } else {
              nugolCount = 0;
            }
          }

          // ★★★ [NEW] 저금통 입금 (이곳이 핵심입니다) ★★★
          if (mechanicTransferDmg > 0 && transferTargetId) {
            // 1. 내 스킬트리용 입금
            const totalTransfer = mechanicTransferDmg * castsPerMin;
            // 기존에 값이 있으면 더하고, 없으면 초기화
            dmgTransferMap[transferTargetId] =
              (dmgTransferMap[transferTargetId] || 0) + totalTransfer;

            // 2. 누골용 입금
            const totalNugolTransfer = mechanicTransferDmg * nugolCount;
            nugolTransferMap[transferTargetId] =
              (nugolTransferMap[transferTargetId] || 0) + totalNugolTransfer;
          }

          // ★ 내 딜 계산 (transfer는 남 줄 돈이니 제외, mechAdd는 내 돈이니 포함)
          const totalDmg =
            oneHitDmg * castsPerMin + (mechAdd || 0) * castsPerMin;
          const nugolTotalDmg =
            oneHitDmg * nugolCount + (mechAdd || 0) * nugolCount;

          totalOneMinSkillDmg += totalDmg;

          // 리스트 추가
          const itemData = {
            id: skill.id,
            name: skill.name,
            icon: skill.img,
            damage: Math.floor(totalDmg),
            count:
              skill.type === "onhit" ? "-" : Math.floor(castsPerMin * 10) / 10,
            rawDmg: totalDmg,
          };
          myTreeList.push(itemData);

          // 누골 데이터 추가
          nugolList.push({
            ...itemData,
            damage: Math.floor(nugolTotalDmg), // 정수 횟수 기반 데미지
            count: skill.type === "onhit" ? "-" : nugolCount, // 정수 횟수
            rawDmg: nugolTotalDmg,
          });
        }

        // -------------------------------
        // [Logic 2] 잠재력 분석 (Max Level) - 기존 유지
        // -------------------------------
        const bonusLv = nextStats.skill.lv[lvKey] || 0;
        const maxPossibleLv = Math.min(skill.maxLv + bonusLv, skill.limitLv);

        const maxRate =
          skill.baseDamageRate + skill.damageRateGrowth * (maxPossibleLv - 1);
        const maxFlat =
          skill.baseFlatDamage + skill.flatDamageGrowth * (maxPossibleLv - 1);
        const maxBaseDmg = mainAtkVal * (maxRate / 100) + maxFlat;

        // 1. 기본 잠재력 1타 데미지 계산
        const rawMaxOneHitDmg =
          maxBaseDmg * tpMultiplier * commonFactor * specificSkillFactor;

        // ★★★ [2. 만능 어댑터 연결] 잠재력에도 특수 로직 적용 ★★★
        const {
          finalDmg: maxOneHitDmg, // 특수능력이 반영된 데미지를 'maxOneHitDmg'로 덮어씁니다
          additionalDmg: mechAdd, // 추가 데미지 (지속피해 등)
        } = applyJobMechanics(skill, userStats, rawMaxOneHitDmg, SKILL_DB);

        let cooldown = skill.cooltime;
        let realCooldown = cooldown * (1 - finalCdrPct / 100);
        let castsPerMin = 0;
        if (skill.type === "onhit") castsPerMin = 15;
        else {
          if (realCooldown > 0) castsPerMin = 60 / realCooldown;
          else castsPerMin = 1;
        }

        const potentialTotalDmg =
          maxOneHitDmg * castsPerMin + (mechAdd || 0) * castsPerMin;

        potentialList.push({
          id: skill.id,
          name: skill.name,
          icon: skill.img,
          damage: Math.floor(potentialTotalDmg),
          count:
            skill.type === "onhit" ? "-" : Math.floor(castsPerMin * 10) / 10,
          rawDmg: potentialTotalDmg,
        });
      });

      // -----------------------------------------------------------------
      // [Step 5] 상태이상 데미지 추가 및 최종 합산
      // -----------------------------------------------------------------
      const {
        poisonDmg,
        bleedDmg,
        burnDmg,
        shockDmg,
        poisonInc,
        bleedInc,
        burnInc,
        shockInc,
      } = nextStats.status;

      // 상태이상 로직 (기존 유지)
      // 누골 모드에서도 상태이상은 "총 데미지 비율" 혹은 "별도 계산"이 필요하지만
      // 여기서는 1분 평균치 비율을 그대로 누골 리스트에도 적용합니다.
      const getStatusDmg = (rate, inc) =>
        totalOneMinSkillDmg * (rate / 100) * (1 + inc / 100);

      const poisonTotal = getStatusDmg(poisonDmg, poisonInc);
      const bleedTotal = getStatusDmg(bleedDmg, bleedInc);
      const burnTotal = getStatusDmg(burnDmg, burnInc);
      const shockTotal = getStatusDmg(shockDmg, shockInc);

      const totalStatusDmg = poisonTotal + bleedTotal + burnTotal + shockTotal;
      const grandTotalOneMinDmg = totalOneMinSkillDmg + totalStatusDmg;

      // 리스트에 상태이상 추가
      [myTreeList, nugolList].forEach((list) => {
        // 누골 리스트일 경우 상태이상 데미지도 누골 총합 비율에 맞춰 재계산 필요
        // 간단하게 구현하기 위해 myTree 비율을 가져오되, 리스트 정렬 후 재계산 추천
        // 여기서는 단순 추가 (수치는 myTree 기준 - 오차 감안)
        if (poisonTotal > 0)
          list.push({
            id: "st_poison",
            name: "중독 데미지",
            icon: "poison_icon",
            damage: Math.floor(poisonTotal),
            count: "-",
            rawDmg: poisonTotal,
            isStatus: true,
          });
        if (bleedTotal > 0)
          list.push({
            id: "st_bleed",
            name: "출혈 데미지",
            icon: "bleed_icon",
            damage: Math.floor(bleedTotal),
            count: "-",
            rawDmg: bleedTotal,
            isStatus: true,
          });
        if (burnTotal > 0)
          list.push({
            id: "st_burn",
            name: "화상 데미지",
            icon: "burn_icon",
            damage: Math.floor(burnTotal),
            count: "-",
            rawDmg: burnTotal,
            isStatus: true,
          });
        if (shockTotal > 0)
          list.push({
            id: "st_shock",
            name: "감전 데미지",
            icon: "shock_icon",
            damage: Math.floor(shockTotal),
            count: "-",
            rawDmg: shockTotal,
            isStatus: true,
          });
      });

      // ★★★ [FIX] 우체통 털기 (범용 로직) ★★★
      // dmgTransferMap에 있는 모든 배달물을 주인에게 전달합니다.
      Object.keys(dmgTransferMap).forEach((targetId) => {
        // 1. 내 스킬트리 리스트에서 주인 찾기
        const target = myTreeList.find((item) => item.id === targetId);
        const amount = dmgTransferMap[targetId];

        if (target && amount > 0) {
          target.rawDmg += amount;
          target.damage = Math.floor(target.rawDmg);
          totalOneMinSkillDmg += amount; // 전역 합산도 잊지 말기
        }
      });

      // 2. 누골 리스트 배달
      Object.keys(nugolTransferMap).forEach((targetId) => {
        const target = nugolList.find((item) => item.id === targetId);
        const amount = nugolTransferMap[targetId];

        if (target && amount > 0) {
          target.rawDmg += amount;
          target.damage = Math.floor(target.rawDmg);
        }
      });

      // 정렬 (데미지 높은 순)
      myTreeList.sort((a, b) => b.rawDmg - a.rawDmg);
      nugolList.sort((a, b) => b.rawDmg - a.rawDmg);
      potentialList.sort((a, b) => b.rawDmg - a.rawDmg);

      // 점유율 계산
      myTreeList.forEach(
        (item) =>
          (item.share =
            grandTotalOneMinDmg > 0
              ? (item.rawDmg / grandTotalOneMinDmg) * 100
              : 0)
      );

      // ★ [누골] Top 12 스킬 제한 적용 (현실성 반영)
      // 상태이상 데미지는 "스킬"이 아니므로 Top 12 카운트에서 제외하고, 항상 포함시킴
      // 스킬만 추출하여 상위 12개 합산 + 상태이상 합산
      const nugolSkillsOnly = nugolList.filter((i) => !i.isStatus);
      const nugolStatusOnly = nugolList.filter((i) => i.isStatus);

      // 상위 12개 스킬만 유효 딜로 인정
      const activeNugolSkills = nugolSkillsOnly.slice(0, 12);
      const activeNugolSum = activeNugolSkills.reduce(
        (acc, cur) => acc + cur.rawDmg,
        0
      );
      const activeStatusSum = nugolStatusOnly.reduce(
        (acc, cur) => acc + cur.rawDmg,
        0
      );
      const nugolGrandTotal = activeNugolSum + activeStatusSum;

      nugolList.forEach((item) => {
        // Top 12에 못 든 스킬은 점유율 0 처리 혹은 전체 대비 비율
        // 여기서는 전체 대비 비율로 하되, 합계는 Top 12 기준
        item.share =
          nugolGrandTotal > 0 ? (item.rawDmg / nugolGrandTotal) * 100 : 0;

        // 시각적 구분을 위해 Top 12 밖의 스킬은 흐리게 표시하기 위한 플래그
        if (!item.isStatus && !activeNugolSkills.includes(item))
          item.isExcluded = true;
      });

      // 데이터 저장
      setAnalysisData({
        myTree: myTreeList,
        nugol: nugolList, // ★ 추가됨
        potential: potentialList,
        totalDmg: Math.floor(grandTotalOneMinDmg),
        nugolTotalDmg: Math.floor(nugolGrandTotal), // ★ Top 12 합산 딜
      });

      // 기존 UI용 데이터 업데이트
      const uiStats = {
        // ... (이전 코드와 동일, 생략 없이 그대로 유지하세요) ...
        ...nextStats,
        ...nextStats.status,
        strBase: Math.floor(totalStrBase),
        intBase: Math.floor(totalIntBase),
        physAtkBase: Math.floor(totalPhysAtkBase),
        magAtkBase: Math.floor(totalMagAtkBase),
        realPhysCritRate: realPhysCritRate,
        realMagCritRate: realMagCritRate,
        str: Math.floor(finalStr),
        int: Math.floor(finalInt),
        physAtk: Math.floor(finalPhysAtk),
        magAtk: Math.floor(finalMagAtk),
        skillAtkInc: ((globalSkillAtkMultiplier - 1) * 100).toFixed(1),
        allTypeDmg: ((totalAllTypeDmgRatio - 1) * 100).toFixed(1),
        finalDmg: ((totalFinalDmgRatio - 1) * 100).toFixed(1),
        skill: {
          ...nextStats.skill,
          dmg: {
            // (1) 기존 레벨별 스킬 공격력 (lv45 등)
            ...Object.keys(specificSkillMultipliers).reduce((acc, key) => {
              acc[key] = (specificSkillMultipliers[key] - 1) * 100;
              return acc;
            }, {}),

            // (2) ★ [NEW] 특정 스킬 공격력 & 툴팁 출처 연결
            ...Object.keys(specificSkillIdMultipliers).reduce((acc, id) => {
              const val = (specificSkillIdMultipliers[id] - 1) * 100;

              // 0이 아닐 때만 표시 (음수 포함, 0.001 오차범위 고려)
              if (Math.abs(val) > 0.001) {
                // ID로 스킬 이름 찾기
                const s = SKILL_DB.find(
                  (skill) => String(skill.id) === String(id)
                );
                const name = s ? s.name : id; // 이름 없으면 ID라도 표시

                // UI용 키 생성 (예: exact_체이서프레스)
                // 이 키를 utils/data.js가 받아서 처리합니다.
                const uiKey = `exact_${name}`;
                acc[uiKey] = val;

                // ★ [툴팁 연결 핵심]
                // 계산 엔진은 'skill_dmg_id_105'라는 키로 출처를 기록했습니다.
                // UI는 'exact_체이서프레스'라는 키를 사용하므로, 출처 정보를 복사해줍니다.
                const sourceKey = `skill_dmg_id_${id}`;

                if (statSources[sourceKey]) {
                  statSources[uiKey] = statSources[sourceKey];
                }
              }
              return acc;
            }, {}),
          },
        },
        sources: statSources,
      };

      setFinalStats(uiStats);
      setFinalDamageInfo({
        normal: Math.floor(totalOneMinSkillDmg),
        status: Math.floor(totalStatusDmg),
        total: Math.floor(grandTotalOneMinDmg),
      });
      setTotalGearPoint(nextStats.gearPoint || 0);
    }, 16);
    return () => clearTimeout(timer);
  }, [userStats, activeSets, enemyLevel, uniqueEffectDb]);

  // 모달 열 때 버퍼 초기화 헬퍼
  const openSubModal = (subType, slot) => {
    // 현재 해당 슬롯의 전체 스탯을 복사해서 버퍼에 넣음
    setEditBuffer({ ...userStats });
    setActiveModal({ type: subType, slot });
  };

  // 버퍼 내용 업데이트
  const updateBuffer = (category, key, value) => {
    setEditBuffer((prev) => ({
      ...prev,
      [category]: { ...prev[category], [slot]: value }, // slot은 activeModal.slot 사용 불가하므로 아래에서 처리
    }));
  };

  // 2. 모달 렌더러
  const renderStatDetailModal = () => {
    if (!statDetailModal) return null;
    const { title, list, isPercent } = statDetailModal;

    return (
      <div
        className="item-picker-modal"
        onClick={() => setStatDetailModal(null)}
        style={{ zIndex: 50000 }}
      >
        <div
          className="alert-modal-content"
          onClick={(e) => e.stopPropagation()}
          style={{ width: "320px", padding: "0", overflow: "hidden" }}
        >
          {/* 헤더 */}
          <div
            style={{
              background: "#222",
              padding: "15px",
              borderBottom: "1px solid #444",
              textAlign: "center",
              fontWeight: "bold",
              fontSize: "1.1rem",
            }}
          >
            {title} 상세 내역
          </div>

          {/* 리스트 */}
          <div
            style={{ maxHeight: "400px", overflowY: "auto", padding: "15px" }}
          >
            {!list || list.length === 0 ? (
              <div style={{ textAlign: "center", color: "#666" }}>
                내역이 없습니다. (기본 스탯 등)
              </div>
            ) : (
              list
                .sort((a, b) => b.value - a.value)
                .map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: "8px",
                      borderBottom: "1px dashed #333",
                      paddingBottom: "4px",
                    }}
                  >
                    <span style={{ color: "#ccc" }}>{item.source}</span>
                    <span
                      style={{
                        color: "var(--text-gold)",
                        fontWeight: "bold",
                      }}
                    >
                      +
                      {isPercent
                        ? Number(item.value).toFixed(1) + "%"
                        : item.value}
                    </span>
                  </div>
                ))
            )}
          </div>

          {/* 닫기 버튼 */}
          <div
            style={{
              padding: "15px",
              borderTop: "1px solid #333",
              textAlign: "center",
            }}
          >
            <button
              className="action-btn btn-apply"
              onClick={() => setStatDetailModal(null)}
              style={{ width: "100%" }}
            >
              닫기
            </button>
          </div>
        </div>
      </div>
    );
  };

  // [Simple Tooltip Component] 하단 스탯 패널용 가벼운 팝오버
  const renderSimpleTooltip = () => {
    if (!simpleTooltipData || !simpleTooltipData.visible) return null;

    const { text, x, y } = simpleTooltipData;

    // 위치 조정 (마우스 우측 하단)
    let left = x + 15;
    let top = y + 15;

    // 화면 넘침 방지
    if (left + 250 > window.innerWidth) left = x - 260;
    if (top + 200 > window.innerHeight) top = y - 200;

    return (
      <div
        style={{
          position: "fixed",
          left,
          top,
          zIndex: 100000,
          background: "rgba(20, 20, 20, 0.95)",
          border: "1px solid #555",
          borderRadius: "6px",
          padding: "8px 12px",
          color: "#ddd",
          fontSize: "0.8rem",
          lineHeight: "1.5",
          whiteSpace: "pre-wrap",
          boxShadow: "0 4px 15px rgba(0,0,0,0.8)",
          pointerEvents: "none", // 마우스 통과
          backdropFilter: "blur(4px)",
        }}
      >
        {text}
      </div>
    );
  };

  // [Tooltip Handlers]
  // ★ [수정] options 매개변수 추가 ({ onlySetEffect: true } 등)
  const handleItemMouseEnter = (
    item,
    e,
    blacksmithData = null,
    options = {}
  ) => {
    if (tooltipData?.isFixed) return;

    setTooltipData({
      item,
      blacksmith: blacksmithData,
      x: e.clientX,
      y: e.clientY,
      visible: true,
      isFixed: false,
      onlySetEffect: options.onlySetEffect || false, // ★ 세트 효과 전용 모드 플래그
    });
  };

  const handleItemMouseMove = (e) => {
    // ★ 고정 상태면 마우스 따라다니지 않음
    if (tooltipData && tooltipData.visible && !tooltipData.isFixed) {
      setTooltipData((prev) => ({ ...prev, x: e.clientX, y: e.clientY }));
    }
  };

  const handleItemMouseLeave = () => {
    // ★ 고정 상태면 마우스가 나가도 닫지 않음
    if (tooltipData?.isFixed) return;
    setTooltipData(null);
  };

  // [Tooltip Handlers]
  const handleStatMove = (e) => {
    // 툴팁이 떠있을 때만 위치 업데이트
    if (simpleTooltipData) {
      setSimpleTooltipData((prev) => ({ ...prev, x: e.clientX, y: e.clientY }));
    }
  };

  const handleStatHover = (e, sourceList, isPercent) => {
    if (!sourceList || sourceList.length === 0) return;

    // 툴팁 텍스트 생성
    const sorted = [...sourceList].sort((a, b) => b.value - a.value);
    const text = sorted
      .map((s) => {
        const v = isPercent
          ? `${Number(s.value).toFixed(1)}%`
          : s.value.toLocaleString();
        return `${s.source}: +${v}`;
      })
      .join("\n");

    setSimpleTooltipData({
      text,
      x: e.clientX,
      y: e.clientY,
      visible: true,
    });
  };

  const handleStatLeave = () => {
    setSimpleTooltipData(null);
  };

  // =========================================================
  // [5] Main Render
  // =========================================================
  const renderCalculatorPage = () => {
    // ★ [수정] 헬퍼: setCode와 prefix를 이용해 착용 중인 아이템 정밀 검색
    const handleSlotAction = (actionType, slot, isCash = false) => {
      if (actionType === "CLICK_SLOT") {
        // 1. 클릭 시 동작 (기존 handleClick 로직)
        if (slot === "무기") {
          if (!userStats.character.baseJob)
            return alert("직업군을 먼저 선택해주세요.");
          setActiveModal({ type: "GEAR_PICKER", slot });
        } else if (isCash) {
          setActiveModal({ type: "SPECIAL_PICKER", slot });
        } else {
          setActiveModal({ type: "GEAR_PICKER", slot });
        }
      } else if (actionType === "BLACKSMITH") {
        // 2. 대장간 버튼
        setEditBuffer(JSON.parse(JSON.stringify(userStats)));
        setActiveModal({ type: "BLACKSMITH", slot });
      }
    };
    const findEquippedSetItem = (setInfo) => {
      const { setCode, prefix } = setInfo;

      for (const slot of EQUIP_SLOTS) {
        if (slot === "무기") continue;

        const eq = userStats.equipment[slot];
        if (!eq || eq.itemId === 0) continue;

        const item = GEAR_DB.find((i) => i.id === eq.itemId);
        if (!item || !item.stats) continue;

        // 1. 세트 코드 일치 여부 확인 (가장 정확함)
        if (String(item.stats.setCode) === String(setCode)) {
          // 2. 접두사 일치 여부 확인 (상위 에픽 구분용)
          // 아이템 이름이 "불굴 : ..." 형식이면 prefix는 "불굴"
          const itemPrefix = item.name.includes(":")
            ? item.name.split(":")[0].trim()
            : null;

          // 접두사가 서로 같거나, 둘 다 없으면 일치
          if (itemPrefix === prefix) {
            return item;
          }
        }
      }
      return null;
    };

    // 1. 수련일지 데이터 (안전장치 포함)
    const {
      concentrator = 0,
      hopae = 0,
      breakthrough = 0,
      sealMain = "",
      sealSub = "",
    } = userStats.training || {};

    // ★ 수정: 성안의 봉인(sealMain, sealSub)이 하나라도 있으면 활성 상태로 간주
    const isJournalActive =
      concentrator > 0 ||
      hopae > 0 ||
      breakthrough > 0 ||
      sealMain !== "" ||
      sealSub !== "";
    const journalText = `마력${concentrator} / 호패${hopae} / 돌파${breakthrough}`;
    const sealText = getMergedSealText(sealMain, sealSub);

    // 2. 스킬룬 데이터 & 요약 텍스트 생성
    const { slots, engrave } = userStats.skillRunes || {
      slots: [],
      engrave: {},
    };
    const totalRunes = slots.filter((r) => r).length;

    // 룬 카운팅 (종류/등급/레벨별로 묶기)
    const runeSummaryMap = new Map();
    slots.forEach((r) => {
      if (!r) return;
      let key = "";
      let displayName = "";

      // "각성의 룬" -> "각성"
      const coreName = r.name.replace("의 룬", "");

      if (r.type === "special") {
        // 특수 룬: 가호, 지혜, 왜곡
        // 예: "가호"
        key = coreName;
        displayName = coreName;
      } else {
        // 일반 룬: 각성IV[30] 형식
        // r.level : 등급 (3 or 4)
        // r.targetSkillLevel : 스킬 레벨 (30, 35...)
        const gradeRoman = r.level === 3 ? "III" : "IV";
        const targetLv = r.targetSkillLevel;

        // 키 생성: "각성IV[30]"
        key = `${coreName}${gradeRoman}[${targetLv}]`;
        displayName = key;
      }

      const currentVal = runeSummaryMap.get(key) || {
        name: displayName,
        count: 0,
      };
      runeSummaryMap.set(key, {
        name: displayName,
        count: currentVal.count + 1,
      });
    });

    // 텍스트로 변환 (예: "가호 2 / 지혜 1 / 각성IV[30] 3")
    const runeSummaryText = Array.from(runeSummaryMap.values())
      .map((item) => `${item.name} ${item.count}`)
      .join(" / ");

    // ★ [NEW] 룬 각인 옵션 텍스트 생성
    let engraveOptionText = null;
    if (engrave && engrave.name && engrave.index) {
      // DB에서 각인 정보 찾기
      const targetEngrave = SKILL_RUNE_DB.find(
        (r) =>
          r.type === "engrave" &&
          r.name === engrave.name &&
          r.index === engrave.index
      );

      if (targetEngrave) {
        // 옵션 텍스트 변환 (예: 스킬 공격력 +5%)
        // formatStatsToKor 함수가 없다면 targetEngrave.notice 사용
        engraveOptionText =
          formatStatsToKor(targetEngrave.stats) ||
          targetEngrave.notice ||
          `${engrave.index}단계`;
      }
    }

    // ★ [3. 누락된 부분 복구] 아바타 데이터
    const { set: avatarSet } = userStats.avatarSettings || { set: "없음" };

    const renderStatGroup = (title, items) => (
      <div className="stat-group">
        <div className="stat-category-header">{title}</div>
        {items.map(({ label, key, isPercent, isHighlight }) => {
          let val = finalStats[key] || 0;
          if (typeof val === "number" && !Number.isInteger(val))
            val = val.toFixed(1);
          return (
            <div
              key={key}
              className={`stat-detail-row ${
                isHighlight ? "stat-highlight" : ""
              }`}
            >
              <span className="stat-detail-label">{label}</span>
              <span className="stat-detail-val">
                {Number(val).toLocaleString()}
                {isPercent ? "%" : ""}
              </span>
            </div>
          );
        })}
      </div>
    );

    // ★ [추가] 캐릭터 전직 정보 (여기서 선언해야 아래에서 subJob 변수를 쓸 수 있습니다)
    const { subJob } = userStats.character;

    // [App.js] renderCalculatorPage 리턴 부분 (최종 레이아웃)
    return (
      <div className="calc-game-container">
        {/* 상단 섹션 (내실 / 장비 / 캐릭터 / 장비 / 세트효과) - Flex Row */}
        <div
          style={{
            display: "flex",
            width: "100%",
            justifyContent: "center",
            gap: "55px",

            alignItems: "flex-start",
            flexWrap: "wrap",
          }}
        >
          {/* 1. 좌측 컨트롤 (내실 + 스킬) */}
          <div className="control-column">
            {/* 1. 내실 설정 타이틀 */}
            <div className="panel-title">내실 설정</div>

            <div className="naesil-control-box">
              {/* 1-1. 수련일지 */}
              <div
                className={`naesil-btn ${isJournalActive ? "active" : ""}`}
                onClick={() => setActiveModal({ type: "JOURNAL", slot: null })}
                style={{
                  height: "auto",
                  minHeight: "60px",
                  padding: "10px",
                  flexDirection: "row",
                }}
              >
                <img
                  src={`${IMAGE_BASE_URL}/icons/수련일지.png`}
                  className="naesil-btn-img"
                  alt="수련"
                  onError={(e) => (e.target.src = PLACEHOLDER_IMG)}
                />
                <div className="naesil-btn-info">
                  <span
                    className="naesil-btn-label"
                    style={{ marginBottom: "2px" }}
                  >
                    수련일지
                  </span>
                  {isJournalActive ? (
                    <>
                      <span className="naesil-btn-val small-text">{`마력 ${concentrator} / 호패 ${hopae} / 돌파 ${breakthrough}`}</span>
                      {(() => {
                        if (!sealMain && !sealSub) return null;
                        return (
                          <>
                            <div
                              style={{
                                width: "100%",
                                height: "1px",
                                background: "rgba(255,255,255,0.1)",
                                margin: "4px 0",
                              }}
                            ></div>
                            <span
                              className="naesil-btn-val small-text"
                              style={{ color: "var(--text-gold)" }}
                            >
                              {sealText}
                            </span>
                          </>
                        );
                      })()}
                    </>
                  ) : (
                    <span className="naesil-btn-val">미설정</span>
                  )}
                </div>
              </div>

              {/* 1-2. 스킬룬 */}
              <div
                className={`naesil-btn ${totalRunes > 0 ? "active" : ""}`}
                onClick={() => {
                  setEditBuffer(JSON.parse(JSON.stringify(userStats)));
                  setActiveModal({ type: "SKILL_RUNE", slot: null });
                }}
                style={{ height: "auto", minHeight: "60px", padding: "10px" }}
              >
                <img
                  src={`${IMAGE_BASE_URL}/icons/스킬룬.png`}
                  className="naesil-btn-img"
                  alt="룬"
                  onError={(e) => (e.target.src = PLACEHOLDER_IMG)}
                />
                <div className="naesil-btn-info">
                  <span
                    className="naesil-btn-label"
                    style={{ marginBottom: "4px" }}
                  >
                    스킬룬 ({totalRunes}/20)
                  </span>
                  <span
                    className="naesil-btn-val small-text"
                    style={{ lineHeight: "1.4" }}
                  >
                    {totalRunes > 0 ? runeSummaryText : "미설정"}
                  </span>
                  {/* ★ [NEW] 룬 각인 정보 표시 (있을 때만 구분선 긋고 표시) */}
                  {engraveOptionText && (
                    <>
                      <div
                        style={{
                          width: "100%",
                          height: "1px",
                          background: "rgba(255,255,255,0.15)",
                          margin: "6px 0",
                        }}
                      ></div>
                      <div
                        // 칸이 좁으므로 flex로 아이콘과 텍스트 정렬
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                          color: "#ffd700", // 노란색 강조
                          fontSize: "0.75rem",
                          fontWeight: "bold",
                        }}
                      >
                        <span></span>
                        <span>{engraveOptionText}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* 1-3. 아바타 */}
              <div
                className={`naesil-btn ${avatarSet !== "없음" ? "active" : ""}`}
                onClick={() =>
                  setActiveModal({ type: "AVATAR_MAIN", slot: null })
                }
                style={{ height: "auto", minHeight: "60px", padding: "10px" }}
              >
                <img
                  src={`${IMAGE_BASE_URL}/icons/아바타.png`}
                  className="naesil-btn-img"
                  alt="압타"
                  onError={(e) => (e.target.src = PLACEHOLDER_IMG)}
                />
                <div className="naesil-btn-info">
                  <span
                    className="naesil-btn-label"
                    style={{ marginBottom: "4px" }}
                  >
                    아바타
                  </span>
                  <span className="naesil-btn-val small-text">
                    {avatarSet === "없음" ? (
                      "미착용"
                    ) : (
                      <TextFormatter text={avatarSet} />
                    )}
                  </span>
                  {avatarSet !== "없음" && (
                    <div
                      style={{
                        width: "100%",
                        height: "1px",
                        background: "rgba(255,255,255,0.1)",
                        margin: "4px 0",
                      }}
                    ></div>
                  )}
                  <span
                    className="naesil-btn-val small-text"
                    style={{
                      color:
                        userStats.avatarSettings.weapon !== "없음"
                          ? "var(--text-gold)"
                          : "#888",
                    }}
                  >
                    {userStats.avatarSettings.weapon === "없음" ? (
                      "무기압 X"
                    ) : (
                      <TextFormatter text={userStats.avatarSettings.weapon} />
                    )}
                  </span>
                </div>
              </div>

              {/* 1-4. 마스터 계약 */}
              <div
                className={`naesil-btn contract ${
                  userStats.training.masterContract ? "active" : ""
                }`}
                onClick={() =>
                  updateStat(
                    "training",
                    "masterContract",
                    !userStats.training.masterContract
                  )
                }
                style={{ height: "auto", minHeight: "60px", padding: "10px" }}
              >
                <img
                  src={`${IMAGE_BASE_URL}/icons/마스터계약.png`}
                  className="naesil-btn-img"
                  alt="계약"
                  onError={(e) => (e.target.src = PLACEHOLDER_IMG)}
                />
                <div className="naesil-btn-info">
                  <span className="naesil-btn-label">마스터 계약</span>
                  <span className="naesil-btn-val small-text">
                    {userStats.training.masterContract ? "적용 중" : "미적용"}
                  </span>
                </div>
              </div>
            </div>

            {/* 2. 스킬 설정 타이틀 (여기가 중요! 위에 중복된 '내실 설정' 없앰) */}
            <div className="panel-title" style={{ marginTop: "20px" }}>
              스킬 설정
            </div>

            <div className="naesil-control-box">
              <div
                className="naesil-btn"
                onClick={() => setActiveModal({ type: "SKILL_TREE" })}
              >
                <img
                  src={`${IMAGE_BASE_URL}/icons/스킬트리.png`}
                  className="naesil-btn-img"
                  alt="스킬"
                  onError={(e) => (e.target.src = PLACEHOLDER_IMG)}
                />
                <div className="naesil-btn-info">
                  <span className="naesil-btn-label">스킬트리</span>
                  <span
                    className="naesil-btn-val small-text"
                    style={{ color: "var(--text-gold)" }}
                  >
                    설정하기
                  </span>
                </div>
              </div>
            </div>
            {/* ★★★ [NEW] 데미지 설정 (초심플 라디오 버튼 스타일) ★★★ */}
            <div
              className="panel-title"
              style={{ marginTop: "15px", marginBottom: "5px" }}
            >
              데미지 설정
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "4px", // 줄 간격 최소화
                padding: "0 5px", // 약간의 들여쓰기
              }}
            >
              {[
                { key: "counter", label: "카운터 공격" },
                { key: "backAttack", label: "백어택" },
                { key: "potion", label: "투신의 함성 포션" },
              ].map((option) => {
                const isActive = userStats.damageOptions?.[option.key];

                return (
                  <div
                    key={option.key}
                    onClick={() =>
                      updateStat("damageOptions", option.key, !isActive)
                    }
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      cursor: "pointer",
                      padding: "2px 0", // 터치 영역 확보
                    }}
                  >
                    {/* 1. 라디오 버튼 모양 (동그라미) */}
                    <div
                      style={{
                        width: "14px",
                        height: "14px",
                        borderRadius: "50%",
                        border: isActive
                          ? "1px solid #ffd700"
                          : "1px solid #666",
                        background: isActive
                          ? "rgba(255, 215, 0, 0.1)"
                          : "transparent",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0, // 찌그러짐 방지
                      }}
                    >
                      {/* 활성화 시 가운데 점 */}
                      {isActive && (
                        <div
                          style={{
                            width: "8px",
                            height: "8px",
                            borderRadius: "50%",
                            background: "#ffd700",
                          }}
                        />
                      )}
                    </div>

                    {/* 2. 텍스트 라벨 */}
                    <span
                      style={{
                        fontSize: "0.8rem", // 글자 크기 작게
                        color: isActive ? "#ffd700" : "#aaa", // 활성화 시 노란색
                        letterSpacing: "-0.5px",
                      }}
                    >
                      {option.label}
                    </span>
                  </div>
                );
              })}
              {/* 2. 구분선 */}
              <div
                style={{
                  width: "100%",
                  height: "1px",
                  background: "rgba(255,255,255,0.1)",
                  margin: "6px 0",
                }}
              ></div>

              {/* 3. 적 레벨 설정 (이곳으로 이사 옴!) */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span style={{ fontSize: "0.8rem", color: "#aaa" }}>
                  적 레벨 설정
                </span>

                <div
                  style={{ display: "flex", alignItems: "center", gap: "4px" }}
                >
                  <span
                    style={{
                      fontSize: "0.7rem",
                      color: "var(--text-gold)",
                      fontWeight: "bold",
                    }}
                  >
                    LV.
                  </span>
                  <input
                    type="number"
                    className={isEnemyLevelShaking ? "shake-box" : ""}
                    value={enemyLevel}
                    onChange={(e) => {
                      const valStr = e.target.value;
                      if (valStr === "") {
                        setEnemyLevel("");
                        return;
                      }
                      const val = Number(valStr);
                      if (val > 200) {
                        setIsEnemyLevelShaking(true);
                        setTimeout(() => setIsEnemyLevelShaking(false), 300);
                        setEnemyLevel(200);
                        return;
                      }
                      setEnemyLevel(Math.max(0, val));
                    }}
                    onBlur={(e) => {
                      if (!e.target.value) setEnemyLevel(85);
                    }}
                    style={{
                      width: "40px",
                      height: "24px", // 사이드바에 맞게 높이 조절
                      background: "#0a0a0a",
                      border: "1px solid #444",
                      borderRadius: "4px", // 둥근 사각형으로 변경 (공간 효율)
                      color: "#fff",
                      fontWeight: "bold",
                      textAlign: "center",
                      fontSize: "0.9rem",
                      outline: "none",
                      padding: 0,
                    }}
                  />
                  {/* 스피너 제거 스타일 */}
                  <style>{`input[type=number]::-webkit-inner-spin-button, input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }`}</style>
                </div>
              </div>
            </div>
          </div>

          {/* 2. 장비 컬럼 (좌) */}
          <div className="equip-column">
            {["머리어깨", "상의", "하의", "벨트", "신발"].map((slot) => (
              <GearSlotCard
                key={slot} // 리스트 렌더링 필수!
                slot={slot}
                userStats={userStats}
                onOpenModal={handleSlotAction}
                onMouseEnter={handleItemMouseEnter}
                onMouseLeave={handleItemMouseLeave}
                setActiveModal={setActiveModal}
                setEditBuffer={setEditBuffer}
                setWeaponFilter={setWeaponFilter}
                handleItemMouseEnter={handleItemMouseEnter}
                handleItemMouseLeave={handleItemMouseLeave}
              />
            ))}
          </div>

          {/* 3. 캐릭터 스테이지 (중앙) */}
          <div className="char-stage-center">
            <div
              className="char-control-bar"
              // ★ [수정] alignItems: "center"를 추가하여 버튼이 길어지는 것을 방지
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                flexWrap: "wrap",
              }}
            >
              <button
                className="char-btn"
                onClick={() => setActiveModal({ type: "JOB_SELECTOR" })}
              >
                {userStats.character.baseJob || "직업군 선택"}
              </button>
              <button
                className="char-btn"
                style={{
                  opacity: userStats.character.baseJob ? 1 : 0.5,
                  cursor: userStats.character.baseJob
                    ? "pointer"
                    : "not-allowed",
                }}
                onClick={() =>
                  userStats.character.baseJob &&
                  setActiveModal({ type: "CLASS_SELECTOR" })
                }
              >
                {userStats.character.subJob || "전직 선택"}
              </button>

              {/* ★ [Update] 캐릭터 레벨 직관 입력창 (Input Field) */}
              {userStats.character.baseJob && (
                <div className="char-level-control">
                  <span className="char-level-title">LEVEL</span>
                  <input
                    type="number"
                    className={`char-level-input ${
                      isLevelShaking ? "shake-box" : ""
                    }`}
                    value={userStats.character.level || ""} // 0이나 빈값이면 비워둠
                    onChange={(e) => {
                      const valStr = e.target.value;

                      // 1. 다 지웠을 때 (빈칸 허용)
                      if (valStr === "") {
                        updateStat("character", "level", "");
                        return;
                      }

                      const val = Number(valStr);
                      const MAX_LV = 85; // 만렙 설정

                      // 2. 최대 레벨 초과 시 (흔들림 효과)
                      if (val > MAX_LV) {
                        setIsLevelShaking(true);
                        setTimeout(() => setIsLevelShaking(false), 300); // 0.3초 후 해제

                        // 강제로 만렙으로 고정
                        updateStat("character", "level", MAX_LV);
                        return;
                      }

                      // 3. 정상 입력
                      updateStat("character", "level", val);
                    }}
                    onBlur={(e) => {
                      // 포커스 나갈 때 비어있거나 0이면 기본값(1 or 85)으로 복구
                      if (!e.target.value || Number(e.target.value) <= 0) {
                        updateStat("character", "level", 85);
                      }
                    }}
                  />
                </div>
              )}

              {/* 닉네임 입력 UI */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  marginLeft: "12px",
                }}
              >
                <span
                  style={{
                    fontSize: "0.6rem",
                    color: "#aaa",
                    fontWeight: "bold",
                    marginBottom: "2px",
                  }}
                >
                  닉네임
                </span>
                <input
                  type="text"
                  value={userStats.character.nickname || ""}
                  onChange={(e) =>
                    setUserStats({
                      ...userStats,
                      character: {
                        ...userStats.character,
                        nickname: e.target.value,
                      },
                    })
                  }
                  placeholder="이름"
                  style={{
                    width: "80px",
                    height: "26px",
                    background: "#222",
                    border: "1px solid #444",
                    borderRadius: "4px",
                    color: "#fff",
                    fontSize: "0.8rem",
                    textAlign: "center",
                    outline: "none",
                  }}
                />
              </div>
            </div>
            <div className="char-illust-box">
              {subJob && (
                <img
                  key={subJob}
                  src={`${IMAGE_BASE_URL}/characters/2ndillust/${subJob}.png`}
                  className="char-illust-img"
                  alt={subJob}
                  style={{ display: subJob ? "block" : "none" }}
                />
              )}
            </div>
            <div className="naesil-row">
              {["오라", "칭호", "크리쳐", "아티팩트"].map((slot) => (
                <GearSlotCard
                  key={slot}
                  slot={slot}
                  userStats={userStats}
                  setActiveModal={setActiveModal}
                  setEditBuffer={setEditBuffer}
                  setWeaponFilter={setWeaponFilter}
                  onOpenModal={handleSlotAction}
                  onMouseEnter={handleItemMouseEnter}
                  onMouseLeave={handleItemMouseLeave}
                  handleItemMouseEnter={handleItemMouseEnter}
                  handleItemMouseLeave={handleItemMouseLeave}
                />
              ))}
            </div>
          </div>

          {/* 4. 장비 컬럼 (우) */}
          <div className="equip-column right">
            <div className="equip-group-vertical">
              {/* 무기 (단독) */}
              <GearSlotCard
                slot="무기"
                userStats={userStats}
                setActiveModal={setActiveModal}
                setEditBuffer={setEditBuffer}
                setWeaponFilter={setWeaponFilter}
                onOpenModal={handleSlotAction}
                onMouseEnter={handleItemMouseEnter}
                onMouseLeave={handleItemMouseLeave}
                handleItemMouseEnter={handleItemMouseEnter}
                handleItemMouseLeave={handleItemMouseLeave}
              />

              {/* 악세서리 (반복) */}
              {["팔찌", "목걸이", "반지"].map((slot) => (
                <GearSlotCard
                  key={slot}
                  slot={slot}
                  userStats={userStats}
                  setActiveModal={setActiveModal}
                  setEditBuffer={setEditBuffer}
                  setWeaponFilter={setWeaponFilter}
                  onOpenModal={handleSlotAction}
                  onMouseEnter={handleItemMouseEnter}
                  onMouseLeave={handleItemMouseLeave}
                  handleItemMouseEnter={handleItemMouseEnter}
                  handleItemMouseLeave={handleItemMouseLeave}
                />
              ))}
            </div>

            <div className="equip-group-vertical">
              {/* 특수장비 (반복) */}
              {["보조장비", "마법석", "귀걸이"].map((slot) => (
                <GearSlotCard
                  key={slot}
                  slot={slot}
                  userStats={userStats}
                  setActiveModal={setActiveModal}
                  setEditBuffer={setEditBuffer}
                  setWeaponFilter={setWeaponFilter}
                  onOpenModal={handleSlotAction}
                  onMouseEnter={handleItemMouseEnter}
                  onMouseLeave={handleItemMouseLeave}
                  handleItemMouseEnter={handleItemMouseEnter}
                  handleItemMouseLeave={handleItemMouseLeave}
                />
              ))}
            </div>
          </div>

          {/* ★ [New] 5. 우측 세트 효과 패널 (최종 Ver: setCode 기반 연결) */}
          <div className="set-effect-column">
            <div
              className="panel-title"
              style={{
                textAlign: "right",
                paddingRight: 5,
                paddingLeft: 0,
                borderLeft: "none",
                borderRight: "3px solid var(--text-gold)",
              }}
            >
              세트 효과
            </div>

            {/* [1] 방어구 세트 */}
            <div className="set-group-box">
              <div className="set-group-label">방어구</div>
              {activeSets?.armor?.length > 0 ? (
                activeSets.armor.map((set, i) => {
                  // 1순위: 착용 중인 아이템 (Active 유도)
                  let targetItem = findEquippedSetItem(set);

                  // 2순위: 못 찾으면 DB 검색 (Fallback)
                  if (!targetItem) {
                    // 이름 매칭 시 3세트/5세트 효과 텍스트 고려
                    targetItem = GEAR_DB.find(
                      (item) =>
                        item.stats?.setCode == set.setCode &&
                        item.slot === `${set.count}세트 효과`
                    );
                  }

                  return (
                    <div
                      key={i}
                      className="active-set-item"
                      style={{ cursor: "help" }}
                      onMouseEnter={(e) => {
                        if (targetItem)
                          handleItemMouseEnter(targetItem, e, null, {
                            onlySetEffect: true,
                          });
                      }}
                      onMouseLeave={handleItemMouseLeave}
                    >
                      {set.prefix && (
                        <span
                          className={`set-name-prefix ${
                            set.prefix === "각오"
                              ? "prefix-pink"
                              : "prefix-cyan"
                          }`}
                        >
                          [{set.prefix}]{" "}
                        </span>
                      )}
                      <span className="set-name-base">{set.name}</span>
                      <span
                        style={{
                          color: "var(--text-gold)",
                          fontSize: "0.7rem",
                          marginLeft: "4px",
                        }}
                      >
                        ({set.count})
                      </span>
                    </div>
                  );
                })
              ) : (
                <div
                  style={{
                    textAlign: "center",
                    color: "#444",
                    fontSize: "0.8rem",
                  }}
                >
                  -
                </div>
              )}
            </div>

            {/* [2] 장신구 세트 */}
            <div className="set-group-box">
              <div className="set-group-label">장신구</div>
              {activeSets?.accessory?.length > 0 ? (
                activeSets.accessory.map((set, i) => {
                  let targetItem = findEquippedSetItem(set);
                  if (!targetItem) {
                    targetItem = GEAR_DB.find(
                      (item) =>
                        item.stats?.setCode == set.setCode &&
                        item.slot === `${set.count}세트 효과`
                    );
                  }
                  return (
                    <div
                      key={i}
                      className="active-set-item"
                      style={{ cursor: "help" }}
                      onMouseEnter={(e) => {
                        if (targetItem)
                          handleItemMouseEnter(targetItem, e, null, {
                            onlySetEffect: true,
                          });
                      }}
                      onMouseLeave={handleItemMouseLeave}
                    >
                      {set.prefix && (
                        <span className="set-name-prefix prefix-cyan">
                          [{set.prefix}]{" "}
                        </span>
                      )}
                      <span className="set-name-base">{set.name}</span>
                      <span
                        style={{
                          color: "var(--text-gold)",
                          fontSize: "0.7rem",
                          marginLeft: "4px",
                        }}
                      >
                        ({set.count})
                      </span>
                    </div>
                  );
                })
              ) : (
                <div
                  style={{
                    textAlign: "center",
                    color: "#444",
                    fontSize: "0.8rem",
                  }}
                >
                  -
                </div>
              )}
            </div>

            {/* [3] 특수장비 세트 */}
            <div className="set-group-box">
              <div className="set-group-label">특수장비</div>
              {activeSets?.special?.length > 0 ? (
                activeSets.special.map((set, i) => {
                  let targetItem = findEquippedSetItem(set);
                  if (!targetItem) {
                    targetItem = GEAR_DB.find(
                      (item) =>
                        item.stats?.setCode == set.setCode &&
                        item.slot === `${set.count}세트 효과`
                    );
                  }
                  return (
                    <div
                      key={i}
                      className="active-set-item"
                      style={{ cursor: "help" }}
                      onMouseEnter={(e) => {
                        if (targetItem)
                          handleItemMouseEnter(targetItem, e, null, {
                            onlySetEffect: true,
                          });
                      }}
                      onMouseLeave={handleItemMouseLeave}
                    >
                      {set.prefix && (
                        <span className="set-name-prefix prefix-cyan">
                          [{set.prefix}]{" "}
                        </span>
                      )}
                      <span className="set-name-base">{set.name}</span>
                      <span
                        style={{
                          color: "var(--text-gold)",
                          fontSize: "0.7rem",
                          marginLeft: "4px",
                        }}
                      >
                        ({set.count})
                      </span>
                    </div>
                  );
                })
              ) : (
                <div
                  style={{
                    textAlign: "center",
                    color: "#444",
                    fontSize: "0.8rem",
                  }}
                >
                  -
                </div>
              )}
            </div>
            {/* ---------------------------------------------------------- */}
            {/* ★★★ [NEW] 고유 효과 패널 (UI 색상 + 숨김 버그 수정) ★★★ */}
            {/* ---------------------------------------------------------- */}
            {(() => {
              const { subJob } = userStats.character || {};
              const gear = userStats.gear || userStats.equipment || {};

              // 1. 활성화된 슬롯 찾기
              const activeSlots = [];

              // (1) 무기 체크: itemId가 있어야 진짜 착용한 것!
              // (기존에는 객체만 있어도({}) true로 인식해서 빈 껍데기가 떴던 것입니다)
              if (gear["무기"] && gear["무기"].itemId) {
                activeSlots.push({ slot: "무기", type: "무기" });
              }

              // (2) 익시드 부위 체크
              ["상의", "팔찌", "귀걸이"].forEach((slot) => {
                const item = gear[slot];
                if (
                  item &&
                  item.itemId && // 아이템이 있고
                  item.grade &&
                  (item.grade.includes("exceed") ||
                    item.grade.includes("익시드")) // 등급 확인
                ) {
                  activeSlots.push({ slot: slot, type: "익시드" });
                }
              });

              if (activeSlots.length === 0) return null;

              // ★ 옵션별 색상 지정 헬퍼 함수
              const getOptionColor = (name) => {
                const n = name.trim();
                if (["이상", "선명"].includes(n)) return "#00ff00"; // 녹색
                if (["선봉", "분쇄"].includes(n)) return "#ff3333"; // 빨간색
                if (["의지", "광채"].includes(n)) return "#00bfff"; // 파란색
                if (["강타"].includes(n)) return "#cd853f"; // 토색 (Peru Color)
                return "#ffd700"; // 기본 노란색
              };

              return (
                <div className="set-effect-box" style={{ marginTop: "15px" }}>
                  <div className="set-effect-title">
                    고유 효과{" "}
                    <span
                      style={{
                        fontSize: "0.7rem",
                        color: "#888",
                        fontWeight: "normal",
                      }}
                    >
                      | {subJob || "직업선택필요"}
                    </span>
                  </div>

                  <div className="set-list">
                    {activeSlots.map(({ slot, type }) => {
                      const options = uniqueEffectDb.filter(
                        (dbItem) =>
                          dbItem.type === type && dbItem.job === subJob
                      );

                      if (options.length === 0) return null;

                      // 현재 선택된 값
                      const currentVal = userStats.uniqueEffects?.[slot] || "";

                      return (
                        <div key={slot} style={{ marginBottom: "10px" }}>
                          <div
                            style={{
                              fontSize: "0.75rem",
                              color: "#aaa",
                              marginBottom: "4px",
                            }}
                          >
                            {slot} ({type})
                          </div>

                          {/* 커스텀 스타일 적용을 위해 select의 color를 동적으로 변경 */}
                          <select
                            className="unique-effect-select"
                            value={currentVal}
                            onChange={(e) => {
                              const val = e.target.value;
                              setUserStats((prev) => ({
                                ...prev,
                                uniqueEffects: {
                                  ...(prev.uniqueEffects || {}),
                                  [slot]: val,
                                },
                              }));
                            }}
                            style={{
                              width: "100%",
                              padding: "8px",
                              backgroundColor: "#111",
                              // 선택된 값에 따라 글자색 변경
                              color: currentVal
                                ? getOptionColor(currentVal)
                                : "#ddd",
                              border: "1px solid #444",
                              borderRadius: "4px",
                              fontSize: "0.85rem",
                              fontWeight: "bold",
                              outline: "none",
                              cursor: "pointer",
                            }}
                          >
                            <option value="" style={{ color: "#ddd" }}>
                              옵션 선택 안함
                            </option>
                            {options.map((opt, idx) => (
                              <option
                                key={idx}
                                value={opt.name}
                                style={{
                                  color: getOptionColor(opt.name),
                                  fontWeight: "bold",
                                }} // 드롭다운 펼쳤을 때 색상
                              >
                                {opt.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>{" "}
        {/* 상단 섹션 끝 */}
        {/* ★ [New] 하단 종합 능력치 패널 */}
        {isDataLoaded && finalStats && Object.keys(finalStats).length > 0 && (
          <BottomStatPanel
            finalStats={finalStats}
            totalGearPoint={totalGearPoint}
            enemyLevel={enemyLevel}
            userStats={userStats}
            finalDamageInfo={finalDamageInfo}
            setStatDetailModal={setStatDetailModal}
            handleStatHover={handleStatHover}
            handleStatMove={handleStatMove}
            handleStatLeave={handleStatLeave}
          />
        )}
        <div style={{ height: "80px" }}></div>
        <footer
          style={{
            position: "fixed", // ★ 화면 맨 아래에 고정 (스크롤 상관없음)
            bottom: 0,
            left: 0,
            width: "100%", // 가로 꽉 채우기
            textAlign: "center",
            padding: "10px 0", // 적당한 여백
            color: "#555",
            fontSize: "0.7rem",
            background: "rgba(17, 17, 17, 0.95)", // 배경을 깔아서 뒤에 글씨가 안 겹치게
            borderTop: "1px solid #222",
            zIndex: 99999, // ★ 모든 팝업/모달보다 위에 뜨도록 설정
          }}
        >
          Copyright © 2025. All rights reserved.
        </footer>
      </div>
    );
  };

  // 3. 데이터 로딩 중일 때 보여줄 화면 (스플래시 스크린)
  if (!isDataLoaded) {
    return (
      <div
        style={{
          height: "100vh",
          background: "#050505",
          color: "#ffcc00",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "20px",
        }}
      >
        <div style={{ fontSize: "2rem", fontWeight: "bold" }}>MODAM</div>
        <div>서버에서 최신 데이터를 불러오고 있습니다...</div>
        {/* 여기에 로딩바 애니메이션 등을 넣으면 더 좋음 */}
      </div>
    );
  }

  const renderUnequipConfirmModal = () => {
    if (!unequipTarget) return null;

    const confirmUnequip = () => {
      setUserStats((prev) => {
        const next = JSON.parse(JSON.stringify(prev)); // Deep copy
        const slot = unequipTarget;

        // 1. 장비 정보 초기화
        next.equipment[slot] = {
          itemId: 0,
          setName: "선택 안함",
          grade: "일반",
        };

        // 2. 익시드 옵션 초기화
        if (EXCEED_SLOTS.includes(slot)) next.uniqueEffects[slot] = "선택 안함";

        // 3. 대장간 옵션 전체 초기화
        next.reinforce[slot] = 0;
        if (next.polish) next.polish[slot] = 0;
        next.enchant[slot] = "선택 안함";
        next.magic_unique[slot] = "선택 안함";
        next.magic_common[slot] = "선택 안함";

        // 엠블렘 초기화 (빈 배열로)
        if (next.emblem) next.emblem[slot] = [];

        return next;
      });

      // 모달 및 바텀시트 모두 닫기
      setActiveModal({ type: null, slot: null });
      setUnequipTarget(null);
    };

    return (
      <div
        className="item-picker-modal"
        style={{ zIndex: 60000 }}
        onClick={() => setUnequipTarget(null)}
      >
        <div
          className="alert-modal-content"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="alert-message">
            ⚠️ <br />
            <span style={{ color: "#ff5a6a", fontWeight: "900" }}>
              {unequipTarget}
            </span>{" "}
            장비를 해제하시겠습니까?
            <br />
            <span
              style={{
                fontSize: "0.85rem",
                color: "#aaa",
                fontWeight: "normal",
                marginTop: "8px",
                display: "block",
              }}
            >
              강화, 마법부여 등 <br />
              모든 대장간 옵션이 초기화됩니다.
            </span>
          </div>
          <div
            style={{
              display: "flex",
              gap: "10px",
              marginTop: "15px",
              width: "100%",
            }}
          >
            <button
              className="alert-btn"
              style={{
                background: "#333",
                color: "#ccc",
                flex: 1,
                border: "1px solid #555",
              }}
              onClick={() => setUnequipTarget(null)}
            >
              취소
            </button>
            <button
              className="alert-btn"
              style={{
                background: "#2a1515",
                color: "#ff6b6b",
                flex: 1,
                border: "1px solid #5a2525",
              }}
              onClick={confirmUnequip}
            >
              해제
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      style={{
        backgroundColor: "#0d0d0d",
        minHeight: "100vh",
        color: "#dcdcdc",
      }}
      onMouseMove={handleItemMouseMove}
    >
      {/* ========================================= */}
      {/* [1] 전역 모달 및 툴팁 영역 (기존 코드 유지) */}
      {/* ========================================= */}
      <RichTooltip tooltipData={tooltipData} activeSets={activeSets} />
      {renderSimpleTooltip()}

      {/* 아이템 피커 모달 */}
      {activeModal.type && (
        <ItemPickerSheet
          activeModal={activeModal}
          close={() => {
            setActiveModal({ type: null, slot: null });
            setSearchQuery("");
            setSpecialPickerStep(0);
            setSelectedSpecialSet(null);
          }}
          userStats={userStats}
          handleGearUpdate={handleGearUpdate}
          setUnequipTarget={setUnequipTarget}
          weaponFilter={weaponFilter}
          setWeaponFilter={setWeaponFilter}
          specialPickerStep={specialPickerStep}
          setSpecialPickerStep={setSpecialPickerStep}
          selectedSpecialSet={selectedSpecialSet}
          setSelectedSpecialSet={setSelectedSpecialSet}
          handleItemMouseEnter={handleItemMouseEnter}
          handleItemMouseLeave={handleItemMouseLeave}
          updateStat={updateStat}
          setEditBuffer={setEditBuffer}
          editBuffer={editBuffer}
        />
      )}

      {/* 내부 설정 모달들 */}
      <InnerModalManager
        activeModal={activeModal}
        setActiveModal={setActiveModal}
        userStats={userStats}
        setUserStats={setUserStats}
        editBuffer={editBuffer}
        setEditBuffer={setEditBuffer}
        updateStat={updateStat}
        finalStats={finalStats}
      />
      {renderUnequipConfirmModal()}

      {/* 상세 스탯 모달 */}
      {statDetailModal && (
        <div
          className="item-picker-modal"
          onClick={() => setStatDetailModal(null)}
          style={{ zIndex: 50000 }}
        >
          <div
            className="alert-modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ width: "320px", padding: "0", overflow: "hidden" }}
          >
            <div
              style={{
                background: "#222",
                padding: "15px",
                borderBottom: "1px solid #444",
                textAlign: "center",
                fontWeight: "bold",
                fontSize: "1.1rem",
              }}
            >
              {statDetailModal.title} 상세
            </div>
            <div
              style={{ maxHeight: "400px", overflowY: "auto", padding: "15px" }}
            >
              {!statDetailModal.list || statDetailModal.list.length === 0 ? (
                <div style={{ textAlign: "center", color: "#666" }}>
                  내역이 없습니다.
                </div>
              ) : (
                statDetailModal.list
                  .sort((a, b) => b.value - a.value)
                  .map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: "8px",
                        borderBottom: "1px dashed #333",
                        paddingBottom: "4px",
                      }}
                    >
                      <span style={{ color: "#ccc" }}>{item.source}</span>
                      <span
                        style={{
                          color: "var(--text-gold)",
                          fontWeight: "bold",
                        }}
                      >
                        +
                        {statDetailModal.isPercent
                          ? Number(item.value).toFixed(1) + "%"
                          : item.value}
                      </span>
                    </div>
                  ))
              )}
            </div>
            <div
              style={{
                padding: "15px",
                borderTop: "1px solid #333",
                textAlign: "center",
              }}
            >
              <button
                className="action-btn btn-apply"
                onClick={() => setStatDetailModal(null)}
                style={{ width: "100%" }}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================= */}
      {/* [2] 헤더 영역 (로고 클릭 시 계산기로 이동) */}
      {/* ========================================= */}
      <header
        className="site-header"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "0 20px",
          height: "60px",
          borderBottom: "1px solid #333",
          background: "#000",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "30px" }}>
          <div
            className="logo-area"
            onClick={() => navigateTo("HOME")} // 로고 누르면 계산기로 복귀
            style={{
              fontSize: "1.2rem",
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            <span style={{ color: "#ffcc00" }}>MODAM</span> CALCULATOR
          </div>
        </div>

        {/* 로그인/프로필 버튼 영역 */}
        <div
          className="auth-buttons"
          style={{ display: "flex", alignItems: "center" }}
        >
          {session ? (
            <div className="user-info-area">
              <div
                className="user-profile"
                onClick={() => setIsProfileModalOpen(true)}
                style={{ cursor: "pointer" }}
              >
                <img
                  src={
                    session.user.user_metadata?.avatar_url ||
                    "https://via.placeholder.com/40"
                  }
                  alt="profile"
                  className="user-avatar"
                />
                <span className="user-name">
                  {userProfile ? userProfile.nickname : "모험가"}
                </span>
              </div>
              <button className="logout-btn" onClick={handleLogout}>
                로그아웃
              </button>
            </div>
          ) : (
            <button
              className="main-login-btn"
              onClick={() => setIsLoginModalOpen(true)}
            >
              로그인
            </button>
          )}
        </div>
      </header>

      {/* ========================================= */}
      {/* [3] GNB (Global Navigation Bar) - 메인 메뉴 */}
      {/* ========================================= */}
      <nav className="gnb">
        <button
          className={activeMenu === "BOARD" ? "active" : ""}
          onClick={() => {
            setActiveBoardTab(null); // ★ [추가] 탭을 '전체'로 초기화
            navigateTo("BOARD"); // 그 다음 게시판 화면으로 이동
          }}
        >
          게시판
        </button>
        <button
          className={activeMenu === "CALC" ? "active" : ""}
          onClick={() => navigateTo("CALC")}
        >
          데미지 계산기
        </button>
        <button
          className={activeMenu === "SIM" ? "active" : ""}
          onClick={() => navigateTo("SIM")}
        >
          시뮬레이터
        </button>
        <button
          className={activeMenu === "RANK" ? "active" : ""}
          onClick={() => navigateTo("RANK")}
        >
          직업 랭킹
        </button>
        <button
          className={activeMenu === "GAME" ? "active" : ""}
          onClick={() => navigateTo("GAME")}
        >
          미니 게임
        </button>
      </nav>

      {/* ========================================= */}
      {/* [4] 메인 컨텐츠 영역 (ActiveMenu에 따라 변경) */}
      {/* ========================================= */}
      <main>
        {activeMenu === "HOME" && (
          <Home
            setActivePage={navigateTo} // 메인 메뉴 이동용 (기존 그대로)
            // ★ [수정] 여기가 핵심입니다!
            // Home에게 "게시판 탭 바꾸는 리모컨(setActiveBoardTab)"을 쥐어줍니다.
            setBoardCategory={setActiveBoardTab}
          />
        )}
        {/* A. 게시판 화면 */}
        {activeMenu === "BOARD" && (
          <>
            {/* 게시판용 LNB (2-Depth) */}
            <div className="lnb-container">
              <div className="lnb-inner">
                {/* [1] 전체 게시판 버튼 */}
                <button
                  className={`lnb-tab ${
                    activeBoardTab === null ? "active" : ""
                  }`}
                  onClick={() => {
                    setActiveBoardTab(null);
                    // ★ 핵심: 카테고리 바꿀 때 id는 지워버림(null)!
                    updateURL({ category: null, id: null });
                  }}
                >
                  전체
                </button>

                {/* [2] 공지사항 버튼 */}
                <button
                  className={`lnb-tab ${
                    activeBoardTab === "NOTICE" ? "active" : ""
                  }`}
                  onClick={() => {
                    setActiveBoardTab("NOTICE");
                    // ★ 핵심: 카테고리는 NOTICE로, id는 삭제!
                    updateURL({ category: "NOTICE", id: null });
                  }}
                >
                  공지사항
                </button>

                {/* [3] 공략 게시판 버튼 */}
                <button
                  className={`lnb-tab ${
                    activeBoardTab === "GUIDE" ? "active" : ""
                  }`}
                  onClick={() => {
                    setActiveBoardTab("GUIDE");
                    updateURL({ category: "GUIDE", id: null }); // ★ id 삭제
                  }}
                >
                  공략 게시판
                </button>

                {/* [4] 자유 게시판 버튼 */}
                <button
                  className={`lnb-tab ${
                    activeBoardTab === "FREE" ? "active" : ""
                  }`}
                  onClick={() => {
                    setActiveBoardTab("FREE");
                    updateURL({ category: "FREE", id: null }); // ★ id 삭제
                  }}
                >
                  자유게시판
                </button>
              </div>
            </div>

            {/* 게시판 컨텐츠 (category만 바꿔서 재사용) */}
            <BoardPage
              setActivePage={navigateTo} // ★ 이 줄이 빠져있어서 버튼이 안 눌렸습니다!
              userStats={userProfile}
              category={activeBoardTab}
            />
          </>
        )}

        {/* B. 데미지 계산기 화면 */}
        {activeMenu === "CALC" && (
          <>
            {/* 계산기용 LNB (2-Depth) */}
            <nav className="lnb-container">
              <div className="lnb-inner">
                <button
                  className={`lnb-tab ${activeTab === "MAIN" ? "active" : ""}`}
                  onClick={() => setActiveTab("MAIN")}
                >
                  메인
                </button>
                <button
                  className={`lnb-tab ${
                    activeTab === "ANALYSIS" ? "active" : ""
                  }`}
                  onClick={() => setActiveTab("ANALYSIS")}
                >
                  스킬 분석
                </button>
              </div>
            </nav>

            {/* 계산기 공통 요소 (프리셋바, 시스템 모달) */}
            <PresetBar
              presetList={presetList}
              currentPresetId={currentPresetId}
              isReordering={isReordering}
              setIsReordering={setIsReordering}
              onLoad={loadPreset}
              onSave={handleSaveClick}
              onDelete={handleDeleteClick}
              onShare={handleShareClick}
              onNew={handleNewClick}
              onImport={handleImportClick}
              onMove={movePreset}
            />
            <SystemModal
              systemModal={systemModal}
              setSystemModal={setSystemModal}
            />

            {/* 계산기 메인 로직 */}
            {activeTab === "MAIN" && renderCalculatorPage()}

            {/* 스킬 분석 로직 */}
            {activeTab === "ANALYSIS" && (
              <SkillAnalysisPage
                analysisData={analysisData}
                analysisSubTab={analysisSubTab}
                setAnalysisSubTab={setAnalysisSubTab}
              />
            )}
          </>
        )}

        {/* C. 준비 중인 화면들 */}
        {activeMenu === "SIM" && (
          <div className="coming-soon">🚧 시뮬레이터 (준비 중)</div>
        )}
        {activeMenu === "RANK" && (
          <div className="coming-soon">🏆 직업 랭킹 (준비 중)</div>
        )}
        {activeMenu === "GAME" && (
          <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
            {/* 세션이 있어야 저장 가능하므로 체크 */}
            {session ? (
              <PolishingGame userSession={session} />
            ) : (
              <div
                style={{ textAlign: "center", padding: "100px", color: "#888" }}
              >
                <div>로그인이 필요한 콘텐츠입니다.</div>
                <button
                  className="main-login-btn"
                  onClick={() => setIsLoginModalOpen(true)}
                  style={{ marginTop: "20px" }}
                >
                  로그인 하러가기
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ★ [핵심] 플로팅 버튼 (HOME 화면에서만 보임) */}
      {activeMenu === "HOME" && (
        <div className="floating-btn-container">
          {/* 1. 구글폼 링크 (새 창 열기) */}
          <a
            href="https://forms.gle/LJJ1h9gF8fczFGm86"
            target="_blank"
            rel="noopener noreferrer"
            className="floating-btn btn-bug"
          >
            <span className="floating-icon">🐛</span>
            버그제보
          </a>

          {/* 2. FAQ 모달 열기 */}
          <div
            className="floating-btn btn-faq"
            onClick={() => setIsFaqOpen(true)}
          >
            <span className="floating-icon">❓</span>
            FAQ
          </div>
        </div>
      )}

      {/* FAQ 모달 */}
      {isFaqOpen && (
        <FaqModal session={session} onClose={() => setIsFaqOpen(false)} />
      )}
      {/* ========================================= */}
      {/* [5] 기타 팝업 모달들 (로그인, 로그아웃, 프로필) */}
      {/* ========================================= */}
      {isLoginModalOpen && (
        <LoginModal onClose={() => setIsLoginModalOpen(false)} />
      )}

      {isLogoutModalOpen && (
        <MessageModal
          title="로그아웃 완료"
          message="안전하게 로그아웃 되었습니다."
          onClose={() => setIsLogoutModalOpen(false)}
        />
      )}

      {(isFirstTimeSetup || isProfileModalOpen) && (
        <ProfileModal
          session={session}
          isFirstTime={isFirstTimeSetup}
          onClose={() => {
            setIsFirstTimeSetup(false);
            setIsProfileModalOpen(false);
          }}
        />
      )}
    </div>
  );
}
