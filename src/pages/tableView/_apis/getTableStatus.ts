// tableView/_apis/getTableStatus.ts
export type TableStatusItem = {
  tableNumber: number;
  status: "activate" | "out" | string;
  activatedAt: string | null;
  remainingMinutes: number | null;
  expired: boolean;
};

export type TableStatusMessage =
  | { type: "TABLE_STATUS"; data: TableStatusItem[] }
  | { type: "ERROR"; code?: number; message?: string }
  | { type: string; [k: string]: any };

export type ConnectOptions = {
  token?: string; // localStorage("accessToken")에 저장된 순수 JWT 문자열
  url?: string; // 기본: 명세서의 정확한 형태(/로 끝남)
  autoReconnect?: boolean;
  maxRetries?: number;
  baseDelayMs?: number;
  onOpen?: () => void;
  onClose?: (ev: CloseEvent) => void;
  onError?: (ev: Event | Error) => void;
  onMessage?: (msg: TableStatusMessage) => void;
};

export type WSHandle = {
  sendRefresh: () => void;
  close: () => void;
  getSocket: () => WebSocket | null;
};

const DEFAULT_URL = "wss://api.test-d-order.store/ws/dashboard/";

// URL 끝에 '/'를 보장하고, 쿼리스트링은 ?token= 로만 구성
function buildUrlWithToken(baseUrl: string, token: string) {
  const stripped = baseUrl.replace(/\?.*$/, "");
  const withSlash = stripped.endsWith("/") ? stripped : stripped + "/";
  return `${withSlash}?token=${encodeURIComponent(token)}`;
}

/** ===== 콘솔 스타일 유틸 ===== */
const TAG = "%c[WS][dashboard]";
const TAG_STYLE =
  "background:#333;color:#fff;padding:2px 6px;border-radius:4px";
const OK = "%cOK";
const OK_STYLE = "color:#29a329;font-weight:700";
const WARN = "%cWARN";
const WARN_STYLE = "color:#ff9800;font-weight:700";
const ERR = "%cERR";
const ERR_STYLE = "color:#e53935;font-weight:700";
const INFO = "%cINFO";
const INFO_STYLE = "color:#0288d1;font-weight:700";

export function connectTableStatusWS(opts: ConnectOptions = {}): WSHandle {
  const {
    token = localStorage.getItem("accessToken") ?? "",
    url = DEFAULT_URL,
    autoReconnect = true,
    maxRetries = 5,
    baseDelayMs = 1000,
    onOpen,
    onClose,
    onError,
    onMessage,
  } = opts;

  if (!token) {
    const err = new Error("인증 토큰(accessToken)이 없습니다.");
    console.error(TAG, TAG_STYLE, ERR, ERR_STYLE, "토큰 누락으로 초기화 중단");
    onError?.(err);
    throw err;
  }

  let ws: WebSocket | null = null;
  let retries = 0;
  let manuallyClosed = false;
  let pingTimer: number | null = null;

  const withToken = buildUrlWithToken(url, token);
  console.log(TAG, TAG_STYLE, INFO, INFO_STYLE, "연결 시도:", withToken);

  const clearPing = () => {
    if (pingTimer !== null) {
      window.clearInterval(pingTimer);
      pingTimer = null;
    }
  };

  const startPing = () => {
    clearPing();
    pingTimer = window.setInterval(() => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(JSON.stringify({ type: "PING" }));
          console.debug(TAG, TAG_STYLE, "보냄:", { type: "PING" });
        } catch (e) {
          console.error(TAG, TAG_STYLE, ERR, ERR_STYLE, "PING 전송 실패:", e);
        }
      }
    }, 30_000);
  };

  const connect = () => {
    try {
      ws = new WebSocket(withToken);
    } catch (e) {
      console.error(TAG, TAG_STYLE, ERR, ERR_STYLE, "WebSocket 생성 실패:", e);
      onError?.(e as Error);
      return;
    }

    ws.onopen = () => {
      console.log(TAG, TAG_STYLE, OK, OK_STYLE, "연결 성공", {
        readyState: ws?.readyState,
        retries,
      });
      retries = 0;
      onOpen?.();
      try {
        const msg = { type: "REFRESH" };
        ws?.send(JSON.stringify(msg));
        console.debug(TAG, TAG_STYLE, "보냄:", msg);
      } catch (e) {
        console.error(
          TAG,
          TAG_STYLE,
          ERR,
          ERR_STYLE,
          "초기 REFRESH 전송 실패:",
          e
        );
        onError?.(e as Error);
      }
      startPing();
    };

    ws.onmessage = (ev: MessageEvent) => {
      try {
        const text = typeof ev.data === "string" ? ev.data : "";
        const preview = text.length > 300 ? text.slice(0, 300) + "..." : text;
        console.debug(TAG, TAG_STYLE, "수신 원문(preview):", preview);

        if (!text) return;
        const parsed: TableStatusMessage = JSON.parse(text);

        // 요약 로그
        if (parsed.type === "TABLE_STATUS") {
          const count = Array.isArray(parsed.data) ? parsed.data.length : 0;
          console.log(TAG, TAG_STYLE, OK, OK_STYLE, "TABLE_STATUS 수신", {
            count,
          });
        } else if (parsed.type === "ERROR") {
          console.warn(TAG, TAG_STYLE, WARN, WARN_STYLE, "서버 ERROR 수신", {
            code: (parsed as any).code,
            message: (parsed as any).message,
          });
        } else {
          console.info(
            TAG,
            TAG_STYLE,
            INFO,
            INFO_STYLE,
            "기타 메시지 수신",
            parsed
          );
        }

        onMessage?.(parsed);
      } catch (e) {
        console.error(
          TAG,
          TAG_STYLE,
          ERR,
          ERR_STYLE,
          "메시지 파싱 실패:",
          e,
          ev.data
        );
        onError?.(e as Error);
      }
    };

    ws.onerror = (ev: Event) => {
      console.error(TAG, TAG_STYLE, ERR, ERR_STYLE, "소켓 오류 이벤트 발생", {
        event: ev,
        readyState: ws?.readyState,
      });
      onError?.(ev);
    };

    ws.onclose = (ev: CloseEvent) => {
      clearPing();
      console.warn(TAG, TAG_STYLE, WARN, WARN_STYLE, "연결 종료", {
        code: ev.code,
        reason: ev.reason,
        wasClean: ev.wasClean,
        manuallyClosed,
        readyState: ws?.readyState,
      });
      onClose?.(ev);

      if (manuallyClosed) return;

      if (autoReconnect && retries < maxRetries) {
        const delay =
          baseDelayMs * Math.pow(2, retries) + Math.floor(Math.random() * 200);
        console.info(TAG, TAG_STYLE, INFO, INFO_STYLE, "재연결 예약", {
          attempt: retries + 1,
          maxRetries,
          delayMs: delay,
        });
        retries += 1;
        window.setTimeout(connect, delay);
      } else if (autoReconnect) {
        console.error(
          TAG,
          TAG_STYLE,
          ERR,
          ERR_STYLE,
          "재연결 포기 (최대 횟수 초과)"
        );
      }
    };
  };

  connect();

  const sendRefresh = () => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      const msg = { type: "REFRESH" };
      ws.send(JSON.stringify(msg));
      console.debug(TAG, TAG_STYLE, "보냄:", msg);
    } else {
      console.warn(
        TAG,
        TAG_STYLE,
        WARN,
        WARN_STYLE,
        "REFRESH 보류 - 소켓이 OPEN 아님",
        {
          readyState: ws?.readyState,
        }
      );
    }
  };

  const close = () => {
    manuallyClosed = true;
    clearPing();
    if (!ws) return;

    try {
      if (ws.readyState === WebSocket.OPEN) {
        // console.log(TAG, TAG_STYLE, INFO, INFO_STYLE, "클라이언트가 정상 종료 시도");
        ws.close(1000, "client-close");
      } else if (ws.readyState === WebSocket.CONNECTING) {
        // console.log(TAG, TAG_STYLE, INFO, INFO_STYLE, "CONNECTING 상태 - onopen 후 즉시 종료 예약");
        const toClose = ws;
        toClose.onopen = () => {
          try {
            toClose.close(1000, "client-close");
          } catch {}
        };
      }
    } catch (e) {
      // console.error(TAG, TAG_STYLE, ERR, ERR_STYLE, "close 처리 중 예외:", e);
    }
    ws = null;
  };

  const getSocket = () => ws;

  return { sendRefresh, close, getSocket };
}
