import client from "./client"
import type { User } from "../types"

interface LoginRequest    { email: string; password: string }
interface TokenResponse   { access_token: string; token_type: string; user: User }

export interface RegisterRequest { email: string; password: string; full_name: string }

export const login = (data: LoginRequest) =>
  client.post<TokenResponse>("/auth/login", data).then(r => r.data)

export const register = (data: RegisterRequest): Promise<{ message: string }> =>
  client.post("/auth/register", data).then(r => r.data)

export const verifyEmail = (token: string): Promise<TokenResponse> =>
  client.post("/auth/verify-email", { token }).then(r => r.data)
