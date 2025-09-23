import { instance } from "./instance";

export interface SignupRequest {
  username: string;
  password: string;
  booth_name: string;
  table_num: number;
  order_check_password: string;
  account: number;
  depositor: string;
  bank: string;
  seat_type: "PT" | "PP" | "NO";
  seat_tax_person: number;
  seat_tax_table: number;
  table_limit_hours: number;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  message: string;
  code: number;
  token: {
    access: string;
  };
  data: {
    manager_id: number;
    booth_id: number;
  };
}

const UserService = {
  postSignup: async (data: SignupRequest) => {
    const response = await instance.post("/api/v2/manager/signup/", data);
    return response.data;
  },

  login: async (data: LoginRequest): Promise<LoginResponse> => {
    try {
      const response = await instance.post("/api/v2/manager/auth/", data);

      if (!response.data?.token?.access) {
        throw new Error("로그인 응답이 올바르지 않습니다.");
      }

      localStorage.setItem("Booth-ID", String(response.data.data.booth_id));

      return response.data;
    } catch (error: any) {
      throw new Error("로그인 응답이 올바르지 않습니다.");
    }
  },
};

export default UserService;
