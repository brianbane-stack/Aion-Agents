export type ServiceResult<T = undefined> = {
  ok: boolean;
  message: string;
  code?: string;
  data?: T;
};

export function ok<T>(message: string, data?: T): ServiceResult<T> {
  return data === undefined ? { ok: true, message } : { ok: true, message, data };
}

export function fail(message: string, code?: string): ServiceResult<never> {
  return { ok: false, message, code };
}
