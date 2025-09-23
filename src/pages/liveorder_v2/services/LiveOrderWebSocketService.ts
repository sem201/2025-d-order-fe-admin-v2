// src/pages/liveorder_v2/services/LiveOrderService.ts
import { LiveOrderWebSocketMessage } from "../types";

// 스토어 상태를 업데이트할 콜백 함수 타입 정의
type UpdateStoreCallback = (message: LiveOrderWebSocketMessage) => void;

class LiveOrderWebSocketService {
  private ws: WebSocket | null = null;
  private readonly wsUrl: string;
  private updateStore: UpdateStoreCallback;

  constructor(accessToken: string, updateStore: UpdateStoreCallback) {
    this.wsUrl = `wss://api.test-d-order.store/ws/orders/?token=${accessToken}`;
    this.updateStore = updateStore;
  }

  public connect() {
    if (this.ws) {
      this.disconnect();
    }

    console.log("🚀 웹소켓 연결을 시도합니다...", this.wsUrl);
    this.ws = new WebSocket(this.wsUrl);

    // this.ws.onopen = () => {
    //   console.log("✅ 웹소켓 연결 성공!");
    // };

    this.ws.onmessage = (event) => {
      try {
        const message: LiveOrderWebSocketMessage = JSON.parse(event.data);
        this.updateStore(message);
      } catch (error) {
        console.error("🔴 메시지 파싱 중 오류 발생:", error);
      }
    };

    this.ws.onerror = (error) => {
      console.error("🔴 웹소켓 에러 발생:", error);
    };

    // this.ws.onclose = (event) => {
    //   if (event.wasClean) {
    //     console.log(
    //       `⚪️ 웹소켓 연결이 정상적으로 종료되었습니다. (코드: ${event.code})`
    //     );
    //   } else {
    //     console.warn(
    //       `⚫️ 웹소켓 연결이 비정상적으로 끊어졌습니다. (코드: ${event.code})`
    //     );
    //   }
    // };
  }

  public disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export default LiveOrderWebSocketService;
