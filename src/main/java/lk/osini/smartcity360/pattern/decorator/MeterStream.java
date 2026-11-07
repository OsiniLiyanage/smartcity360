package lk.osini.smartcity360.pattern.decorator;

/** A bounded meter message, transformed without changing the common interface. */
public interface MeterStream {
    int MAX_BYTES = 65536;
    byte[] encode(byte[] data, String credential);
    byte[] decode(byte[] data, String credential);
}
