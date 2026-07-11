package jp.dispatch.employee.repository;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Repository
public class EvaluationItemRepository {

    private final JdbcTemplate jdbc;

    public EvaluationItemRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public Map<String, List<String>> findRanksByCategory(long employeeId) {
        var rows = jdbc.query(
                """
                SELECT category_code, rank_grade
                FROM employee_evaluation_item
                WHERE employee_id = ?
                ORDER BY category_code, sort_order, id
                """,
                (rs, rowNum) -> Map.entry(
                        rs.getString("category_code"),
                        rs.getString("rank_grade")
                ),
                employeeId
        );

        Map<String, List<String>> grouped = new LinkedHashMap<>();
        for (var row : rows) {
            grouped.computeIfAbsent(row.getKey(), k -> new ArrayList<>()).add(row.getValue());
        }
        return grouped;
    }

    public Map<Long, Map<String, List<String>>> findRanksByCategoryForAll() {
        var rows = jdbc.query(
                """
                SELECT employee_id, category_code, rank_grade
                FROM employee_evaluation_item
                ORDER BY employee_id, category_code, sort_order, id
                """,
                (rs, rowNum) -> new Object[]{
                        rs.getLong("employee_id"),
                        rs.getString("category_code"),
                        rs.getString("rank_grade")
                }
        );

        Map<Long, Map<String, List<String>>> result = new HashMap<>();
        for (Object[] row : rows) {
            long employeeId = (Long) row[0];
            String category = (String) row[1];
            String rank = (String) row[2];
            result.computeIfAbsent(employeeId, k -> new LinkedHashMap<>())
                    .computeIfAbsent(category, k -> new ArrayList<>())
                    .add(rank);
        }
        return result;
    }

    public boolean hasItems(long employeeId) {
        Long count = jdbc.queryForObject(
                "SELECT COUNT(*) FROM employee_evaluation_item WHERE employee_id = ?",
                Long.class,
                employeeId
        );
        return count != null && count > 0;
    }

    public void updateOverallRank(long employeeId, String grade) {
        jdbc.update(
                """
                UPDATE employee_overall_evaluation
                SET overall_rank = ?
                WHERE employee_id = ?
                """,
                grade,
                employeeId
        );
    }
}
