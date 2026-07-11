package jp.dispatch.employee.service;

import jp.dispatch.employee.dto.EvaluationCalcDto;
import jp.dispatch.employee.model.EvaluationCalculator;
import jp.dispatch.employee.model.EvaluationCalculator.CalculationResult;
import jp.dispatch.employee.model.EvaluationCalculator.CategoryScore;
import jp.dispatch.employee.model.EvaluationCategoryMeta;
import jp.dispatch.employee.repository.EvaluationItemRepository;
import jp.dispatch.employee.repository.EmployeeRepository;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class EvaluationCalculationService {

    private final EvaluationItemRepository itemRepository;
    private final EmployeeRepository employeeRepository;

    public EvaluationCalculationService(
            EvaluationItemRepository itemRepository,
            EmployeeRepository employeeRepository
    ) {
        this.itemRepository = itemRepository;
        this.employeeRepository = employeeRepository;
    }

    public Optional<CalculationResult> calculate(long employeeId) {
        Map<String, List<String>> byCategory = itemRepository.findRanksByCategory(employeeId);
        CalculationResult result = EvaluationCalculator.calculate(byCategory);
        return Optional.ofNullable(result);
    }

    public Optional<EvaluationCalcDto> calculateDto(long employeeId) {
        return calculate(employeeId).map(this::toDto);
    }

    public Map<Long, CalculationResult> calculateAll() {
        Map<Long, Map<String, List<String>>> all = itemRepository.findRanksByCategoryForAll();
        Map<Long, CalculationResult> results = new HashMap<>();
        for (var entry : all.entrySet()) {
            CalculationResult result = EvaluationCalculator.calculate(entry.getValue());
            if (result != null) {
                results.put(entry.getKey(), result);
            }
        }
        return results;
    }

    /**
     * 評価項目がある社員は算出結果を employee.evaluation に同期する。
     */
    public Optional<String> syncEvaluation(long employeeId) {
        Optional<CalculationResult> result = calculate(employeeId);
        if (result.isEmpty()) {
            return Optional.empty();
        }
        String evaluation = result.get().evaluation();
        employeeRepository.updateEvaluation(employeeId, evaluation);
        String grade = evaluation.substring(0, 1);
        if (itemRepository.hasItems(employeeId)) {
            itemRepository.updateOverallRank(employeeId, grade);
        }
        return Optional.of(evaluation);
    }

    public void syncAllEvaluations() {
        calculateAll().forEach((employeeId, result) -> {
            employeeRepository.updateEvaluation(employeeId, result.evaluation());
            itemRepository.updateOverallRank(employeeId, result.evaluation().substring(0, 1));
        });
    }

    public boolean hasCalculatedItems(long employeeId) {
        return itemRepository.hasItems(employeeId);
    }

    private EvaluationCalcDto toDto(CalculationResult result) {
        List<EvaluationCalcDto.CategoryScoreDto> categories = result.categoryScores().stream()
                .map(this::toCategoryDto)
                .toList();
        String grade = result.evaluation().substring(0, 1);
        return new EvaluationCalcDto(
                result.evaluation(),
                result.averageScore(),
                result.totalItemCount(),
                result.categoryCount(),
                EvaluationCalculator.rankLabelFor(grade),
                categories
        );
    }

    private EvaluationCalcDto.CategoryScoreDto toCategoryDto(CategoryScore cs) {
        EvaluationCategoryMeta meta = EvaluationCategoryMeta.find(cs.categoryCode());
        return new EvaluationCalcDto.CategoryScoreDto(
                cs.categoryCode(),
                meta.label(),
                cs.averageScore(),
                cs.itemCount(),
                EvaluationCalculator.scoreToEvaluation(cs.averageScore())
        );
    }
}
