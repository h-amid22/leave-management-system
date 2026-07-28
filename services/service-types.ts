export interface PaginationInput {
  page: number;
  pageSize: number;
}

export interface PaginationMeta extends PaginationInput {
  total: number;
  totalPages: number;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: PaginationMeta;
}

export function createPaginationMeta(
  pagination: PaginationInput,
  total: number,
): PaginationMeta {
  return {
    ...pagination,
    total,
    totalPages: total === 0 ? 0 : Math.ceil(total / pagination.pageSize),
  };
}
