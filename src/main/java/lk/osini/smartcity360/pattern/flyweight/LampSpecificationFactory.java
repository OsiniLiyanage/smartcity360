package lk.osini.smartcity360.pattern.flyweight;

import jakarta.enterprise.context.ApplicationScoped;
import java.util.concurrent.ConcurrentHashMap;
import java.util.Map;
import java.util.Objects;

/** Flyweight factory/pool, not a separate selected design pattern. */
@ApplicationScoped
public class LampSpecificationFactory {
    private record Key(String model, int watts, LightColour colour) { }
    private final Map<Key, LampSpecification> pool = new ConcurrentHashMap<>();

    public LampSpecification get(String model, int watts, LightColour colour) {
        if (model == null || model.isBlank() || model.strip().length() > 100)
            throw new IllegalArgumentException("Model must contain 1 to 100 characters.");
        if (watts < 1 || watts > 1000) throw new IllegalArgumentException("Rated watts must be 1 to 1000.");
        Key key = new Key(model.strip(), watts, Objects.requireNonNull(colour));
        return pool.computeIfAbsent(key, value -> new LampSpecification(value.model(), value.watts(), value.colour()));
    }
    public int size() { return pool.size(); }
}
