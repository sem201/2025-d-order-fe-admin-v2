// mypage/MyPage.tsx
import * as S from "./MyPage.styled";
import { useEffect, useState } from "react";
import Modal from "./components/Modal";
import { toast } from "react-toastify";
import check from "../../assets/icons/toastcheck.svg";

import { useManagers } from "./hooks/useManagers";
import { useManagerPatch } from "./hooks/useManagerPatch";
import type { ManagerInfo } from "./apis/getManagerPatch";
import { downloadManagerQR } from "./apis/getQRDownload";
import { requestLogout } from "./apis/logout";
import { LoadingSpinner } from "../menu/api/LoadingSpinner";

import StoreNameField from "./components/StoreNameField";
import SeatFeeField from "./components/SeatFeeField";
import TimeLimitField from "./components/TimeLimitField";
import AccountField from "./components/AccountField";
import ReadonlyField from "./components/ReadonlyField";
import BottomActions from "./components/BottomActions";

const SeatTypeLabel: Record<ManagerInfo["seat_type"], string> = {
  PP: "인원 수",
  PT: "테이블",
  NO: "받지 않음",
};
const LabelToSeatType: Record<string, ManagerInfo["seat_type"]> = {
  "인원 수": "PP",
  테이블: "PT",
  "받지 않음": "NO",
};

const minutesToLabel = (m?: number) => {
  switch (m) {
    case 60:
      return "1시간";
    case 90:
      return "1시간 30분";
    case 120:
      return "2시간";
    case 150:
      return "2시간 30분";
    case 180:
      return "3시간";
    default:
      return "2시간";
  }
};
const labelToMinutes = (label: string) => {
  switch (label) {
    case "1시간":
      return 60;
    case "1시간 30분":
      return 90;
    case "2시간":
      return 120;
    case "2시간 30분":
      return 150;
    case "3시간":
      return 180;
    default:
      return 120;
  }
};

type PatchField = "storeName" | "account" | "seat" | "time";

const MyPage = () => {
  const { data: my, loading, error, reload } = useManagers();
  const { update, updating, error: updateError } = useManagerPatch({});
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // 편집 상태
  const [editingName, setEditingName] = useState(false);
  const [editingAccount, setEditingAccount] = useState(false);
  const [editingSeat, setEditingSeat] = useState(false);
  const [editingTime, setEditingTime] = useState(false);

  // 드롭다운 상태
  const [isBankDropdownOpen, setIsBankDropdownOpen] = useState(false);
  const [isSeatDropdownOpen, setIsSeatDropdownOpen] = useState(false);
  const [isTimeDropdownOpen, setIsTimeDropdownOpen] = useState(false);

  // 입력 상태
  const [storeName, setStoreName] = useState("");
  const [selectedBank, setSelectedBank] = useState("");
  const [owner, setOwner] = useState("");
  const [account, setAccount] = useState("");

  // 좌석 과금
  const [seatTypeLocal, setSeatTypeLocal] =
    useState<ManagerInfo["seat_type"]>("NO");
  const [seatTypeLabel, setSeatTypeLabel] = useState<string>("받지 않음");
  const [seatAmountLocal, setSeatAmountLocal] = useState<string>("");

  // 이용 시간
  const [timeLabelLocal, setTimeLabelLocal] = useState<string>("2시간");

  // GET 동기화
  useEffect(() => {
    if (!my) return;
    if (!editingName) setStoreName(my.booth_name ?? "");
    if (!editingAccount) {
      setSelectedBank(my.bank ?? "");
      setOwner(my.depositor ?? "");
      setAccount(my.account ?? "");
    }
    if (!editingSeat) {
      setSeatTypeLocal(my.seat_type);
      setSeatTypeLabel(SeatTypeLabel[my.seat_type]);
      const amt =
        my.seat_type === "PP"
          ? my.seat_tax_person ?? 0
          : my.seat_type === "PT"
          ? my.seat_tax_table ?? 0
          : 0;
      setSeatAmountLocal(String(amt || ""));
    }
    if (!editingTime) setTimeLabelLocal(minutesToLabel(my.table_limit_hours));
  }, [my, editingName, editingAccount, editingSeat, editingTime]);

  // 라벨 ↔ 코드 연동
  useEffect(() => {
    setSeatTypeLocal(LabelToSeatType[seatTypeLabel] ?? "NO");
  }, [seatTypeLabel]);

  const startEdit = (f: PatchField) => {
    if (!my) return;
    if (f === "storeName") setEditingName(true);
    if (f === "account") setEditingAccount(true);
    if (f === "seat") setEditingSeat(true);
    if (f === "time") setEditingTime(true);
  };

  const cancelEdit = (f: PatchField) => {
    if (!my) return;
    if (f === "storeName") {
      setEditingName(false);
      setStoreName(my.booth_name ?? "");
    }
    if (f === "account") {
      setEditingAccount(false);
      setSelectedBank(my.bank ?? "");
      setOwner(my.depositor ?? "");
      setAccount(my.account ?? "");
    }
    if (f === "seat") {
      setEditingSeat(false);
      setSeatTypeLocal(my.seat_type);
      setSeatTypeLabel(SeatTypeLabel[my.seat_type]);
      const amt =
        my.seat_type === "PP"
          ? my.seat_tax_person ?? 0
          : my.seat_type === "PT"
          ? my.seat_tax_table ?? 0
          : 0;
      setSeatAmountLocal(String(amt || ""));
    }
    if (f === "time") {
      setEditingTime(false);
      setTimeLabelLocal(minutesToLabel(my.table_limit_hours));
    }
  };

  const confirmEdit = async (f: PatchField) => {
    if (!my) return;
    const payload: Partial<ManagerInfo> = {};
    if (f === "storeName") {
      payload.booth_name = storeName.trim();
    } else if (f === "account") {
      payload.bank = selectedBank.trim();
      payload.depositor = owner.trim();
      payload.account = account.trim();
    } else if (f === "seat") {
      // seatTypeLocal: "PP" | "PT" | "NO"
      payload.seat_type = seatTypeLocal;

      const raw = seatAmountLocal.trim();
      const amount = raw === "" ? undefined : Number(raw);

      if (seatTypeLocal === "PP") {
        payload.seat_tax_person = typeof amount === "number" ? amount : 0;
        payload.seat_tax_table = null; // ← 명세
      } else if (seatTypeLocal === "PT") {
        payload.seat_tax_table = typeof amount === "number" ? amount : 0;
        payload.seat_tax_person = null; // ← 명세
      } else {
        // NO: 둘 다 null
        payload.seat_tax_person = null; // ← 명세
        payload.seat_tax_table = null; // ← 명세
      }
    } else if (f === "time") {
      payload.table_limit_hours = labelToMinutes(timeLabelLocal);
    }

    console.groupCollapsed(`[PATCH] /api/v2/manager/mypage/ - ${f}`);

    try {
      const res = await update(payload);
      if (!res) {
        toast.error(updateError || "수정 중 오류가 발생했습니다.", {
          closeButton: false,
          style: toToastStyle(),
        });
        console.groupEnd();
        return;
      }
      toast.success("저장되었습니다.", {
        icon: <img src={check} alt="체크" />,
        closeButton: false,
        style: toToastStyle(),
      });
      await reload();
      if (f === "storeName") setEditingName(false);
      if (f === "account") setEditingAccount(false);
      if (f === "seat") setEditingSeat(false);
      if (f === "time") setEditingTime(false);
    } catch (e: any) {
      console.error("✖ patch error", e);
      toast.error(e?.message || "수정 중 오류가 발생했습니다.", {
        closeButton: false,
        style: toToastStyle(),
      });
    } finally {
      console.groupEnd();
    }
  };

  const toToastStyle = () => ({
    backgroundColor: "#FF6E3F",
    color: "#FAFAFA",
    fontSize: "1rem",
    fontWeight: 800 as const,
    borderRadius: "8px",
    padding: "0.75rem 0.875rem",
  });

  const handleQrClick = async () => {
    if (!my) return;
    try {
      await downloadManagerQR(my.booth);
      toast.success("QR코드 다운로드가 완료되었어요!", {
        icon: <img src={check} alt="체크" />,
        closeButton: false,
        style: toToastStyle(),
      });
    } catch (err: any) {
      toast.error(err?.message || "QR코드 다운로드에 실패했습니다.", {
        closeButton: false,
        style: toToastStyle(),
      });
    }
  };

  const handleLogout = async () => {
    try {
      await requestLogout();
      localStorage.removeItem("accessToken");
      localStorage.removeItem("access");
      localStorage.removeItem("token");
      toast.success("로그아웃되었습니다.", {
        closeButton: false,
        style: toToastStyle(),
      });
      window.location.href = "/login";
    } catch (err: any) {
      toast.error(err?.message || "로그아웃에 실패했습니다.", {
        closeButton: false,
        style: toToastStyle(),
      });
      window.location.href = "/login";
    } finally {
      setShowLogoutModal(false);
    }
  };

  if (loading || updating) return <LoadingSpinner />;
  if (error) return <div>{error}</div>;
  if (!my) return <div>주점 정보를 불러올 수 없습니다.</div>;

  return (
    <S.Wrapper>
      <S.Title>주점 정보</S.Title>
      <S.Container>
        <S.Row>
          <StoreNameField
            value={my.booth_name}
            editing={editingName}
            input={storeName}
            setInput={setStoreName}
            onEdit={() => startEdit("storeName")}
            onConfirm={() => confirmEdit("storeName")}
            onCancel={() => cancelEdit("storeName")}
          />

          <ReadonlyField label="테이블 수" value={my.table_num} />

          <SeatFeeField
            editing={editingSeat}
            seatTypeLabel={seatTypeLabel}
            setSeatTypeLabel={setSeatTypeLabel}
            amount={seatAmountLocal}
            setAmount={setSeatAmountLocal}
            readonlyType={my.seat_type}
            readonlyPP={my.seat_tax_person}
            readonlyPT={my.seat_tax_table}
            isDropdownOpen={isSeatDropdownOpen}
            setDropdownOpen={setIsSeatDropdownOpen}
            onEdit={() => startEdit("seat")}
            onConfirm={() => confirmEdit("seat")}
            onCancel={() => cancelEdit("seat")}
          />

          <TimeLimitField
            editing={editingTime}
            valueLabel={timeLabelLocal}
            setValueLabel={setTimeLabelLocal}
            isDropdownOpen={isTimeDropdownOpen}
            setDropdownOpen={setIsTimeDropdownOpen}
            readonlyValueLabel={minutesToLabel(my.table_limit_hours)}
            onEdit={() => startEdit("time")}
            onConfirm={() => confirmEdit("time")}
            onCancel={() => cancelEdit("time")}
          />

          <AccountField
            editing={editingAccount}
            bank={selectedBank}
            setBank={setSelectedBank}
            owner={owner}
            setOwner={setOwner}
            account={account}
            setAccount={setAccount}
            isDropdownOpen={isBankDropdownOpen}
            setDropdownOpen={setIsBankDropdownOpen}
            readonlyBank={my.bank}
            readonlyOwner={my.depositor}
            readonlyAccount={my.account}
            onEdit={() => startEdit("account")}
            onConfirm={() => confirmEdit("account")}
            onCancel={() => cancelEdit("account")}
          />

          <ReadonlyField
            label="주문 확인 비밀번호"
            value={my.order_check_password || "-"}
          />
        </S.Row>
      </S.Container>

      <BottomActions
        onClickQR={handleQrClick}
        onClickLogout={() => setShowLogoutModal(true)}
      />

      {showLogoutModal && (
        <Modal
          onCancel={() => setShowLogoutModal(false)}
          onLogout={handleLogout}
        />
      )}
    </S.Wrapper>
  );
};

export default MyPage;
