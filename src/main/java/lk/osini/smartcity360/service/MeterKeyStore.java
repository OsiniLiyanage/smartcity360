package lk.osini.smartcity360.service;

import jakarta.enterprise.context.ApplicationScoped;
import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import java.nio.file.*;
import java.io.IOException;
import java.security.SecureRandom;

/** Private domain-local key, independent of WAR redeployments. Never returned by an API. */
@ApplicationScoped
public class MeterKeyStore {
    private SecretKey cached;
    public synchronized SecretKey key(boolean allowCreate) {
        if (cached != null) return cached;
        String domain = System.getProperty("com.sun.aas.instanceRoot");
        if (domain == null) throw new IllegalStateException("Payara domain path is unavailable.");
        Path file = Path.of(domain, "config", "smartcity360-meter.key");
        try {
            if (!Files.exists(file)) {
                if (!allowCreate) throw new IllegalStateException("Restore the existing meter key from the private backup.");
                byte[] generated = new byte[32];
                new SecureRandom().nextBytes(generated);
                // CREATE_NEW prevents overwriting an existing key. A partial/corrupt key fails closed below.
                Files.write(file, generated, StandardOpenOption.CREATE_NEW, StandardOpenOption.WRITE);
            }
            byte[] bytes = Files.readAllBytes(file);
            if (bytes.length != 32) throw new IllegalStateException("Meter key file is invalid; restore the private backup.");
            cached = new SecretKeySpec(bytes, "AES");
            return cached;
        } catch (IOException exception) { throw new IllegalStateException("Meter key storage is unavailable.", exception); }
    }
}
