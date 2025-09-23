// _modal/CancelConfirmModal.tsx
// import { useEffect } from "react";
import styled, { css } from "styled-components";

interface Props {
  onConfirm: () => void;
  onCancel: () => void;
  /** 선택된 취소 수량 */
  cancelCount?: number;
  /** 취소 전 총 수량 (잔여 계산용) */
  totalCountBefore?: number;
}

const CancelConfirmModal: React.FC<Props> = ({
  onConfirm,
  onCancel,
  cancelCount,
  totalCountBefore,
}) => {
  // 모달이 열릴 때 현재 선택/잔여 예상값 로그
  // useEffect(() => {
  //   if (typeof cancelCount === "number" && typeof totalCountBefore === "number") {
  //     const expectedLeft = Math.max(0, totalCountBefore - cancelCount);
  //     console.log(
  //       "[CancelConfirmModal] 선택 수량:",
  //       cancelCount,
  //       "/ 취소 전 총 수량:",
  //       totalCountBefore,
  //       "/ (예상) 취소 후 남는 수량:",
  //       expectedLeft
  //     );
  //   }
  // }, [cancelCount, totalCountBefore]);

  const handleConfirm = () => {
    if (
      typeof cancelCount === "number" &&
      typeof totalCountBefore === "number"
    ) {
      console.log(
        "[CancelConfirmModal] 확인 클릭 - 취소 요청 전 송신 예정 수량:",
        cancelCount,
        "/ 취소 전 총 수량:",
        totalCountBefore
      );
    } else {
      console.log("[CancelConfirmModal] 확인 클릭");
    }
    onConfirm();
  };

  return (
    <Overlay>
      <Modal>
        <TextWrapper>
          <p>정말 취소하시겠어요?</p>
          <p className="grayText">
            주문 취소 후, <br />
            손님에게 직접 계좌로 환불해주셔야 해요.
          </p>
          {typeof cancelCount === "number" &&
            typeof totalCountBefore === "number" && (
              <p className="grayText">
                선택: {cancelCount}개 / 취소 전: {totalCountBefore}개 /
                (예상)잔여: {Math.max(0, totalCountBefore - cancelCount)}개
              </p>
            )}
        </TextWrapper>
        <ButtonRow>
          <ButtonContainer1>
            <button onClick={onCancel}>취소</button>
          </ButtonContainer1>
          <ButtonContainer2>
            <button onClick={handleConfirm}>주문 취소</button>
          </ButtonContainer2>
        </ButtonRow>
      </Modal>
    </Overlay>
  );
};

export default CancelConfirmModal;

/* 스타일 동일 */
const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 999;
`;
const Modal = styled.div`
  position: fixed;
  top: 30%;
  min-width: 24rem;
  min-height: 13rem;
  background: white;
  border-radius: 1rem;
  text-align: center;
`;
const TextWrapper = styled.div`
  width: 100%;
  padding: 2.5rem 0 2.2rem;
  gap: 1rem;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  border-bottom: 1px solid ${({ theme }) => theme.colors.Black02};
  ${({ theme }) => css(theme.fonts.Bold20)};
  .grayText {
    line-height: 23px;
    color: ${({ theme }) => theme.colors.Black02};
    ${({ theme }) => css(theme.fonts.SemiBold14)};
  }
`;
const ButtonRow = styled.div`
  display: flex;
  justify-content: space-between;
  width: 100%;
  min-height: 3.5rem;
`;
const ButtonContainer1 = styled.div`
  width: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  color: ${({ theme }) => theme.colors.Orange01};
  border-right: 1px solid ${({ theme }) => theme.colors.Black02};
  button {
    color: ${({ theme }) => theme.colors.Orange01};
    ${({ theme }) => css(theme.fonts.Medium16)};
  }
`;
const ButtonContainer2 = styled.div`
  width: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  color: ${({ theme }) => theme.colors.Orange01};
  button {
    color: ${({ theme }) => theme.colors.Orange01};
    ${({ theme }) => css(theme.fonts.Bold16)};
  }
`;
