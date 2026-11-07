package lk.osini.smartcity360.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity @Table(name = "meter") @Cacheable(false)
public class Meter {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "city_id", nullable = false) private Long cityId;
    @Column(name = "zone_id", nullable = false) private Long zoneId;
    @Column(nullable = false, length = 100) private String name;
    @Column(name = "credential_hash", nullable = false, length = 64) private String credentialHash;
    @Column(name = "created_at", nullable = false) private Instant createdAt;
    protected Meter() { }
    public Meter(long cityId, long zoneId, String name, String hash) {
        this.cityId = cityId; this.zoneId = zoneId; this.name = name; credentialHash = hash;
        createdAt = Instant.now().truncatedTo(java.time.temporal.ChronoUnit.MILLIS);
    }
    public Long getId() { return id; }
    public Long getCityId() { return cityId; }
    public Long getZoneId() { return zoneId; }
    public String getName() { return name; }
    public String getCredentialHash() { return credentialHash; }
    public void replaceCredential(String hash) { credentialHash = hash; }
}
