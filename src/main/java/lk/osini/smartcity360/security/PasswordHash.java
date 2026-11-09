package lk.osini.smartcity360.security;

import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.PBEKeySpec;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;

public final class PasswordHash {
    private static final int ITERATIONS = 600000;
    private static final SecureRandom RANDOM = new SecureRandom();
    private PasswordHash() { }
    public static void validate(String password) {
        if (password == null || password.length() < 8 || password.length() > 128 || password.isBlank())
            throw new IllegalArgumentException("Use a password of 8 to 128 characters.");
    }
    public static String hash(String password) {
        validate(password); byte[] salt = new byte[16]; RANDOM.nextBytes(salt);
        return "pbkdf2-sha256$" + ITERATIONS + "$" + Base64.getEncoder().encodeToString(salt) + "$"
                + Base64.getEncoder().encodeToString(derive(password, salt, ITERATIONS));
    }
    public static boolean verify(String password, String encoded) {
        if (password == null || password.length() > 128 || encoded == null) return false;
        try {
            String[] parts = encoded.split("\\$");
            if (parts.length != 4 || !parts[0].equals("pbkdf2-sha256") || Integer.parseInt(parts[1]) != ITERATIONS) return false;
            byte[] salt = Base64.getDecoder().decode(parts[2]), expected = Base64.getDecoder().decode(parts[3]);
            return salt.length == 16 && expected.length == 32 && MessageDigest.isEqual(expected, derive(password, salt, ITERATIONS));
        } catch (IllegalArgumentException error) { return false; }
    }
    private static byte[] derive(String password, byte[] salt, int iterations) {
        PBEKeySpec spec = new PBEKeySpec(password.toCharArray(), salt, iterations, 256);
        try { return SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256").generateSecret(spec).getEncoded(); }
        catch (java.security.GeneralSecurityException error) { throw new IllegalStateException("Password hashing unavailable.", error); }
        finally { spec.clearPassword(); }
    }
    public static String randomToken() { byte[] bytes = new byte[32]; RANDOM.nextBytes(bytes); return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes); }
}
