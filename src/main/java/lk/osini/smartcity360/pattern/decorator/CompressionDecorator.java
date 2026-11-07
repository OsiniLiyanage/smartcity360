package lk.osini.smartcity360.pattern.decorator;

import java.io.*;
import java.util.zip.*;

public final class CompressionDecorator extends MeterStreamDecorator {
    public CompressionDecorator(MeterStream wrapped) { super(wrapped); }
    @Override public byte[] encode(byte[] data, String credential) {
        byte[] original = wrapped.encode(data, credential);
        try {
            ByteArrayOutputStream output = new ByteArrayOutputStream();
            try (GZIPOutputStream gzip = new GZIPOutputStream(output)) { gzip.write(original); }
            return output.toByteArray();
        } catch (IOException exception) { throw new IllegalStateException("Compression failed.", exception); }
    }
    @Override public byte[] decode(byte[] data, String credential) {
        if (data == null || data.length > MAX_BYTES + 1024) throw new IllegalArgumentException("Compressed message is too large.");
        try (GZIPInputStream gzip = new GZIPInputStream(new ByteArrayInputStream(data))) {
            byte[] decoded = gzip.readNBytes(MAX_BYTES + 1);
            if (decoded.length > MAX_BYTES) throw new IllegalArgumentException("Expanded message exceeds the allowed size.");
            return wrapped.decode(decoded, credential);
        } catch (IOException exception) { throw new IllegalArgumentException("Compressed data failed validation.", exception); }
    }
}
