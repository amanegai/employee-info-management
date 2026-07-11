package jp.dispatch.employee.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.Resource;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.springframework.web.servlet.resource.PathResourceResolver;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;

/**
 * Serves the built React app with SPA fallback.
 * Prefers {@code ../frontend/dist} (no Maven rebuild needed) then classpath:/static/.
 */
@Configuration
public class SpaResourceConfig implements WebMvcConfigurer {

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        List<String> locations = new ArrayList<>();
        Path distPath = Path.of("../frontend/dist").toAbsolutePath().normalize();
        if (Files.isDirectory(distPath)) {
            String distUrl = distPath.toUri().toString();
            if (!distUrl.endsWith("/")) {
                distUrl += "/";
            }
            locations.add(distUrl);
        }
        locations.add("classpath:/static/");

        registry.addResourceHandler("/**")
                .addResourceLocations(locations.toArray(String[]::new))
                .resourceChain(true)
                .addResolver(new PathResourceResolver() {
                    @Override
                    protected Resource getResource(String resourcePath, Resource location) throws IOException {
                        if (resourcePath.startsWith("api/")) {
                            return null;
                        }
                        Resource resource = super.getResource(resourcePath, location);
                        if (resource != null && resource.exists()) {
                            return resource;
                        }
                        // 缺失的 JS/CSS 等勿回退为 index.html，否则浏览器白屏且 Network 仍显示 200
                        int dot = resourcePath.lastIndexOf('.');
                        if (dot > 0 && dot < resourcePath.length() - 1) {
                            return null;
                        }
                        return super.getResource("index.html", location);
                    }
                });
    }
}
