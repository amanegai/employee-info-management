package jp.dispatch.employee.service;

import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.UUID;

@Service
public class FileStorageService {

    private static final ZoneId ZONE = ZoneId.of("Asia/Tokyo");

    private final Path storageRoot;

    public FileStorageService(@Value("${app.files.storage-dir:./data/files}") String storageDir) {
        this.storageRoot = Path.of(storageDir).toAbsolutePath().normalize();
    }

    @PostConstruct
    void ensureStorageDirectory() throws IOException {
        Files.createDirectories(storageRoot);
    }

    public Path root() {
        return storageRoot;
    }

    /**
     * ファイルを保存し、DB に記録する絶対パスを返す。
     */
    public String store(MultipartFile file) throws IOException {
        String extension = extractExtension(file.getOriginalFilename());
        String storedFileName = UUID.randomUUID() + extension;

        LocalDate today = LocalDate.now(ZONE);
        Path targetDir = storageRoot
                .resolve(String.valueOf(today.getYear()))
                .resolve(String.format("%02d", today.getMonthValue()))
                .normalize();
        if (!targetDir.startsWith(storageRoot)) {
            throw new IOException("Invalid storage directory");
        }
        Files.createDirectories(targetDir);

        Path target = targetDir.resolve(storedFileName).normalize();
        if (!target.startsWith(storageRoot)) {
            throw new IOException("Invalid storage path");
        }
        Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);
        return target.toAbsolutePath().normalize().toString();
    }

    public Path resolveStoragePath(String storagePath) {
        if (storagePath == null || storagePath.isBlank()) {
            throw new IllegalArgumentException("Storage path is empty");
        }

        Path path = Path.of(storagePath.trim());
        if (!path.isAbsolute()) {
            path = storageRoot.resolve(path).normalize();
        } else {
            path = path.toAbsolutePath().normalize();
        }

        if (!path.startsWith(storageRoot)) {
            throw new IllegalArgumentException("Storage path is outside allowed directory");
        }
        return path;
    }

    private static String extractExtension(String originalFilename) {
        if (originalFilename == null || originalFilename.isBlank()) {
            return "";
        }
        String name = Path.of(originalFilename).getFileName().toString();
        int dot = name.lastIndexOf('.');
        if (dot <= 0 || dot >= name.length() - 1) {
            return "";
        }
        String ext = name.substring(dot);
        if (ext.length() > 20 || ext.contains("/") || ext.contains("\\")) {
            return "";
        }
        return ext;
    }

    public static String sanitizeOriginalName(String originalFilename) {
        if (originalFilename == null || originalFilename.isBlank()) {
            return "download";
        }
        String name = Path.of(originalFilename).getFileName().toString().trim();
        return name.isEmpty() ? "download" : name;
    }
}
