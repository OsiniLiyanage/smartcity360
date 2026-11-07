package lk.osini.smartcity360.pattern.flyweight;

import java.util.Objects;

/** Immutable intrinsic state shared by many individual streetlights. */
public final class LampSpecification {
    private final String model;
    private final int ratedWatts;
    private final LightColour colour;

    public LampSpecification(String model, int ratedWatts, LightColour colour) {
        if (model == null || model.isBlank() || model.strip().length() > 100)
            throw new IllegalArgumentException("Model must contain 1 to 100 characters.");
        if (ratedWatts < 1 || ratedWatts > 1000) throw new IllegalArgumentException("Rated watts must be 1 to 1000.");
        this.model = model.strip(); this.ratedWatts = ratedWatts; this.colour = Objects.requireNonNull(colour);
    }
    public String getModel() { return model; }
    public int getRatedWatts() { return ratedWatts; }
    public LightColour getColour() { return colour; }
    // Extrinsic operating state is supplied by each light, never stored in the flyweight.
    public int ratedLoadWatts(boolean powerOn, boolean faulty) { return powerOn && !faulty ? ratedWatts : 0; }
}
