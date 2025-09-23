import styled from "styled-components";
import { useLiveOrderStore } from "../../LiveOrderStore";

import { useState, useEffect, useRef } from "react";
import { IMAGE_CONSTANTS } from "@constants/imageConstants";

// 부모로부터 받을 props 타입 정의
interface DropDownProps {
  selectedOption: string;
  onOptionSelect: (option: string) => void;
}
interface StyleProps {
  $isOpen: boolean;
}

const DropDown = ({ selectedOption, onOptionSelect }: DropDownProps) => {
  // Zustand 스토어에서 menuList를 직접 가져옴
  const { menuList } = useLiveOrderStore();

  // 드롭다운 열림/닫힘 상태
  const [isOpen, setIsOpen] = useState<boolean>(false);

  // 바깥화면을 클릭해도 드롭다운 닫히게 하기위해 DOM 요소를 참조하기 위한 ref 생성
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 드롭다운 클릭시 호출할 함수 드롭다운을 열림상태로바꿈
  const dropdownOpen = () => {
    setIsOpen(!isOpen);
  };

  // 드롭다운 옵션클릭할때 호출되는 함수(옵션을 선택하고 드롭다운 닫음)
  // 옵션 클릭 시 부모에게 선택된 값을 알립니다.
  const handleOptionClick = (option: string) => {
    onOptionSelect(option);
    setIsOpen(false);
  };

  // 외부 클릭을 감지하는 useEffect 추가
  useEffect(() => {
    // 이벤트 핸들러 함수 정의
    const handleClickOutside = (event: MouseEvent) => {
      // dropdownRef.current가 존재하고, 클릭된 요소(event.target)가 드롭다운 내부에 포함되지 않았을 때
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false); // 드롭다운닫기
      }
    };

    // 문서 전체에 'mousedown' 이벤트 리스너 추가
    document.addEventListener("mousedown", handleClickOutside);

    //클린업 함수
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <DropDownWrapper ref={dropdownRef} $isOpen={isOpen}>
      <DropDownButton
        onClick={dropdownOpen}
        $isOpen={isOpen} //메뉴혹은 전체일때는 회색글씨로 표시...
        $isDefault={selectedOption === "메뉴" || selectedOption === "전체"}
      >
        <DropDownText>{selectedOption}</DropDownText>
        <DropDownImg
          src={IMAGE_CONSTANTS.DOWN}
          alt="아래화살표 아이콘"
          $isOpen={isOpen}
        />
      </DropDownButton>

      {isOpen && (
        <DropDownList>
          {/* API에서 가져온 메뉴 목록을 순회하여 옵션 렌더링 */}
          {menuList.map((menuName) => (
            <DropDownItem
              key={menuName} // key를 menuName으로 설정
              onClick={() => handleOptionClick(menuName)}
              $isSelected={selectedOption === menuName}
            >
              <DropDownText>{menuName}</DropDownText>
            </DropDownItem>
          ))}
        </DropDownList>
      )}
    </DropDownWrapper>
  );
};

export default DropDown;

const DropDownWrapper = styled.div<StyleProps>`
  display: flex;
  flex-direction: column;
  position: relative;
  width: 140px;
  min-height: 30px;

  ${({ theme }) => theme.fonts.SemiBold14}
`;

const DropDownText = styled.span<{ $isDefault?: boolean }>`
  width: 100%;
  //텍스트에 말줄임 설정
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const DropDownButton = styled.div<StyleProps & { $isDefault?: boolean }>`
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  height: 30px;
  padding: 0 8px 0 11px;
  box-sizing: border-box;

  color: ${({ $isDefault, theme }) =>
    !$isDefault ? theme.colors.Black01 : theme.colors.Black02};

  background-color: ${({ theme }) => theme.colors.Bg};
  border: 1px solid ${({ theme }) => theme.colors.Black02};

  border-radius: ${({ $isOpen }) => ($isOpen ? "3px 3px 0 0" : "3px")};
  ${({ theme }) => theme.fonts.SemiBold14}
`;

const DropDownImg = styled.img<StyleProps>`
  display: flex;
  width: 10px;
  height: auto;
  transform: ${({ $isOpen }) => ($isOpen ? "rotate(180deg)" : "rotate(0deg)")};
  transition: transform 0.3s ease;
`;

const DropDownList = styled.div`
  position: absolute;
  display: flex;
  flex-direction: column;
  top: 100%;
  left: 0;
  right: 0;

  background-color: ${({ theme }) => theme.colors.Bg};
  border: 1px solid ${({ theme }) => theme.colors.Black02};
  border-top: none;
  border-radius: 0 0 3px 3px;
  z-index: 10;
  max-height: 200px;
  overflow-y: auto;
`;
const DropDownItem = styled.div<{ $isSelected?: boolean }>`
  display: flex;
  width: 100%;
  height: 30px;
  align-items: center;
  padding: 0 8px 0 11px;
  box-sizing: border-box;

  background-color: ${({ $isSelected, theme }) =>
    $isSelected ? theme.colors.Orange02 : "transparent"};
  color: ${({ $isSelected, theme }) =>
    $isSelected ? theme.colors.Orange01 : "inherit"};

  //호버,클릭시 색상변경
  &:hover,
  &:active {
    background-color: ${({ theme }) => theme.colors.Orange02}; /* 배경색 변경 */
    color: ${({ theme }) => theme.colors.Orange01}; /* 텍스트 색상 변경 */
  }

  //색상변환 애니메이션
  transition: all 0.2s ease;
`;
