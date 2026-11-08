package lk.osini.smartcity360.security;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.ws.rs.ClientErrorException;
import jakarta.ws.rs.core.Response;
import java.time.Clock;
import java.util.HashMap;
import java.util.Map;

/** Per-address attempt limits for the local, single-instance application. */
@ApplicationScoped
public class LoginLimiter {
    private record Window(long start, int attempts) { }
    private final Map<String, Window> windows = new HashMap<>();
    private final Clock clock;
    public LoginLimiter() { this(Clock.systemUTC()); }
    public LoginLimiter(Clock clock) { this.clock = clock; }
    public void attempt(String key, int limit) {
        if (!allow(key,limit)) throw new ClientErrorException("Too many attempts. Wait a minute before trying again.", Response.status(429).header("Retry-After", "60").build());
    }
    public synchronized boolean allow(String key, int limit) {
        long now = clock.millis();
        windows.entrySet().removeIf(entry -> now - entry.getValue().start >= 60000);
        Window previous = windows.get(key);
        if (previous != null && previous.attempts >= limit || previous == null && windows.size() >= 10000)
            return false;
        windows.put(key, new Window(previous == null ? now : previous.start, previous == null ? 1 : previous.attempts + 1));
        return true;
    }
}
