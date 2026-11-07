package lk.osini.smartcity360.pattern.decorator;

public final class PlainMeterStream implements MeterStream {
    @Override public byte[] encode(byte[] data, String credential) { return copy(data); }
    @Override public byte[] decode(byte[] data, String credential) { return copy(data); }
    private byte[] copy(byte[] data) {
        if (data == null || data.length > MAX_BYTES) throw new IllegalArgumentException("Meter message exceeds the allowed size.");
        return data.clone();
    }
}
