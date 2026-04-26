import { z } from 'zod';
import { apiClient } from './axios';
import { type RegisterRequest, type LoginRequest } from '@splitledger/shared';
import { validateApiResponse } from '../utils/apiValidator';

// --- Response schemas (what we expect back from the server) ---
const loginResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  user: z.object({
    id: z.string(),
    email: z.string().nullable(),
    phone_number: z.string().nullable().optional(),
    display_name: z.string(),
    username: z.string().nullable().optional(),
    avatar_url: z.string().nullable().optional(),
    is_verified: z.boolean(),
  }),
});

const registerResponseSchema = z.object({
  message: z.string(),
  identifier: z.string(),
});

export type LoginResponse = z.infer<typeof loginResponseSchema>;
export type RegisterResponse = z.infer<typeof registerResponseSchema>;

// --- Typed API functions ---
export const authApi = {
  async login(body: LoginRequest): Promise<LoginResponse> {
    const { data } = await apiClient.post('/auth/login', body);
    return validateApiResponse(data, loginResponseSchema, 'POST /auth/login');
  },

  async register(body: RegisterRequest): Promise<RegisterResponse> {
    const { data } = await apiClient.post('/auth/register', body);
    return validateApiResponse(data, registerResponseSchema, 'POST /auth/register');
  },

  async verifyOtp(identifier: string, otp: string): Promise<LoginResponse> {
    const { data } = await apiClient.post('/auth/verify-otp', { identifier, otp });
    return validateApiResponse(data, loginResponseSchema, 'POST /auth/verify-otp');
  },

  async refreshToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    const { data } = await apiClient.post('/auth/refresh', { refreshToken });
    return validateApiResponse(
      data,
      z.object({ accessToken: z.string(), refreshToken: z.string() }),
      'POST /auth/refresh'
    );
  },
};
