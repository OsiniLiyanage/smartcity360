package lk.osini.smartcity360.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;

@Entity @Table(name = "meter_reading") @Cacheable(false)
public class MeterReading {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "city_id", nullable = false) private Long cityId;
    @Column(name = "meter_id", nullable = false) private Long meterId;
    @Column(name = "usage_kwh", nullable = false, precision = 12, scale = 3) private BigDecimal usageKwh;
    private boolean authenticated;
    private boolean compressed;
    private boolean encrypted;
    @Column(name = "original_bytes") private int originalBytes;
    @Column(name = "encoded_bytes") private int encodedBytes;
    @Column(name = "original_hash", length = 64) private String originalHash;
    @Column(length = 100000) private String payload;
    @Column(name = "received_at") private Instant receivedAt;
    protected MeterReading() { }
    public MeterReading(long cityId, long meterId, BigDecimal usage, boolean auth, boolean compress, boolean encrypt,
                        int originalBytes, int encodedBytes, String hash, String payload, Instant receivedAt) {
        this.cityId = cityId; this.meterId = meterId; usageKwh = usage;
        authenticated = auth; compressed = compress; encrypted = encrypt;
        this.originalBytes = originalBytes; this.encodedBytes = encodedBytes;
        originalHash = hash; this.payload = payload; this.receivedAt = receivedAt;
    }
    public Long getId() { return id; }
    public Long getMeterId() { return meterId; }
    public BigDecimal getUsageKwh() { return usageKwh; }
    public boolean isAuthenticated() { return authenticated; }
    public boolean isCompressed() { return compressed; }
    public boolean isEncrypted() { return encrypted; }
    public int getOriginalBytes() { return originalBytes; }
    public int getEncodedBytes() { return encodedBytes; }
    public String getOriginalHash() { return originalHash; }
    public String getPayload() { return payload; }
    public Instant getReceivedAt() { return receivedAt; }
}
