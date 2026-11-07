package lk.osini.smartcity360.pattern.flyweight;

import java.util.Objects;

/** Extrinsic state belongs to this light, while the specification reference is shared. */
public final class StreetLight {
    private final long id;
    private final long streetId;
    private final String location;
    private final LampSpecification specification;
    private boolean powerOn;
    private boolean faulty;

    public StreetLight(long id, long streetId, String location, LampSpecification specification, boolean powerOn, boolean faulty) {
        this.id = id; this.streetId = streetId; this.location = Objects.requireNonNull(location);
        this.specification = Objects.requireNonNull(specification); this.powerOn = powerOn; this.faulty = faulty;
    }
    public long getId() { return id; }
    public long getStreetId() { return streetId; }
    public String getLocation() { return location; }
    public LampSpecification getSpecification() { return specification; }
    public boolean isPowerOn() { return powerOn; }
    public boolean isFaulty() { return faulty; }
    public void setPower(boolean on) { powerOn = on; }
    public void setFaulty(boolean faulty) { this.faulty = faulty; }
    public int getRatedLoadWatts() { return specification.ratedLoadWatts(powerOn, faulty); }
    public String getState() { return faulty ? "FAULT" : powerOn ? "ON" : "OFF"; }
}
