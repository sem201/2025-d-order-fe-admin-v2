// src/pages/liveorder_v2/LiveOrderStore.ts

import { create } from "zustand";
import { devtools } from "zustand/middleware";
import {
  OrderItem,
  OrderStatus,
  LiveOrderWebSocketMessage,
  mapApiOrdersToOrderItems, // API 응답을 변환하는 헬퍼 함수 임포트
} from "./types";
import {
  updateOrderToCooked,
  updateOrderToServed,
  revertOrderStatus,
} from "./services/LiveOrderServiceV2";
import LiveOrderWebSocketService from "./services/LiveOrderWebSocketService";

export type OrderViewMode = "kitchen" | "serving";
const ANIMATION_DURATION = 1000; // 1초

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

interface LiveOrderState {
  orders: OrderItem[];
  menuList: string[];
  viewMode: OrderViewMode;
  fadingOutTables: Set<number>;
  webSocketService: LiveOrderWebSocketService | null;
  accessToken: string | null;
  pendingOrderUpdates: Set<number>; // 충돌 방지를 위한 '잠금' 상태

  setOrders: (orders: OrderItem[]) => void;
  setMenuList: (menuNames: string[]) => void;
  setViewMode: (mode: OrderViewMode) => void;
  updateOrderStatusWithAnimation: (
    orderId: number,
    newStatus: OrderStatus
  ) => void;
  // addNewOrders는 웹소켓 로직에 통합되어 삭제됨

  initializeWebSocket: (token: string) => void;
  disconnectWebSocket: () => void;
  reconnectWebSocket: () => void;
}

export const useLiveOrderStore = create<LiveOrderState>()(
  devtools((set, get) => ({
    orders: [],
    menuList: [],
    viewMode: "kitchen",
    fadingOutTables: new Set(),
    webSocketService: null,
    accessToken: null,
    pendingOrderUpdates: new Set(), // 잠금 Set 초기화

    setOrders: (orders) => set({ orders }),
    setMenuList: (menuNames) => set({ menuList: ["전체", ...menuNames] }),
    setViewMode: (mode) => set({ viewMode: mode }),

    updateOrderStatusWithAnimation: async (orderId, newStatus) => {
      // 1. 중복 클릭 방지
      if (get().pendingOrderUpdates.has(orderId)) {
        // console.log(`🟡 Order ${orderId} update is already in progress.`);
        return;
      }

      // ... 이 함수의 기존 로직은 변경되지 않았습니다 ...
      const targetOrder = get().orders.find((o) => o.id === orderId);
      if (!targetOrder) return;
      const currentStatus = targetOrder.status;
      try {
        // 2. '잠금' 시작
        set((state) => ({
          pendingOrderUpdates: new Set(state.pendingOrderUpdates).add(orderId),
        }));

        if (currentStatus === "pending" && newStatus === "cooked") {
          await updateOrderToCooked(orderId);
        } else if (currentStatus === "cooked" && newStatus === "served") {
          await updateOrderToServed(orderId);
        } else if (currentStatus === "served" && newStatus === "cooked") {
          await revertOrderStatus(orderId, "cooked");
        }

        if (newStatus === "served") {
          set((state) => ({
            orders: state.orders.map((order) =>
              order.id === orderId ? { ...order, isFadingOut: true } : order
            ),
          }));
          await delay(ANIMATION_DURATION);
          const ordersAfterItemServed = get().orders.map((order) =>
            order.id === orderId
              ? {
                  ...order,
                  status: "served" as OrderStatus,
                  isFadingOut: false,
                  servedAt: Date.now(),
                }
              : order
          );
          set({ orders: ordersAfterItemServed });

          // --- [수정] order_id 기준으로 그룹의 모든 주문이 served면 페이드아웃 후 제거 ---
          const orderGroupId = targetOrder.order_id;
          const groupOrders = get().orders.filter(
            (o) => o.order_id === orderGroupId
          );
          const isGroupFullyServed = groupOrders.every(
            (o) => o.status === "served"
          );
          if (isGroupFullyServed) {
            set((state) => ({
              fadingOutTables: new Set(state.fadingOutTables).add(orderGroupId),
            }));
            await delay(ANIMATION_DURATION);
            set((state) => {
              const newSet = new Set(state.fadingOutTables);
              newSet.delete(orderGroupId);
              return { fadingOutTables: newSet };
            });
          }
        } else {
          set({
            orders: get().orders.map((o) =>
              o.id === orderId ? { ...o, status: newStatus } : o
            ),
          });
        }
      } catch (error) {
        console.error(`🔴 주문 상태 변경 실패: ${error}`);
      } finally {
        // 🚨 [가장 중요한 수정] 작업이 성공하든 실패하든 반드시 잠금을 해제합니다.
        set((state) => {
          const newSet = new Set(state.pendingOrderUpdates);
          newSet.delete(orderId);
          return { pendingOrderUpdates: newSet };
        });
      }
    },

    // --- ✨ 웹소켓 액션 구현 (로직 수정) ---
    initializeWebSocket: (token: string) => {
      get().webSocketService?.disconnect();

      const updateStoreCallback = (message: LiveOrderWebSocketMessage) => {
        // message.data.orders가 없는 경우를 방어
        // if (!message.data?.orders) return;
        // ORDER_UPDATE 메시지에서 orders가 배열이 아닐 수도 있으므로 배열로 변환
        let apiOrders: any[] = [];
        if (message.type === "ORDER_UPDATE") {
          const data = message.data as any;
          // 새로운 주문 추가(여러 개): orders 배열로 오면 배열로 처리
          if (Array.isArray(data.orders)) {
            apiOrders = data.orders;
          }
          // 상태 변경(단일): 단일 객체로 오면 배열로 변환
          else if (data.ordermenu_id) {
            apiOrders = [data];
          }
        } else if (message.type === "ORDER_SNAPSHOT") {
          apiOrders = message.data.orders;
        }
        if (!apiOrders || apiOrders.length === 0) return;

        const incomingOrders = mapApiOrdersToOrderItems(apiOrders);

        // API 응답 데이터를 UI에서 사용하는 OrderItem[] 형태로 변환
        // const incomingOrders = mapApiOrdersToOrderItems(message.data.orders);

        if (message.type === "ORDER_SNAPSHOT") {
          // --- 📸 스냅샷: 모든 주문 데이터를 교체합니다. ---
          const sortedOrders = incomingOrders.sort(
            (a, b) =>
              new Date(a.created_at).getTime() -
              new Date(b.created_at).getTime()
          );
          set({ orders: sortedOrders });

          // 메뉴 리스트도 스냅샷 기준으로 새로고침
          const menuNames = [
            ...new Set(incomingOrders.map((o) => o.menu_name)),
          ];
          get().setMenuList(menuNames);
        } else if (message.type === "ORDER_UPDATE") {
          // --- 🔄 업데이트: 기존 주문 데이터에 변경사항을 병합합니다. ---

          set((state) => {
            const orderMap = new Map(
              state.orders.map((order) => [order.id, order])
            );
            const pendingUpdates = state.pendingOrderUpdates;
            incomingOrders.forEach((order) => {
              if (pendingUpdates.has(order.id)) return;
              // 기존 주문이면 병합, 없으면 추가
              if (orderMap.has(order.id)) {
                orderMap.set(order.id, { ...orderMap.get(order.id), ...order });
              } else {
                orderMap.set(order.id, order);
              }
            });
            const mergedOrders = Array.from(orderMap.values());
            const sortedOrders = mergedOrders.sort(
              (a, b) =>
                new Date(a.created_at).getTime() -
                new Date(b.created_at).getTime()
            );
            return { orders: sortedOrders };
          });
        }
      };

      const newWsService = new LiveOrderWebSocketService(
        token,
        updateStoreCallback
      );
      set({ webSocketService: newWsService, accessToken: token });
      newWsService.connect();
    },

    disconnectWebSocket: () => {
      get().webSocketService?.disconnect();
      set({ webSocketService: null, accessToken: null });
    },

    reconnectWebSocket: () => {
      const { accessToken } = get();
      if (accessToken) {
        // console.log("🔄 웹소켓 재연결을 시도합니다...");
        get().initializeWebSocket(accessToken);
      } else {
        console.error("🔴 AccessToken이 없어 재연결할 수 없습니다.");
      }
    },
  }))
);
