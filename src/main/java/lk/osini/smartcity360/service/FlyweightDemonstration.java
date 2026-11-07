package lk.osini.smartcity360.service;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.ws.rs.BadRequestException;
import lk.osini.smartcity360.pattern.flyweight.*;
import java.util.*;

@ApplicationScoped
public class FlyweightDemonstration {
    public record Result(int lights, int sharedSpecifications, int unsharedSpecifications,
                         int avoidedSpecificationObjects, boolean independentState, double elapsedMilliseconds) { }

    // Serialize demonstrations to bound temporary allocation. No live pool or database records are changed.
    public synchronized Result run(int count) {
        if (count < 10 || count > 100000) throw new BadRequestException("Choose 10 to 100000 demonstration lights.");
        long start = System.nanoTime();
        var pool = new LampSpecificationFactory();
        List<StreetLight> lights = new ArrayList<>(count);
        Set<LampSpecification> shared = Collections.newSetFromMap(new IdentityHashMap<>());
        Set<LampSpecification> unshared = Collections.newSetFromMap(new IdentityHashMap<>());
        for (int i = 0; i < count; i++) {
            String model = "Demo model " + i % 3;
            int watts = 40 + i % 3 * 20;
            LampSpecification spec = pool.get(model, watts, LightColour.NEUTRAL_WHITE);
            lights.add(new StreetLight(i, 1, "Demonstration position " + i, spec, true, false));
            shared.add(spec);
            unshared.add(new LampSpecification(model, watts, LightColour.NEUTRAL_WHITE));
        }
        lights.get(0).setPower(false);
        boolean independent = !lights.get(0).isPowerOn() && lights.get(3).isPowerOn()
                && lights.get(0).getSpecification() == lights.get(3).getSpecification();
        return new Result(lights.size(), shared.size(), unshared.size(), unshared.size() - shared.size(),
                independent, (System.nanoTime() - start) / 1000000.0);
    }
}
