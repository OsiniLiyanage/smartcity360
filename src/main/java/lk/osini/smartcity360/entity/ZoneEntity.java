package lk.osini.smartcity360.entity;

import jakarta.persistence.*;
import lk.osini.smartcity360.pattern.composite.ZoneType;
import java.math.BigDecimal;

@Entity
@Table(name = "zone")
public class ZoneEntity {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "city_id", nullable = false)
    private Long cityId;
    @Column(name = "parent_id")
    private Long parentId;
    @Column(nullable = false, length = 100)
    private String name;
    @Enumerated(EnumType.STRING) @Column(name = "zone_type", nullable = false)
    private ZoneType type;
    @Column(name = "usage_kwh", precision = 12, scale = 3)
    private BigDecimal usageKwh;
    @Column(name = "power_on")
    private Boolean powerOn;

    protected ZoneEntity() { }
    public ZoneEntity(long cityId, Long parentId, String name, ZoneType type) {
        this.cityId = cityId;
        this.parentId = parentId;
        this.name = name;
        this.type = type;
        if (type == ZoneType.BUILDING) { usageKwh = BigDecimal.ZERO; powerOn = true; }
    }
    public Long getId() { return id; }
    public Long getCityId() { return cityId; }
    public Long getParentId() { return parentId; }
    public String getName() { return name; }
    public ZoneType getType() { return type; }
    public BigDecimal getUsageKwh() { return usageKwh; }
    public Boolean getPowerOn() { return powerOn; }
    public void setUsageKwh(BigDecimal value) { usageKwh = value; }
    public void setPowerOn(boolean on) { powerOn = on; }
}
