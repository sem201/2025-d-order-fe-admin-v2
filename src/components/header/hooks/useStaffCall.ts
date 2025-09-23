// src/components/Header/hooks/useStaffCall.ts (새 파일)

import { useState, useEffect } from "react";
import { AxiosError } from "axios";
import { instance } from "@services/instance";
import bellSound from "@assets/sounds/bellsound.mp3";

// 필요한 인터페이스를 훅 파일 내부 또는 별도 types 파일로 관리할 수 있습니다.
interface Notification {
  id: number;
  message: string;
  time: string;
}

interface ApiCallStaff {
  tableNumber: number;
  createdAt: string;
}

export const useStaffCall = () => {
  // 1. 호출벨 관련 상태 관리
  const [liveNotice, setLiveNotice] = useState<string | null>(null);
  const [showLiveNotice, setShowLiveNotice] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [hasUnread, setHasUnread] = useState(false);

  // 2. 초기 알림 목록을 가져오는 로직 (GET API)
  useEffect(() => {
    const fetchInitialNotifications = async () => {
      try {
        const response = await instance.get<{
          status: string;
          data: ApiCallStaff[];
        }>("/api/v2/booth/staff-calls/");

        const fetchedNotifications: Notification[] = response.data.data.map(
          (item) => ({
            id: new Date(item.createdAt).getTime(),
            message: `${item.tableNumber}번 테이블에서 직원을 호출했습니다.`,
            time: new Date(item.createdAt).toLocaleTimeString("ko-KR"),
          })
        );

        setNotifications(fetchedNotifications.slice(0, 7));
      } catch (e) {
        const error = e as AxiosError;
        console.error("🔴 [GET] 초기 알림 기록 로딩 중 오류:", error.message);
      }
    };

    fetchInitialNotifications();
  }, []);

  // 3. 실시간 호출 알림을 처리하는 로직 (WebSocket)
  useEffect(() => {
    const accessToken = localStorage.getItem("accessToken");
    if (!accessToken) {
      return;
    }

    const wsUrl = `wss://api.test-d-order.store/ws/call/?token=${accessToken}`;
    const ws = new WebSocket(wsUrl);

    // ws.onopen = () => console.log("✅ [CALL] 직원 호출 웹소켓 연결 성공!");

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === "CALL_STAFF") {
          const noticeMessage = message.message;

          new Audio(bellSound).play();

          setLiveNotice(noticeMessage);
          setShowLiveNotice(true);
          setTimeout(() => setShowLiveNotice(false), 2000);

          const newNotification: Notification = {
            id: Date.now(),
            message: noticeMessage,
            time: new Date().toLocaleTimeString("ko-KR"),
          };

          setNotifications((prev) => [newNotification, ...prev].slice(0, 10));
          setHasUnread(true);
        }
      } catch (error) {
        console.error("🔴 [CALL] 메시지 처리 중 오류 발생:", error);
      }
    };

    ws.onerror = (error) => console.error("🔴 [CALL] 웹소켓 에러 발생:", error);
    // ws.onclose = () => console.log("⚪️ [CALL] 웹소켓 연결이 종료되었습니다.");

    return () => {
      ws.close();
    };
  }, []);

  // 4. 컴포넌트에서 호출할 '읽음' 처리 함수
  const markAsRead = () => {
    setHasUnread(false);
  };

  // 5. 컴포넌트에서 사용할 상태와 함수들을 반환
  return {
    liveNotice,
    showLiveNotice,
    notifications,
    hasUnread,
    markAsRead, // 함수도 함께 반환
  };
};
