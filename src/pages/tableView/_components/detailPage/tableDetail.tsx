// tableView/_components/detailPage/tableDetail.tsx
import * as S from "./tableDetail.styled";
import ACCO from "@assets/images/character.svg";
import { IMAGE_CONSTANTS } from "@constants/imageConstants";
import CancelMenuModal from "../../_modal/CancelMenuModal";
import CancelConfirmModal from "../../_modal/CancelConfirmModal";
import ResetModal from "../../_modal/ResetModal";
import EmptyOrder from "./emptyOrder";
import { instance } from "@services/instance";

import {
  getTableDetail,
  type TableDetailData as APITableDetail,
} from "../../_apis/getTableDetail";
import { resetTable as resetTableAPI } from "../../_apis/resetTable";
import {
  updateOrderQuantity,
  type CancelBatchItem,
} from "../../_apis/updateOrderQuantity";

import { useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";

interface Props {
  data: APITableDetail;
  onBack?: () => void;
}

const API_ORIGIN = (() => {
  const fromInstance = (instance as any)?.defaults?.baseURL as
    | string
    | undefined;
  const raw = fromInstance || import.meta.env.VITE_BASE_URL || "";
  try {
    return new URL(raw).origin;
  } catch {
    return (raw || "").replace(/\/+$/, "");
  }
})();

const toImageUrl = (p?: string | null): string | null => {
  if (!p) return null;
  const val = String(p).trim();
  if (!val) return null;
  if (/^https?:\/\//i.test(val)) return val;
  if (/^\/\//.test(val)) return `https:${val}`;
  if (val.startsWith("/")) return `${API_ORIGIN}${val}`;
  return `${API_ORIGIN}/${val}`;
};

// ── 레거시 화면 타입(필요한 보조 필드 추가) ───────────────────────────
type LegacyOrder = {
  id?: number; // 단일 항목 PK (있을 수도, 없을 수도)
  order_id?: number; // 주문 PK (표시용/호환)
  menu_name: string;
  menu_price: number; // 단가
  menu_num: number; // 수량
  menu_image: string | null;
  order_status?: string;

  // 새 API 대응
  type?: "menu" | "set" | string;
  ids?: number[]; // 같은 라인의 개별 항목 PK 리스트 (예: order_menu_ids)
};

type LegacyDetail = {
  table_num: number;
  table_price: number; // = table_amount
  table_status: string;
  created_at: string | null;
  orders: LegacyOrder[];
};

const normalizeDetail = (api: APITableDetail): LegacyDetail => ({
  table_num: api.table_num,
  table_price: api.table_amount ?? 0,
  table_status: api.table_status ?? "unknown",
  created_at: api.created_at ?? null,
  orders: (api.orders ?? []).map((o: any) => ({
    id:
      typeof o?.order_item_id === "number"
        ? o.order_item_id
        : typeof o?.ordermenu_id === "number"
        ? o.ordermenu_id
        : typeof o?.order_menu_id === "number"
        ? o.order_menu_id
        : typeof o?.ordersetmenu_id === "number"
        ? o.ordersetmenu_id
        : typeof o?.order_setmenu_id === "number"
        ? o.order_setmenu_id
        : undefined,
    order_id: typeof o?.order_id === "number" ? o.order_id : undefined,
    menu_name: o?.menu_name ?? "(이름 없음)",
    menu_price: typeof o?.price === "number" ? o.price : 0,
    menu_num:
      typeof o?.quantity === "number"
        ? o.quantity
        : typeof o?.menu_num === "number"
        ? o.menu_num
        : 1,
    menu_image: o?.menu_image ?? null,
    order_status: o?.order_status,

    // 새 API 보조 정보
    type: o?.type,
    ids: Array.isArray(o?.order_item_ids) ? o.order_item_ids : undefined,
  })),
});

const TableDetail: React.FC<Props> = ({ data, onBack }) => {
  const initial = useMemo(() => normalizeDetail(data), [data]);
  const navigate = useNavigate();

  const [selectedMenu, setSelectedMenu] = useState<{
    name: string;
    quantity: number;
  } | null>(null);
  const [confirmInfo, setConfirmInfo] = useState<{
    name: string;
    quantity: number;
  } | null>(null);
  const [showResetModal, setShowResetModal] = useState(false);
  const [tableDetailData, setTableDetailData] = useState<LegacyDetail>(initial);

  const refetchTableDetail = useCallback(async () => {
    try {
      const response = await getTableDetail(tableDetailData.table_num);
      setTableDetailData(normalizeDetail(response.data));
    } catch {
      // noop
    }
  }, [tableDetailData.table_num]);

  return (
    <>
      <S.DetailWrapper>
        <S.DetailHeader>
          <S.TextWrapper>
            <S.BackButton
              onClick={() => (onBack ? onBack() : navigate("/table-view"))}
            >
              <img src={IMAGE_CONSTANTS.BACKWARD_BLACK} alt="뒤로가기버튼" />
            </S.BackButton>
            <p className="tableNumber">테이블 {tableDetailData.table_num} |</p>
            <p>상세 주문 내역</p>
          </S.TextWrapper>

          <S.TableReset onClick={() => setShowResetModal(true)}>
            <img src={IMAGE_CONSTANTS.RELOADWHITE} alt="초기화 버튼" />
            테이블 초기화
          </S.TableReset>
        </S.DetailHeader>

        <S.DivideLine />

        <S.TotalPrice>
          <p>💸총 주문금액</p>
          <p className="total">
            {tableDetailData.table_price.toLocaleString()}원
          </p>
        </S.TotalPrice>

        <S.MenuList>
          {tableDetailData.orders.length === 0 ? (
            <EmptyOrder />
          ) : (
            tableDetailData.orders.map((order, idx) => (
              <div key={order.id ?? `${order.order_id ?? "noorder"}-${idx}`}>
                <S.ItemWrapper>
                  <S.ContentContainer>
                    <S.ImageWrapper>
                      <img
                        src={toImageUrl(order.menu_image) ?? ACCO}
                        alt={order.menu_name}
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = ACCO;
                        }}
                      />
                    </S.ImageWrapper>
                    <S.TitleWrapper>
                      <p className="menuName">{order.menu_name}</p>
                      <S.GrayText>
                        <p>수량 : {order.menu_num}</p>
                        <p>가격 : {order.menu_price.toLocaleString()}원</p>
                      </S.GrayText>
                    </S.TitleWrapper>
                  </S.ContentContainer>
                  <S.ButtonWrapper>
                    <S.CancleButton
                      onClick={() => {
                        setSelectedMenu({
                          name: order.menu_name,
                          quantity: order.menu_num,
                        });
                      }}
                    >
                      <img src={IMAGE_CONSTANTS.Delete} alt="삭제" />
                      주문 취소
                    </S.CancleButton>
                  </S.ButtonWrapper>
                </S.ItemWrapper>
                <S.DivideLine />
              </div>
            ))
          )}
        </S.MenuList>
      </S.DetailWrapper>

      {/* 수량 선택 모달 */}
      {selectedMenu && (
        <CancelMenuModal
          menuName={selectedMenu.name}
          initialQuantity={selectedMenu.quantity}
          onClose={() => setSelectedMenu(null)}
          onConfirmRequest={(q) => {
            console.log(
              "[CancelMenuModal] 사용자가 취소 수량 선택:",
              q,
              "(해당 라인 총수량:",
              selectedMenu.quantity,
              ")"
            );
            setSelectedMenu(null);
            setConfirmInfo({ name: selectedMenu.name, quantity: q });
          }}
        />
      )}

      {/* 확인 모달 - 새 API로 취소 */}
      {confirmInfo && (
        <CancelConfirmModal
          onConfirm={async () => {
            try {
              // 같은 이름의 메뉴가 여러 라인에 있을 수 있어 첫 매칭만 처리(현행 로직 유지)
              const order = tableDetailData.orders.find(
                (o) => o.menu_name === confirmInfo.name
              );

              if (!order) {
                alert("해당 주문을 찾을 수 없습니다.");
                setConfirmInfo(null);
                return;
              }

              // 새 API: type 결정 (기본 menu)
              const kind: "menu" | "set" =
                order.type === "set" ? "set" : "menu";

              const wanted = Math.min(
                confirmInfo.quantity,
                Math.max(1, order.menu_num)
              );

              let batch: CancelBatchItem;

              if (Array.isArray(order.ids) && order.ids.length > 0) {
                // 복수 PK가 제공되는 라인: 선택 수량만큼 앞에서 잘라 보냄
                const ids = order.ids.slice(0, wanted);
                batch = {
                  type: kind,
                  order_item_ids: ids,
                  quantity: wanted, // ✅ 선택한 개수만큼 한 번에 취소
                };
              } else if (order.id) {
                // 단일 PK만 있는 라인: 같은 항목에서 수량 감소
                batch = {
                  type: kind,
                  order_item_ids: [order.id],
                  quantity: wanted,
                };
              } else {
                alert("주문 항목 ID가 없어 취소 요청을 보낼 수 없습니다.");
                setConfirmInfo(null);
                return;
              }

              const res = await updateOrderQuantity([batch]);

              if (res?.status === "success") {
                const updated = res?.data?.updated_items ?? [];

                // 해당 라인(같은 메뉴/세트명) 관련 잔여 수량 로그
                const nameForMatch = order.menu_name;
                const restList = updated
                  .filter(
                    (u: any) => (u.menu_name ?? u.set_name) === nameForMatch
                  )
                  .map((u: any) =>
                    typeof u.rest_quantity === "number"
                      ? u.rest_quantity
                      : undefined
                  )
                  .filter(
                    (n: number | undefined) => typeof n === "number"
                  ) as number[];

                if (restList.length > 0) {
                  const totalRest = restList.reduce((acc, n) => acc + n, 0);
                  console.log(
                    `[Confirm] "${nameForMatch}" 취소 후 남은 총 수량(서버 기준 합산):`,
                    totalRest
                  );
                } else {
                  const expectedLeft = Math.max(
                    0,
                    (order.menu_num ?? 0) - wanted
                  );
                  console.log(
                    `[Confirm] "${nameForMatch}" 취소 후 남은 수량(예상):`,
                    expectedLeft,
                    "(서버 rest_quantity 미제공)"
                  );
                }

                console.log(
                  "[Confirm] 주문 총액 변경:",
                  "이전",
                  tableDetailData.table_price,
                  "→ 응답",
                  res?.data?.order_amount_after
                );
              } else {
                console.log("[Confirm] 취소 실패 응답:", res);
              }

              setConfirmInfo(null);
              await refetchTableDetail();
            } catch (e) {
              console.log("[Confirm] 취소 요청 중 오류:", e);
              setConfirmInfo(null);
            }
          }}
          onCancel={() => {
            setConfirmInfo(null);
          }}
        />
      )}

      {/* 초기화 모달 */}
      {showResetModal && (
        <ResetModal
          resetTable={async () => {
            try {
              await resetTableAPI(tableDetailData.table_num);
              setShowResetModal(false);
              await refetchTableDetail();
            } catch {
              setShowResetModal(false);
            }
          }}
          onCancel={() => setShowResetModal(false)}
        />
      )}
    </>
  );
};

export default TableDetail;
