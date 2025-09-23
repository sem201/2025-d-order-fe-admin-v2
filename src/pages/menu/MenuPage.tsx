import * as S from "./MenuPage.styled";
import MenuCreateCard from "./_components/MenuCreateCard";
import TableFeeCard from "./_components/TableFeeCard";
import MenuCard from "./_components/MenuCard";
import { useEffect, useState } from "react";
import MenuService from "../../services/MenuService";
import { LoadingSpinner } from "./api/LoadingSpinner";
import { BoothMenuData, TableInfo } from "./Type/Menu_type";
import SetMenuCard from "./_components/SetMenuCard";

const MenuPage = () => {
  const [boothMenuData, setBoothMenuData] = useState<
    BoothMenuData | undefined
  >();
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [onSuccess, setOnSuccess] = useState<boolean>(false);
  const fetchMenus = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await MenuService.getMenuList();
      setBoothMenuData(data);
    } catch (error) {
      setError("메뉴 목록을 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMenus();
  }, [onSuccess]);

  // 추후 삭제
  useEffect(() => {
    if (boothMenuData) {
    }
  }, [boothMenuData]);

  // 테이블 이용료 정보 (BoothMenuData.table)
  const tableInfo: TableInfo | undefined = boothMenuData?.table;

  // 테이블 이용료가 없을 때 사용할 기본 TableInfo 객체
  const defaultTableInfo: TableInfo = {
    seat_type: "테이블 이용료 없음",
    seat_tax_person: 0,
    seat_tax_table: 0,
  };

  // 일반 메뉴 정렬 (카테고리 우선순위: 차지 -> 메인 -> 음료), '테이블 이용료' 제외
  const regularMenus = boothMenuData?.menus
    ?.filter((m) => m.menu_category !== "seat_fee")
    .sort((a, b) => {
      const categoryOrder = {
        차지: 0,
        메인: 1,
        음료: 2,
      } as const;

      if (a.menu_category !== b.menu_category) {
        return (
          (categoryOrder[a.menu_category as keyof typeof categoryOrder] ||
            999) -
          (categoryOrder[b.menu_category as keyof typeof categoryOrder] || 999)
        );
      }

      return b.menu_price - a.menu_price;
    });
  const setMenus = boothMenuData?.setmenus;
  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <div>{error}</div>;
  }

  return (
    <S.MenuPageWrapper>
      <S.MenuGrid>
        <MenuCreateCard bootMenuData={boothMenuData} onSuccess={setOnSuccess} />
        <TableFeeCard table={tableInfo || defaultTableInfo} />
        {regularMenus?.map((menu) => (
          <MenuCard
            key={menu.menu_id}
            menu={menu}
            onSuccess={setOnSuccess}
            boothMenuData={boothMenuData}
          />
        ))}
        {setMenus?.map((setMenu) => (
          <SetMenuCard
            key={setMenu.set_menu_id}
            menu={setMenu}
            onMenuChange={fetchMenus}
            boothMenuData={boothMenuData}
          />
        ))}
      </S.MenuGrid>
    </S.MenuPageWrapper>
  );
};

export default MenuPage;
