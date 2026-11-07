package lk.osini.smartcity360.pattern.composite;

import java.math.BigDecimal;
import java.util.List;

/** Common operations for both an individual building and a group of zones. */
public abstract class ZoneComponent {
    private final long id;
    private final String name;
    private final ZoneType type;
    private ZoneGroup parent;

    protected ZoneComponent(long id, String name, ZoneType type) {
        this.id = id;
        this.name = name;
        this.type = type;
    }

    public long getId() { return id; }
    public String getName() { return name; }
    public ZoneType getType() { return type; }

    final void attachTo(ZoneGroup group) {
        if (parent != null) throw new IllegalArgumentException("A zone can belong to only one parent.");
        parent = group;
    }

    public abstract BigDecimal getUsageKwh();
    public abstract void setPower(boolean on);
    public abstract int getBuildingCount();
    public abstract int getPoweredBuildingCount();
    public List<ZoneComponent> getChildren() { return List.of(); }

    public String getPowerState() {
        int total = getBuildingCount();
        int on = getPoweredBuildingCount();
        if (total == 0) return "EMPTY";
        if (on == 0) return "OFF";
        return on == total ? "ON" : "MIXED";
    }
}
