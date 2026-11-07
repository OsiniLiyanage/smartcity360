package lk.osini.smartcity360.pattern.flyweight;

import org.junit.jupiter.api.Test;
import java.util.*;
import java.util.concurrent.*;
import static org.junit.jupiter.api.Assertions.*;

class StreetLightTest {
    @Test void matchingConfigurationReturnsSameInstance() {
        var pool = new LampSpecificationFactory();
        assertSame(pool.get(" CityLED ", 40, LightColour.WARM_WHITE), pool.get("CityLED", 40, LightColour.WARM_WHITE));
        assertEquals(1, pool.size());
    }
    @Test void everyIntrinsicPropertyParticipatesInIdentity() {
        var pool = new LampSpecificationFactory();
        var first = pool.get("CityLED", 40, LightColour.WARM_WHITE);
        assertNotSame(first, pool.get("CityLED", 60, LightColour.WARM_WHITE));
        assertNotSame(first, pool.get("CityLED", 40, LightColour.COOL_WHITE));
        assertNotSame(first, pool.get("AvenueLED", 40, LightColour.WARM_WHITE));
        assertEquals(4, pool.size());
    }
    @Test void locationsPowerAndFaultsRemainIndependent() {
        var spec = new LampSpecificationFactory().get("CityLED", 40, LightColour.WARM_WHITE);
        var first = new StreetLight(1, 10, "Library", spec, true, false);
        var second = new StreetLight(2, 11, "Clinic", spec, true, false);
        first.setPower(false);
        assertEquals(0, first.getRatedLoadWatts()); assertEquals(40, second.getRatedLoadWatts());
        first.setPower(true); first.setFaulty(true);
        assertEquals("FAULT", first.getState()); assertEquals("ON", second.getState());
        assertEquals("Clinic", second.getLocation()); assertSame(first.getSpecification(), second.getSpecification());
        first.setFaulty(false); assertEquals(40, first.getRatedLoadWatts());
    }
    @Test void concurrentLookupsReuseOneSpecification() throws Exception {
        var pool = new LampSpecificationFactory();
        var results = new ArrayList<Future<LampSpecification>>();
        try (var executor = Executors.newFixedThreadPool(8)) {
            for (int i = 0; i < 100; i++) results.add(executor.submit(() -> pool.get("CityLED", 40, LightColour.WARM_WHITE)));
        }
        for (var result : results) assertSame(results.get(0).get(), result.get());
        assertEquals(1, pool.size());
    }
    @Test void hundredThousandLightsShareThreeSpecifications() {
        var pool = new LampSpecificationFactory();
        var lights = new ArrayList<StreetLight>();
        Set<LampSpecification> identities = Collections.newSetFromMap(new IdentityHashMap<>());
        for (int i = 0; i < 100000; i++) {
            var spec = pool.get("Model " + i % 3, 40 + i % 3, LightColour.NEUTRAL_WHITE);
            lights.add(new StreetLight(i, 1, "Position " + i, spec, true, false));
            identities.add(spec);
        }
        lights.get(0).setPower(false);
        assertTrue(lights.get(3).isPowerOn());
        assertEquals(3, identities.size()); assertEquals(3, pool.size()); assertEquals(100000, lights.size());
    }
    @Test void invalidSpecificationsNeverEnterPool() {
        var pool = new LampSpecificationFactory();
        assertThrows(IllegalArgumentException.class, () -> pool.get(" ", 40, LightColour.WARM_WHITE));
        assertThrows(IllegalArgumentException.class, () -> pool.get("Model", 0, LightColour.WARM_WHITE));
        assertThrows(IllegalArgumentException.class, () -> pool.get("Model", 1001, LightColour.WARM_WHITE));
        assertThrows(NullPointerException.class, () -> pool.get("Model", 40, null));
        assertEquals(0, pool.size());
    }
}
