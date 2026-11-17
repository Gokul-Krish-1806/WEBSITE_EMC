package com.alr.store.common;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import java.util.Arrays;
import java.util.List;

@Converter
public class StringListConverter implements AttributeConverter<List<String>, String> {
    @Override
    public String convertToDatabaseColumn(List<String> value) {
        return value == null ? "" : value.stream().map(String::trim).filter(item -> !item.isEmpty())
                .map(item -> item.replace("|", "")).collect(java.util.stream.Collectors.joining("|"));
    }

    @Override
    public List<String> convertToEntityAttribute(String value) {
        if (value == null || value.isBlank()) {
            return List.of();
        }
        return Arrays.stream(value.split("\\|")).map(String::trim).filter(item -> !item.isEmpty()).toList();
    }
}
