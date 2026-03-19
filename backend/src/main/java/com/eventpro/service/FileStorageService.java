package com.eventpro.service;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;

@Service
public class FileStorageService {

    private final Cloudinary cloudinary;

    public FileStorageService(
            @Value("${CLOUDINARY_CLOUD_NAME:}") String cloudName,
            @Value("${CLOUDINARY_API_KEY:}") String apiKey,
            @Value("${CLOUDINARY_API_SECRET:}") String apiSecret) {
        
        this.cloudinary = new Cloudinary(ObjectUtils.asMap(
                "cloud_name", cloudName,
                "api_key", apiKey,
                "api_secret", apiSecret,
                "secure", true
        ));
        System.out.println("Cloudinary configurado para cloud: " + cloudName);
    }

    /**
     * Sube un archivo a Cloudinary y retorna la URL pública.
     */
    public String storeFile(MultipartFile file) {
        try {
            Map uploadResult = cloudinary.uploader().upload(file.getBytes(), ObjectUtils.asMap(
                    "folder", "eventpro",
                    "resource_type", "auto"
            ));
            String secureUrl = (String) uploadResult.get("secure_url");
            System.out.println(">>> Archivo subido a Cloudinary: " + secureUrl);
            return secureUrl;
        } catch (IOException ex) {
            throw new RuntimeException("Error al subir archivo a Cloudinary: " + ex.getMessage(), ex);
        }
    }

    /**
     * Elimina un archivo de Cloudinary usando su URL o public_id.
     */
    public void deleteFile(String fileUrlOrPublicId) {
        if (fileUrlOrPublicId == null || fileUrlOrPublicId.trim().isEmpty()) return;
        try {
            String publicId = extractPublicId(fileUrlOrPublicId);
            if (publicId != null && !publicId.isEmpty()) {
                cloudinary.uploader().destroy(publicId, ObjectUtils.asMap(
                        "resource_type", "image"
                ));
                System.out.println(">>> Archivo eliminado de Cloudinary: " + publicId);
            }
        } catch (Exception ex) {
            System.err.println("Error al eliminar archivo de Cloudinary: " + fileUrlOrPublicId + " - " + ex.getMessage());
        }
    }

    /**
     * Extrae el public_id de una URL de Cloudinary.
     * Ejemplo URL: https://res.cloudinary.com/demo/image/upload/v1234/eventpro/abc123.jpg
     * Public ID: eventpro/abc123
     */
    private String extractPublicId(String url) {
        if (url == null) return null;
        
        // Si ya es un public_id (no una URL), retornarlo
        if (!url.startsWith("http")) {
            // Manejar rutas legacy locales (/uploads/filename.jpg)
            if (url.startsWith("/uploads/")) {
                System.out.println(">>> Archivo local legacy ignorado (no está en Cloudinary): " + url);
                return null;
            }
            return url;
        }

        try {
            // Buscar "/upload/" en la URL y extraer lo que viene después (sin versión ni extensión)
            String marker = "/upload/";
            int uploadIndex = url.indexOf(marker);
            if (uploadIndex == -1) return null;

            String afterUpload = url.substring(uploadIndex + marker.length());
            
            // Remover versión si existe (v1234567890/)
            if (afterUpload.startsWith("v") && afterUpload.contains("/")) {
                afterUpload = afterUpload.substring(afterUpload.indexOf("/") + 1);
            }
            
            // Remover extensión del archivo
            int lastDotIndex = afterUpload.lastIndexOf(".");
            if (lastDotIndex > 0) {
                afterUpload = afterUpload.substring(0, lastDotIndex);
            }
            
            return afterUpload;
        } catch (Exception e) {
            System.err.println("Error al extraer public_id de URL: " + url);
            return null;
        }
    }
}
