package jp.dispatch.employee.config;

import jp.dispatch.employee.service.EvaluationCalculationService;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

@Component
public class EvaluationStartupSync implements ApplicationRunner {

    private final EvaluationCalculationService calculationService;

    public EvaluationStartupSync(EvaluationCalculationService calculationService) {
        this.calculationService = calculationService;
    }

    @Override
    public void run(ApplicationArguments args) {
        calculationService.syncAllEvaluations();
    }
}
