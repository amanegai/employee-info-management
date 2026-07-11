package jp.dispatch.employee.dto;

import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

public final class DepartmentFilter {

    private DepartmentFilter() {
    }

    /** 配下に開発部などを持つ事業部（親部門）を選択肢から除外する */
    public static List<DepartmentDto> excludeParentDepartments(List<DepartmentDto> departments) {
        if (departments == null || departments.isEmpty()) {
            return List.of();
        }
        Set<Long> parentIds = departments.stream()
                .map(DepartmentDto::parentId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        return departments.stream()
                .filter(department -> !parentIds.contains(department.id()))
                .toList();
    }
}
