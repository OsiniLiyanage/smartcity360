package lk.osini.smartcity360.pattern.decorator;

import javax.crypto.*;
import javax.crypto.spec.GCMParameterSpec;
import java.nio.ByteBuffer;
import java.security.*;
import java.util.Arrays;

public final class EncryptionDecorator extends MeterStreamDecorator {
    private final SecretKey key;
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final int NONCE_BYTES = 12;
    public EncryptionDecorator(MeterStream wrapped, SecretKey key) {
        super(wrapped); this.key = java.util.Objects.requireNonNull(key);
    }
    @Override public byte[] encode(byte[] data, String credential) {
        byte[] original = wrapped.encode(data, credential);
        byte[] nonce = new byte[NONCE_BYTES];
        RANDOM.nextBytes(nonce);
        try {
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, key, new GCMParameterSpec(128, nonce));
            byte[] ciphertext = cipher.doFinal(original);
            return ByteBuffer.allocate(nonce.length + ciphertext.length).put(nonce).put(ciphertext).array();
        } catch (GeneralSecurityException exception) { throw new IllegalStateException("Encryption is unavailable.", exception); }
    }
    @Override public byte[] decode(byte[] data, String credential) {
        if (data == null || data.length < NONCE_BYTES + 16 || data.length > MAX_BYTES + 2048)
            throw new IllegalArgumentException("Encrypted message has an invalid size.");
        try {
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, key, new GCMParameterSpec(128, Arrays.copyOf(data, NONCE_BYTES)));
            return wrapped.decode(cipher.doFinal(data, NONCE_BYTES, data.length - NONCE_BYTES), credential);
        } catch (GeneralSecurityException exception) { throw new IllegalArgumentException("Encrypted data failed validation.", exception); }
    }
}
