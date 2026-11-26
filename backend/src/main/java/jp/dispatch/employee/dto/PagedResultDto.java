package jp.dispatch.employee.dto;

import java.util.List;

public record PagedResultDto<T>(
        List<T> items,
        long total,
        int page,
        int size
) {
    public int totalPages() {
        if (size <= 0) {
            return 0;
        }
        return (int) Math.ceil((double) total / (double) size);
    }
}
