export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: Record<string, string[]>;
}

export function ok<T>(data: T): ApiResponse<T> {
  return { success: true, data };
}

export function fail(message: string, errors?: Record<string, string[]>): ApiResponse {
  return { success: false, message, errors };
}
