import { useState, useEffect, useCallback } from "react";
import { supabase } from "../utils/supabaseClient";
import { initialState } from "../utils/data";

export const usePresetManager = (
  userStats,
  setUserStats,
  session,
  openAlert,
  setSystemModal
) => {
  const [presetList, setPresetList] = useState([]);
  const [currentPresetId, setCurrentPresetId] = useState(null);
  const [isReordering, setIsReordering] = useState(false); // 순서 변경 모드 상태 추가

  // 1. 목록 불러오기 (fetchPresets)
  const fetchPresets = useCallback(async (currentSession) => {
    const localData = JSON.parse(localStorage.getItem("modam_presets") || "[]");
    let list = localData.map((p) => ({
      ...p,
      type: "local",
      sort_order: p.sort_order || new Date(p.created_at).getTime(),
    }));

    if (currentSession) {
      const { data } = await supabase
        .from("presets")
        .select("*")
        .eq("user_id", currentSession.user.id) // ★ [추가] 내 아이디와 같은 것만!
        .order("sort_order", { ascending: true });
      if (data) list = [...data.map((p) => ({ ...p, type: "cloud" })), ...list];
    }
    list.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    setPresetList(list);
  }, []);

  // 초기 로드
  useEffect(() => {
    fetchPresets(session);
  }, [session, fetchPresets]);

  // 2. 신규 프리셋 (handleNewClick)
  const handleNewClick = () => {
    if (
      window.confirm("현재 작업 중인 내용이 초기화됩니다. 계속하시겠습니까?")
    ) {
      setCurrentPresetId(null);
      setUserStats(JSON.parse(JSON.stringify(initialState)));
      openAlert("새로운 세팅을 시작합니다.");
    }
  };

  // 3. 저장 프로세스 (savePresetProcess)
  const savePresetProcess = useCallback(
    async (name, mode) => {
      const saveData = JSON.parse(JSON.stringify(userStats));
      saveData.character.nickname = name;
      const newSortOrder = Date.now();

      if (session) {
        if (mode === "overwrite" && currentPresetId) {
          const { error } = await supabase
            .from("presets")
            .update({ data: saveData, name: name })
            .eq("id", currentPresetId);
          if (error) openAlert("실패: " + error.message);
          else openAlert("저장되었습니다!");
        } else {
          const { data, error } = await supabase
            .from("presets")
            .insert({
              user_id: session.user.id,
              name: name,
              data: saveData,
              sort_order: newSortOrder,
            })
            .select();
          if (!error) {
            openAlert("저장되었습니다!");
            if (data && data[0]) setCurrentPresetId(data[0].id);
          }
        }
      } else {
        const localData = JSON.parse(
          localStorage.getItem("modam_presets") || "[]"
        );
        let nextData = [...localData];
        if (mode === "overwrite" && currentPresetId) {
          nextData = localData.map((p) =>
            p.id === currentPresetId ? { ...p, name, data: saveData } : p
          );
        } else {
          const newId = `local_${Date.now()}`;
          nextData.push({
            id: newId,
            name,
            data: saveData,
            created_at: new Date().toISOString(),
            sort_order: newSortOrder,
          });
          setCurrentPresetId(newId);
        }
        localStorage.setItem("modam_presets", JSON.stringify(nextData));
        openAlert("저장되었습니다.");
      }
      fetchPresets(session);
    },
    [userStats, session, currentPresetId, fetchPresets, openAlert]
  );

  // 4. 저장 버튼 클릭 (handleSaveClick)
  const handleSaveClick = () => {
    const nick = userStats.character.nickname;
    if (!nick || nick === "모험가" || nick.trim() === "") {
      openAlert("저장하려면 먼저 캐릭터 '닉네임'을 입력해주세요.");
      return;
    }
    if (currentPresetId) {
      const currentPreset = presetList.find((p) => p.id === currentPresetId);
      setSystemModal({
        type: "SAVE_CHOICE",
        message: `[${currentPreset?.name}]에 덮어쓰시겠습니까?\n아니면 [${nick}] 이름으로 새로 만드시겠습니까?`,
        onConfirm: (choice) => {
          if (choice === "overwrite")
            savePresetProcess(currentPreset.name, "overwrite");
          else if (choice === "new") savePresetProcess(nick, "new");
        },
      });
    } else {
      savePresetProcess(nick, "new");
    }
  };

  // 5. 불러오기 (loadPreset)
  const loadPreset = (preset) => {
    setSystemModal({
      type: "CONFIRM",
      message: `[${preset.name || "프리셋"}] 세팅을 불러오시겠습니까?`,
      onConfirm: () => {
        const loadedData = JSON.parse(JSON.stringify(preset.data));
        setCurrentPresetId(preset.id);
        setUserStats(loadedData);
      },
    });
  };

  // 6. 삭제 (handleDeleteClick)
  const handleDeleteClick = async () => {
    if (!currentPresetId)
      return openAlert("삭제할 프리셋을 먼저 선택해주세요.");
    setSystemModal({
      type: "CONFIRM",
      message: "정말 삭제하시겠습니까?",
      onConfirm: async () => {
        if (String(currentPresetId).startsWith("local_")) {
          const localData = JSON.parse(
            localStorage.getItem("modam_presets") || "[]"
          );
          const nextData = localData.filter((p) => p.id !== currentPresetId);
          localStorage.setItem("modam_presets", JSON.stringify(nextData));
        } else {
          await supabase.from("presets").delete().eq("id", currentPresetId);
        }
        setCurrentPresetId(null);
        setUserStats(JSON.parse(JSON.stringify(initialState)));
        fetchPresets(session);
        openAlert("삭제되었습니다.");
      },
    });
  };

  // 7. 공유 (handleShareClick)
  const handleShareClick = () => {
    if (!currentPresetId)
      return openAlert("저장된 프리셋을 먼저 로드해주세요.");
    const shareUrl = `${window.location.origin}${window.location.pathname}?share_id=${currentPresetId}`;
    setSystemModal({
      type: "SHARE",
      message: "복사해서 공유하세요!",
      data: shareUrl,
    });
  };

  // 8. 링크로 불러오기 (handleImportClick)
  const loadSharedPreset = useCallback(
    async (id) => {
      const { data } = await supabase
        .from("presets")
        .select("*")
        .eq("id", id)
        .single();
      if (data) {
        setSystemModal({
          type: "CONFIRM",
          message: `공유된 세팅 [${data.name}]을 적용하시겠습니까?`,
          onConfirm: () => {
            setUserStats(JSON.parse(JSON.stringify(data.data)));
            setCurrentPresetId(null);
            window.history.replaceState(
              {},
              document.title,
              window.location.pathname
            );
          },
        });
      }
    },
    [setUserStats, setSystemModal]
  );

  const handleImportClick = () => {
    const url = prompt("공유받은 링크를 붙여넣으세요:");
    if (!url) return;
    const shareId = url.includes("share_id=")
      ? url.split("share_id=")[1]
      : url.trim();
    loadSharedPreset(shareId);
  };

  // 9. 순서 이동 (movePreset) - ★ 보내주신 고도화된 로직 적용
  const movePreset = async (index, direction) => {
    if (index + direction < 0 || index + direction >= presetList.length) return;
    const newList = [...presetList];
    const targetA = newList[index];
    const targetB = newList[index + direction];

    // 즉시 교체 (UX)
    newList[index] = targetB;
    newList[index + direction] = targetA;
    setPresetList(newList);

    const orderA = targetA.sort_order || 0;
    const orderB = targetB.sort_order || 0;

    // 데이터 동기화
    if (targetA.type === "cloud" && targetB.type === "cloud") {
      await supabase
        .from("presets")
        .update({ sort_order: orderB })
        .eq("id", targetA.id);
      await supabase
        .from("presets")
        .update({ sort_order: orderA })
        .eq("id", targetB.id);
    } else {
      const localData = JSON.parse(
        localStorage.getItem("modam_presets") || "[]"
      );
      const updateLocal = (item, newOrder) => {
        const idx = localData.findIndex((p) => p.id === item.id);
        if (idx !== -1) localData[idx].sort_order = newOrder;
      };
      updateLocal(targetA, orderB);
      updateLocal(targetB, orderA);
      localStorage.setItem("modam_presets", JSON.stringify(localData));

      if (targetA.type === "cloud")
        await supabase
          .from("presets")
          .update({ sort_order: orderB })
          .eq("id", targetA.id);
      if (targetB.type === "cloud")
        await supabase
          .from("presets")
          .update({ sort_order: orderA })
          .eq("id", targetB.id);
    }
    setTimeout(() => fetchPresets(session), 500);
  };

  return {
    presetList,
    setPresetList, // set도 같이 넘겨야 UI에서 직접 조작 가능
    currentPresetId,
    isReordering,
    setIsReordering, // 편집 모드 상태 추가
    handleNewClick,
    handleShareClick,
    handleSaveClick,
    movePreset,
    handleImportClick,
    handleDeleteClick,
    loadPreset,
    loadSharedPreset,
    fetchPresets,
  };
};
