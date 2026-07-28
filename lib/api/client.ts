interface ApiErrorBody {
  error?: {
    code?: string;
    message?: string;
    issues?: Record<string, string[]>;
  };
}

const requestTimeoutMs = 15_000;

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code = "REQUEST_FAILED",
    public readonly fieldErrors: Record<string, string[]> = {},
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function parseResponseBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.includes("application/json")) {
    return null;
  }

  try {
    return await response.json();
  } catch {
    return null;
  }
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const timeoutSignal = AbortSignal.timeout(requestTimeoutMs);
  const signal = init.signal
    ? AbortSignal.any([init.signal, timeoutSignal])
    : timeoutSignal;
  let response: Response;

  try {
    response = await fetch(path, {
      ...init,
      signal,
      cache: "no-store",
      credentials: "same-origin",
      headers: {
        Accept: "application/json",
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...init.headers,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      throw new ApiError("The request timed out. Please try again.", 408, "REQUEST_TIMEOUT");
    }
    throw new ApiError("Unable to reach the server. Please try again.", 0, "NETWORK_ERROR");
  }
  const body = await parseResponseBody(response);

  if (!response.ok) {
    const errorBody = body as ApiErrorBody | null;
    const fieldErrors = errorBody?.error?.issues ?? {};
    const firstFieldMessage = Object.values(fieldErrors).flat()[0];
    throw new ApiError(
      firstFieldMessage ?? errorBody?.error?.message ?? "The request could not be completed.",
      response.status,
      errorBody?.error?.code,
      fieldErrors,
    );
  }

  return body === null ? (undefined as T) : (body as T);
}

export function createQueryString(
  values: object,
) {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined && value !== "") {
      searchParams.set(key, String(value));
    }
  }

  const query = searchParams.toString();
  return query ? `?${query}` : "";
}
