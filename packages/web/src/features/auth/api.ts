import type { LoginRequest, SessionDto, SignupRequest } from "@rrms/shared";
import { apiRequest } from "../../lib/api-client";

export const authApi = {
  signup: (body: SignupRequest) =>
    apiRequest<SessionDto>("/api/auth/signup", { method: "POST", body, redirectOnUnauthenticated: false }),
  login: (body: LoginRequest) =>
    apiRequest<SessionDto>("/api/auth/login", { method: "POST", body, redirectOnUnauthenticated: false }),
  logout: () => apiRequest<null>("/api/auth/logout", { method: "POST", redirectOnUnauthenticated: false }),
  me: () => apiRequest<SessionDto>("/api/auth/me", { redirectOnUnauthenticated: false }),
};
