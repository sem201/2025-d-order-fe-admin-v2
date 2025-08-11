import { IMAGE_CONSTANTS } from "@constants/imageConstants";
import { useState } from "react";
import styled from "styled-components";
import CouponRegisterModal from "./CouponRegisterModa";

const CouponCreateCard = () => {
  const [registerModal, setRegisterModal] = useState(false);
  const handleCreateClick = () => {
    setRegisterModal(true);
  };
  const handleCloseModal = () => {
    setRegisterModal(false);
  };
  return (
    <>
      <CouponCreateCardWrapper onClick={handleCreateClick}>
        <CouponCreateContents>
          <img src={IMAGE_CONSTANTS.MENUPLUS} alt="쿠폰 생성 아이콘" />
          <span>쿠폰 등록하기</span>
        </CouponCreateContents>
      </CouponCreateCardWrapper>
      {registerModal && (
        <ModalWrapper onClick={handleCloseModal}>
          <div onClick={(e) => e.stopPropagation()}>
            <CouponRegisterModal handleCloseModal={handleCloseModal} />
          </div>
        </ModalWrapper>
      )}
    </>
  );
};

export default CouponCreateCard;

const CouponCreateCardWrapper = styled.button`
  display: flex;
  justify-content: center;
  align-items: center;

  width: 190px;
  height: 273px;

  border: 2px dashed ${({ theme }) => theme.colors.Black02};
  border-radius: 10px;
  cursor: pointer;
`;

const CouponCreateContents = styled.div`
  display: flex;

  flex-direction: column;
  align-items: center;
  gap: 15px;

  & img {
    width: 35px;
    height: 35px;
  }
`;

const ModalWrapper = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: rgba(0, 0, 0, 0.4);
  z-index: 999;
`;
