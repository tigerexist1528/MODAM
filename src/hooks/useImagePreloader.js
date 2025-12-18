import { useEffect } from "react";

// 1. DB 및 리소스 (src/data.js)
import { WEAPON_DB, GEAR_DB } from "../data";

// 2. 유틸 데이터 (src/utils/data.js)
import {
  JOB_STRUCTURE,
  GET_ITEM_ICON_LOCAL,
  GET_JOB_ICON,
  PLACEHOLDER_IMG,
} from "../utils/data";

export const useImagePreloader = () => {
  useEffect(() => {
    // 우선순위 큐: 직업 아이콘 -> 내실 아이콘 -> 장비 아이콘 순서로 로딩
    const preloadQueue = async () => {
      const load = (src) => {
        return new Promise((resolve) => {
          const img = new Image();
          img.src = src;
          img.onload = resolve;
          img.onerror = resolve; // 에러나도 다음으로 진행
        });
      };

      // 1. [Critical] 직업/전직 아이콘 (즉시 로딩)
      const jobIcons = [];
      Object.keys(JOB_STRUCTURE).forEach((job) => {
        jobIcons.push(GET_JOB_ICON("job", job));
        JOB_STRUCTURE[job].forEach((subJob) =>
          jobIcons.push(GET_JOB_ICON("class", subJob))
        );
      });
      await Promise.all(jobIcons.map((src) => load(src)));

      // 2. [High] 내실 및 로고 (100ms 뒤 로딩)
      setTimeout(async () => {
        await load(PLACEHOLDER_IMG);
        // 필요한 경우 내실 관련 아이콘도 추가
      }, 100);

      // 3. [Medium] 장비 아이콘 (배경에서 천천히 로딩)
      // 장비는 많으므로 청크(Chunk) 단위로 끊어서 로딩하여 UI 블락 방지
      const allItems = [...GEAR_DB, ...WEAPON_DB];
      const CHUNK_SIZE = 20;

      const loadChunk = (index) => {
        if (index >= allItems.length) return;

        const chunk = allItems.slice(index, index + CHUNK_SIZE);
        chunk.forEach((item) => {
          const slotFolder = item.slot || "weapon";
          const src = GET_ITEM_ICON_LOCAL(item.name, slotFolder);
          // 이미지 객체만 생성해두면 브라우저가 캐싱함 (await 안 함)
          new Image().src = src;
        });

        // 다음 청크는 프레임 여유가 있을 때 실행
        if (window.requestIdleCallback) {
          window.requestIdleCallback(() => loadChunk(index + CHUNK_SIZE));
        } else {
          setTimeout(() => loadChunk(index + CHUNK_SIZE), 50);
        }
      };

      // 장비 로딩 시작 (약간 딜레이 후)
      setTimeout(() => loadChunk(0), 500);
    };

    preloadQueue();
  }, []);
};
