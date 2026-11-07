package lk.osini.smartcity360.pattern.decorator;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;

public final class AuthenticationDecorator extends MeterStreamDecorator {
    private final byte[] expectedHash;
    public AuthenticationDecorator(MeterStream wrapped, byte[] expectedHash) {
        super(wrapped);
        if (expectedHash == null || expectedHash.length != 32) throw new IllegalArgumentException("A SHA-256 credential hash is required.");
        this.expectedHash = expectedHash.clone();
    }
    public static byte[] hash(String credential) {
        try { return MessageDigest.getInstance("SHA-256").digest(credential.getBytes(StandardCharsets.UTF_8)); }
        catch (NoSuchAlgorithmException exception) { throw new IllegalStateException("SHA-256 is unavailable.", exception); }
    }
    private void verify(String credential) {
        if (credential == null || credential.length() > 200 || !MessageDigest.isEqual(expectedHash, hash(credential)))
            throw new CredentialRejectedException();
    }
    @Override public byte[] encode(byte[] data, String credential) {
        verify(credential);
        return wrapped.encode(data, credential);
    }
    @Override public byte[] decode(byte[] data, String credential) {
        verify(credential);
        return wrapped.decode(data, credential);
    }
}
