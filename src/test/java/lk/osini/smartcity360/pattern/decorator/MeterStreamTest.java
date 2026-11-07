package lk.osini.smartcity360.pattern.decorator;

import org.junit.jupiter.api.Test;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.io.*;
import java.util.zip.GZIPOutputStream;
import static org.junit.jupiter.api.Assertions.*;

class MeterStreamTest {
    private final SecretKeySpec key = new SecretKeySpec(new byte[32], "AES"); // Test fixture only.
    private final String token = "unit-test-credential";
    private final byte[] data = "{\"meter\":1,\"usageKwh\":12.125,\"note\":\"සිංහල\"}".getBytes(StandardCharsets.UTF_8);
    private MeterStream layers(int mask) {
        MeterStream stream = new PlainMeterStream();
        if ((mask & 1) != 0) stream = new CompressionDecorator(stream);
        if ((mask & 2) != 0) stream = new EncryptionDecorator(stream, key);
        if ((mask & 4) != 0) stream = new AuthenticationDecorator(stream, AuthenticationDecorator.hash(token));
        return stream;
    }
    @Test void allEightLayerCombinationsRecoverExactBytes() {
        for (int mask = 0; mask < 8; mask++) {
            MeterStream stream = layers(mask);
            assertArrayEquals(data, stream.decode(stream.encode(data, token), token), "Combination " + mask);
        }
    }
    @Test void invalidCredentialIsRejectedBeforeDelegating() {
        MeterStream shouldNotRun = new MeterStream() {
            public byte[] encode(byte[] data, String credential) { fail("Authentication must happen first"); return null; }
            public byte[] decode(byte[] data, String credential) { fail("Authentication must happen first"); return null; }
        };
        MeterStream stream = new AuthenticationDecorator(shouldNotRun, AuthenticationDecorator.hash(token));
        assertThrows(CredentialRejectedException.class, () -> stream.encode(data, "wrong"));
        assertThrows(CredentialRejectedException.class, () -> stream.decode(data, null));
    }
    @Test void encryptedMessagesUseDifferentNoncesAndRejectTampering() {
        MeterStream stream = layers(2);
        byte[] first = stream.encode(data, token);
        assertFalse(Arrays.equals(first, stream.encode(data, token)));
        first[first.length - 1] ^= 1;
        assertThrows(IllegalArgumentException.class, () -> stream.decode(first, token));
        assertThrows(IllegalArgumentException.class, () -> stream.decode(new byte[5], token));
    }
    @Test void wrongEncryptionKeyCannotRecoverData() {
        byte[] alternate = new byte[32]; alternate[0] = 1;
        MeterStream other = new EncryptionDecorator(new PlainMeterStream(), new SecretKeySpec(alternate, "AES"));
        assertThrows(IllegalArgumentException.class, () -> other.decode(layers(2).encode(data, token), token));
    }
    @Test void compressionReducesRepetitiveDataAndRejectsCorruption() {
        MeterStream stream = layers(1);
        byte[] repetitive = "meter-reading;".repeat(1000).getBytes(StandardCharsets.UTF_8);
        byte[] compressed = stream.encode(repetitive, token);
        assertTrue(compressed.length < repetitive.length);
        assertArrayEquals(repetitive, stream.decode(compressed, token));
        compressed[0] ^= 1;
        assertThrows(IllegalArgumentException.class, () -> stream.decode(compressed, token));
    }
    @Test void decompressionIsBounded() throws IOException {
        ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        try (GZIPOutputStream gzip = new GZIPOutputStream(bytes)) { gzip.write(new byte[MeterStream.MAX_BYTES + 1]); }
        assertThrows(IllegalArgumentException.class, () -> layers(1).decode(bytes.toByteArray(), token));
    }
    @Test void baseDoesNotMutateOrExposeInputAndRejectsOversizedMessages() {
        byte[] input = data.clone();
        byte[] result = layers(0).encode(input, null);
        result[0] ^= 1;
        assertArrayEquals(data, input);
        assertThrows(IllegalArgumentException.class, () -> layers(0).encode(new byte[MeterStream.MAX_BYTES + 1], null));
    }
}
