package com.alr.store.config;

import java.nio.file.Path;
import java.nio.file.Paths;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class UploadWebConfig implements WebMvcConfigurer {
    private final String location;

    public UploadWebConfig(@Value("${app.upload.directory:./uploads}") String uploadDirectory) {
        Path path = Paths.get(uploadDirectory).toAbsolutePath().normalize();
        this.location = path.toUri().toString();
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        registry.addResourceHandler("/uploads/**").addResourceLocations(location);
    }
}
