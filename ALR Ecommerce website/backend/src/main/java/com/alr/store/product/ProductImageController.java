package com.alr.store.product;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/admin/uploads")
public class ProductImageController {
    private static final long MAX_BYTES = 300 * 1024;
    private final Path uploadDirectory;

    public ProductImageController(@Value("${app.upload.directory:./uploads}") String directory) {
        this.uploadDirectory = Paths.get(directory).toAbsolutePath().normalize();
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('ADMIN')")
    public UploadResponse upload(@RequestPart("file") MultipartFile file) {
        if (file.isEmpty() || file.getSize() > MAX_BYTES) {
            throw new IllegalArgumentException("Choose an image no larger than 300 KB.");
        }
        try {
            byte[] bytes = file.getBytes();
            String extension = imageExtension(bytes);
            if (extension == null) {
                throw new IllegalArgumentException("Only valid PNG, JPEG, or WebP images are accepted.");
            }
            Files.createDirectories(uploadDirectory);
            String filename = UUID.randomUUID() + extension;
            Files.write(uploadDirectory.resolve(filename), bytes);
            return new UploadResponse("/uploads/" + filename);
        } catch (IOException exception) {
            throw new UncheckedIOException("The product image could not be saved.", exception);
        }
    }

    private String imageExtension(byte[] bytes) {
        if (bytes.length >= 8 && (bytes[0] & 0xff) == 0x89 && bytes[1] == 0x50
                && bytes[2] == 0x4e && bytes[3] == 0x47 && bytes[4] == 0x0d
                && bytes[5] == 0x0a && bytes[6] == 0x1a && bytes[7] == 0x0a) {
            return ".png";
        }
        if (bytes.length >= 3 && (bytes[0] & 0xff) == 0xff && (bytes[1] & 0xff) == 0xd8
                && (bytes[2] & 0xff) == 0xff) {
            return ".jpg";
        }
        if (bytes.length >= 12 && bytes[0] == 'R' && bytes[1] == 'I' && bytes[2] == 'F' && bytes[3] == 'F'
                && bytes[8] == 'W' && bytes[9] == 'E' && bytes[10] == 'B' && bytes[11] == 'P') {
            return ".webp";
        }
        return null;
    }

    public record UploadResponse(String imageUrl) {
    }
}
