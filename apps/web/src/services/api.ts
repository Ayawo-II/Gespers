import { env } from "@/config/env";

export type ApiErrorDetails = Array<{ field: string; message: string }>;

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: ApiErrorDetails;

  constructor(
    status: number,
    code: string,
    message: string,
    details?: ApiErrorDetails,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export function errorMessage(error: unknown): string {
  if (isApiError(error)) {
    if (error.details && error.details.length > 0) {
      return `${error.message} (${error.details.map((d) => d.message).join(" ")})`;
    }
    return error.message;
  }
  if (error instanceof Error) return error.message;
  return "Une erreur inattendue est survenue.";
}

async function parseErrorResponse(res: Response): Promise<ApiError> {
  let payload: unknown = null;
  try {
    payload = await res.json();
  } catch {
    /* corps non JSON */
  }
  const error = (payload as { error?: { code?: string; message?: string; details?: ApiErrorDetails } } | null)
    ?.error;
  return new ApiError(
    res.status,
    error?.code ?? "HTTP_ERROR",
    error?.message ?? `La requête a échoué (${res.status}).`,
    error?.details,
  );
}

function buildHeaders(init?: RequestInit): Headers {
  const headers = new Headers(init?.headers);
  const isFormData =
    typeof FormData !== "undefined" && init?.body instanceof FormData;
  if (init?.body && !isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return headers;
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${env.apiUrl}${path}`, {
    credentials: "include",
    ...init,
    headers: buildHeaders(init),
  });

  if (!res.ok) {
    throw await parseErrorResponse(res);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return (await res.json()) as T;
}

export async function apiUpload<T>(
  path: string,
  formData: FormData,
): Promise<T> {
  return apiFetch<T>(path, { method: "POST", body: formData });
}

export async function apiDownload(path: string): Promise<Blob> {
  const res = await fetch(`${env.apiUrl}${path}`, {
    credentials: "include",
  });
  if (!res.ok) {
    throw await parseErrorResponse(res);
  }
  return res.blob();
}

export function triggerBrowserDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function queryString(
  params: Record<string, string | number | boolean | undefined | null>,
): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }
  const result = search.toString();
  return result ? `?${result}` : "";
}
