export interface PaginationQuery {
  page?: string | number;
  limit?: string | number;
  sort?: string;
  order?: "asc" | "desc";
}

export function parsePagination(query: PaginationQuery, defaultSort = "createdAt") {
  const page = Math.max(1, Number(query.page ?? 1) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit ?? 20) || 20));
  const sortField = typeof query.sort === "string" && query.sort.trim() ? query.sort.trim() : defaultSort;
  const order = query.order === "asc" ? 1 : -1;
  return {
    page,
    limit,
    skip: (page - 1) * limit,
    sort: { [sortField]: order } as Record<string, 1 | -1>,
  };
}

export function paginatedResult<T>(items: T[], total: number, page: number, limit: number) {
  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}
