package lk.osini.smartcity360.pattern.composite;

import java.math.BigDecimal;

/** Leaf: owns a recorded usage value and an independent simulated power state. */
public class Building extends ZoneComponent {
    private final BigDecimal usageKwh;
    private boolean powerOn;

    public Building(long id, String name, BigDecimal usageKwh, boolean powerOn) {
        super(id, name, ZoneType.BUILDING);
        if (usageKwh == null || usageKwh.signum() < 0) {
            throw new IllegalArgumentException("Usage cannot be negative.");
        }
        this.usageKwh = usageKwh;
        this.powerOn = powerOn;
    }

    @Override public BigDecimal getUsageKwh() { return usageKwh; }
    @Override public void setPower(boolean on) { powerOn = on; }
    @Override public int getBuildingCount() { return 1; }
    @Override public int getPoweredBuildingCount() { return powerOn ? 1 : 0; }
    public boolean isPowerOn() { return powerOn; }
}
