package lk.osini.smartcity360.pattern.composite;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

/** Composite: delegates the same operation to each child, recursively. */
public class ZoneGroup extends ZoneComponent {
    private final List<ZoneComponent> children = new ArrayList<>();

    public ZoneGroup(long id, String name, ZoneType type) {
        super(id, name, type);
        if (type == null || type == ZoneType.BUILDING) {
            throw new IllegalArgumentException("A building is a leaf, not a group.");
        }
    }

    public void add(ZoneComponent child) {
        if (child == null || !getType().accepts(child.getType())) {
            throw new IllegalArgumentException("Use the city / district / street / building order.");
        }
        if (children.stream().anyMatch(existing -> existing.getId() == child.getId())) {
            throw new IllegalArgumentException("This zone is already present.");
        }
        // The strict type order also prevents self-links and ancestor cycles.
        child.attachTo(this);
        children.add(child);
    }

    @Override public List<ZoneComponent> getChildren() { return List.copyOf(children); }

    @Override public BigDecimal getUsageKwh() {
        BigDecimal total = BigDecimal.ZERO;
        for (ZoneComponent child : children) total = total.add(child.getUsageKwh());
        return total;
    }

    @Override public void setPower(boolean on) {
        for (ZoneComponent child : children) child.setPower(on);
    }

    @Override public int getBuildingCount() {
        return children.stream().mapToInt(ZoneComponent::getBuildingCount).sum();
    }

    @Override public int getPoweredBuildingCount() {
        return children.stream().mapToInt(ZoneComponent::getPoweredBuildingCount).sum();
    }
}
