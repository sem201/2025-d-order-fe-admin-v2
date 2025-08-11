import { IMAGE_CONSTANTS } from "@constants/imageConstants";
import * as S from "./Coupon.styled";
import { useState } from "react";

interface CouponProps {
  handleCloseModal: () => void;
}

const CouponRegisterModal = ({ handleCloseModal }: CouponProps) => {
  const [buttonDisable, setButtonDisable] = useState<boolean>(true);

  const [couponName, setCouponName] = useState<string | null>();
  const [couponDescription, setCouponDescription] = useState<string | null>();
  const [discountValue, setDiscountValue] = useState<number | null>();
  return (
    <S.Wrapper>
      <S.ModalBody>
        <S.ModalHeader>
          쿠폰등록
          <button type="button" onClick={handleCloseModal}>
            <img src={IMAGE_CONSTANTS.CLOSE} alt="닫기" />
          </button>
        </S.ModalHeader>
        <S.FormContentWrapper>
          <S.ele>
            <S.SubTitle>
              쿠폰명<span>*</span>
            </S.SubTitle>
            <S.inputText
              type="text"
              placeholder="예) 최초 1회 주문 시 5000원 할인"
              maxLength={20}
            />
          </S.ele>

          <S.ele>
            <S.SubTitle>쿠폰상세</S.SubTitle>
            <S.inputText
              type="text"
              placeholder="예) 첫 주문 금액에서 5000원이 차감됩니다."
              maxLength={20}
            />
          </S.ele>
          <S.ele>
            <S.SubTitle>
              할인 가격<span>*</span>
            </S.SubTitle>
            <S.inputText type="text" placeholder="예) 5000" maxLength={20} />
          </S.ele>
          {/* <S.ele>
            <S.SubTitle>할인유형</S.SubTitle>
          </S.ele> */}
          <S.ele>
            <S.SubTitle>
              수량 <span>*</span>
            </S.SubTitle>
            <S.inputText type="text" placeholder="예) 30" maxLength={20} />
          </S.ele>
        </S.FormContentWrapper>
      </S.ModalBody>
      <S.ModalConfirmContainer>
        <button type="button" onClick={handleCloseModal}>
          취소
        </button>
        <button type="submit" disabled={buttonDisable}>
          쿠폰등록
        </button>
      </S.ModalConfirmContainer>
    </S.Wrapper>
  );
};

export default CouponRegisterModal;
