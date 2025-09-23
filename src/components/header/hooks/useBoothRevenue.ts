// src/components/Header/hooks/useBoothRevenue.ts

import { useState, useEffect } from "react";
import BoothService from "@services/BoothService";

const useBoothRevenue = () => {
  const [boothName, setBoothName] = useState<string>("부스 로딩 중...");
  const [totalRevenues, setTotalRevenues] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  // 1. 부스 이름만 가져오는 useEffect
  useEffect(() => {
    const fetchBoothName = async () => {
      const response = await BoothService.getBoothRevenue();
      if (response.data) {
        setError(null);
        setBoothName(response.data.booth_name);
        // ❌ 여기서 매출(total_revenue)은 상태로 설정하지 않습니다.
      } else {
        setError(response.message);
        setBoothName("부스 정보 없음");
      }
    };

    fetchBoothName();
  }, []); // 이 useEffect는 마운트 시 한 번만 실행됩니다.

  // 2. 총매출만 웹소켓으로 처리하는 useEffect
  useEffect(() => {
    const accessToken = localStorage.getItem("accessToken");
    if (!accessToken) {
      setError("로그인이 필요합니다.");
      return;
    }

    const wsUrl = `wss://api.test-d-order.store/ws/revenue/?token=${accessToken}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      // console.log("✅ [REVENUE] 총매출 웹소켓 연결 성공!");
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);

        // 스냅샷 또는 업데이트 이벤트 발생 시 총매출 상태 업데이트
        if (
          message.type === "REVENUE_SNAPSHOT" ||
          message.type === "REVENUE_UPDATE"
        ) {
          setTotalRevenues(message.totalRevenue);
        }
      } catch (e) {
        console.error("🔴 [REVENUE] 메시지 파싱 중 오류 발생:", e);
      }
    };

    ws.onerror = (error) => {
      console.error("🔴 [REVENUE] 웹소켓 에러 발생:", error);
      setError("매출 실시간 업데이트 중 오류가 발생했습니다.");
    };

    ws.onclose = (_event) => {
      // console.log(
      //   `⚪️ [REVENUE] 웹소켓 연결이 종료되었습니다. 코드: ${event.code}`
      // );
    };

    // 컴포넌트 언마운트 시 웹소켓 연결 종료
    return () => {
      // console.log("🧹 [REVENUE] 총매출 웹소켓 연결을 종료합니다.");
      ws.close();
    };
  }, []); // 이 useEffect도 마운트 시 한 번만 실행됩니다.

  return { boothName, totalRevenues, error };
};

export default useBoothRevenue;
