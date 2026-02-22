import axios from 'axios';

export const FORBIDDEN_MESSAGE = 'Sem permissão para acessar este recurso.';

export function isForbiddenError(error: unknown): boolean {
  return axios.isAxiosError(error) && error.response?.status === 403;
}

export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (isForbiddenError(error)) {
    return FORBIDDEN_MESSAGE;
  }

  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message;

    if (Array.isArray(message)) {
      return message.filter((item): item is string => typeof item === 'string').join(', ');
    }

    if (typeof message === 'string' && message.trim()) {
      return message;
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
}
