import * as S from "./MenuListHeader.styled";

import { useLiveOrderStore } from "@pages/liveorder_v2/LiveOrderStore";
import { IMAGE_CONSTANTS } from "@constants/imageConstants";
const MenuListHeader = () => {
  //저스탠드 스토어 훅 호출 주방,서빙 뷰모드 상태꺼내오기
  const { viewMode, setViewMode, reconnectWebSocket } = useLiveOrderStore();
  // '최신 주문 확인' 버튼 클릭 시 실행될 핸들러
  const handleReconnect = () => {
    reconnectWebSocket();
  };

  return (
    <S.LiveOrderMenuListHeader>
      <S.HeaderBtnWrapper>
        <S.OrderModeBtn
          $isActive={viewMode === "kitchen"}
          onClick={() => setViewMode("kitchen")}
        >
          주방
        </S.OrderModeBtn>
        |
        <S.OrderModeBtn
          $isActive={viewMode === "serving"}
          onClick={() => setViewMode("serving")}
        >
          서빙
        </S.OrderModeBtn>
      </S.HeaderBtnWrapper>
      <S.HeaderReloadButton onClick={handleReconnect}>
        <img src={IMAGE_CONSTANTS.RELOADWHITE} alt="reloadWhite" />
        최신 주문 확인
      </S.HeaderReloadButton>
    </S.LiveOrderMenuListHeader>
  );
};

export default MenuListHeader;
