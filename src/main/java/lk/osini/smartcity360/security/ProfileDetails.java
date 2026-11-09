package lk.osini.smartcity360.security;

import java.io.ByteArrayInputStream;
import java.util.Base64;
import java.util.Locale;
import javax.imageio.ImageIO;

public final class ProfileDetails {
    private ProfileDetails() { }
    public static String username(String value) {
        if (value == null || value.isBlank()) return null;
        value = value.strip().toLowerCase(Locale.ROOT);
        if (!value.matches("[a-z][a-z0-9_]{2,29}"))
            throw new IllegalArgumentException("Username must be 3-30 letters, digits or underscores, starting with a letter.");
        return value;
    }
    public static String phone(String value) {
        if (value == null || value.isBlank()) return null;
        value = value.strip();
        if (!value.matches("\\+?[0-9]{7,15}"))
            throw new IllegalArgumentException("Phone must contain 7-15 digits, with an optional leading +.");
        return value;
    }
    public static String avatar(String value) {
        if (value == null || value.isEmpty()) return null;
        if (value.length() > 100000 || !value.startsWith("data:image/jpeg;base64,"))
            throw new IllegalArgumentException("Choose a JPEG profile photo under 75 KB.");
        try {
            byte[] bytes = Base64.getDecoder().decode(value.substring(23));
            try (var input = ImageIO.createImageInputStream(new ByteArrayInputStream(bytes))) {
                var readers = ImageIO.getImageReaders(input);
                if (!readers.hasNext()) throw new IllegalArgumentException("Invalid profile photo.");
                var reader = readers.next();
                try {
                    reader.setInput(input);
                    if (!reader.getFormatName().equalsIgnoreCase("JPEG") || reader.getWidth(0) > 512 || reader.getHeight(0) > 512)
                        throw new IllegalArgumentException("Use a JPEG photo at most 512 by 512 pixels.");
                    if (reader.read(0) == null) throw new IllegalArgumentException("Invalid profile photo.");
                } finally { reader.dispose(); }
            }
            return value;
        } catch (java.io.IOException | IllegalArgumentException error) {
            throw new IllegalArgumentException("Choose a valid JPEG profile photo at most 512 by 512 pixels.");
        }
    }
}
