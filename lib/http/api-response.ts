import { NextResponse } from "next/server";

const privateHeaders = { "Cache-Control": "private, no-store" };

interface SuccessResponseOptions<TMeta> {
  status?: number;
  meta?: TMeta;
}

export function createSuccessResponse<TData, TMeta = never>(
  data: TData,
  options: SuccessResponseOptions<TMeta> = {},
) {
  return NextResponse.json(
    options.meta === undefined ? { data } : { data, meta: options.meta },
    {
      status: options.status ?? 200,
      headers: privateHeaders,
    },
  );
}
