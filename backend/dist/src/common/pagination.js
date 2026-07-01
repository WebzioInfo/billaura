"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPagination = getPagination;
exports.toPaginatedResult = toPaginatedResult;
function getPagination(query) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 25;
    return {
        page,
        limit,
        skip: (page - 1) * limit,
        take: limit,
    };
}
function toPaginatedResult(data, total, query) {
    const { page, limit } = getPagination(query);
    return {
        data,
        meta: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
    };
}
//# sourceMappingURL=pagination.js.map