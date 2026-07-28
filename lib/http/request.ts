import { RequestBodyError } from "@/lib/http/error-response";

export async function parseJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new RequestBodyError();
  }
}

export async function parseOptionalJsonBody(request: Request): Promise<unknown> {
  const body = await request.text();

  if (!body.trim()) {
    return {};
  }

  try {
    return JSON.parse(body) as unknown;
  } catch {
    throw new RequestBodyError();
  }
}

export function searchParamsToObject(searchParams: URLSearchParams) {
  const values: Record<string, string> = {};

  for (const [key, value] of searchParams.entries()) {
    values[key] = value;
  }

  return values;
}
