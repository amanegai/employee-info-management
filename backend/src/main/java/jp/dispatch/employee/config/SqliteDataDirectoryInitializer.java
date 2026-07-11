package jp.dispatch.employee.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

@Component
@Profile("sqlite")
public class SqliteDataDirectoryInitializer implements ApplicationRunner {

    @Value("${spring.datasource.url}")
    private String datasourceUrl;

    @Override
    public void run(ApplicationArguments args) throws IOException {
        if (!datasourceUrl.startsWith("jdbc:sqlite:")) {
            return;
        }
        String filePath = datasourceUrl.substring("jdbc:sqlite:".length());
        Path dbPath = Path.of(filePath).toAbsolutePath().normalize();
        Files.createDirectories(dbPath.getParent());
    }
}
