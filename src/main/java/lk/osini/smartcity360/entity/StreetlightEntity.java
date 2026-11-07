package lk.osini.smartcity360.entity;

import jakarta.persistence.*;

@Entity @Table(name = "streetlight") @Cacheable(false)
public class StreetlightEntity {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "city_id", nullable = false) private Long cityId;
    @Column(name = "street_id", nullable = false) private Long streetId;
    @Column(name = "specification_id", nullable = false) private Long specificationId;
    @Column(nullable = false, length = 60) private String label;
    @Column(nullable = false, length = 150) private String location;
    @Column(name = "power_on", nullable = false) private boolean powerOn;
    @Column(nullable = false) private boolean faulty;
    @Column(name = "fault_note", nullable = false, length = 500) private String faultNote;
    @Version private long version;
    protected StreetlightEntity() { }
    public StreetlightEntity(long cityId, long streetId, long specId, String label, String location) {
        this.cityId = cityId; this.streetId = streetId;
        update(specId, label, location, true, false, "");
    }
    public void update(long specId, String label, String location, boolean on, boolean faulty, String note) {
        specificationId = specId; this.label = label; this.location = location;
        powerOn = on; this.faulty = faulty; faultNote = note;
    }
    public Long getId() { return id; }
    public Long getCityId() { return cityId; }
    public Long getStreetId() { return streetId; }
    public Long getSpecificationId() { return specificationId; }
    public String getLabel() { return label; }
    public String getLocation() { return location; }
    public boolean isPowerOn() { return powerOn; }
    public boolean isFaulty() { return faulty; }
    public String getFaultNote() { return faultNote; }
    public long getVersion() { return version; }
}
