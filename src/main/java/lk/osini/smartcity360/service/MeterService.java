package lk.osini.smartcity360.service;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.json.*;
import jakarta.persistence.*;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.*;
import lk.osini.smartcity360.entity.*;
import lk.osini.smartcity360.pattern.composite.ZoneType;
import lk.osini.smartcity360.pattern.decorator.*;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.time.Instant;
import java.util.*;

@ApplicationScoped
public class MeterService {
    @PersistenceContext(unitName = "SmartCity360PU") private EntityManager em;
    @Inject private MeterKeyStore keyStore;
    @Inject private ZoneService zones;
    public record Issued(Meter meter, String credential) { }

    public List<Meter> list(long cityId) {
        city(cityId, false);
        return em.createQuery("SELECT m FROM Meter m WHERE m.cityId = :city ORDER BY m.id", Meter.class)
                .setParameter("city", cityId).getResultList();
    }
    @Transactional
    public Issued register(long cityId, long zoneId, String name) {
        city(cityId, true);
        ZoneEntity building = em.find(ZoneEntity.class, zoneId);
        if (building == null || building.getCityId() != cityId) throw new NotFoundException("Building not found in this city.");
        if (building.getType() != ZoneType.BUILDING) throw new BadRequestException("A meter must belong to a building.");
        if (name == null || name.isBlank() || name.strip().length() > 100) throw new BadRequestException("Meter name must contain 1 to 100 characters.");
        long count = em.createQuery("SELECT COUNT(m) FROM Meter m WHERE m.cityId = :city AND m.zoneId = :zone", Long.class)
                .setParameter("city", cityId).setParameter("zone", zoneId).getSingleResult();
        if (count != 0) throw new ClientErrorException("This building already has a meter.", 409);
        String credential = credential();
        Meter meter = new Meter(cityId, zoneId, name.strip(), hash(credential));
        em.persist(meter); em.flush();
        return new Issued(meter, credential);
    }
    @Transactional
    public Issued replaceCredential(long cityId, long meterId) {
        city(cityId, true);
        Meter meter = meter(cityId, meterId);
        em.refresh(meter);
        String credential = credential();
        meter.replaceCredential(hash(credential));
        em.flush();
        return new Issued(meter, credential);
    }
    public List<MeterReading> readings(long cityId, long meterId) {
        meter(cityId, meterId);
        return em.createQuery("SELECT r FROM MeterReading r WHERE r.cityId = :city AND r.meterId = :meter ORDER BY r.id DESC", MeterReading.class)
                .setParameter("city", cityId).setParameter("meter", meterId).getResultList();
    }

    @Transactional
    public MeterReading submit(long cityId, long meterId, BigDecimal usage, boolean auth, boolean compress, boolean encrypt, String credential) {
        city(cityId, true);
        Meter meter = meter(cityId, meterId);
        if (usage == null || usage.signum() < 0 || usage.compareTo(new BigDecimal("999999999.999")) > 0
                || usage.stripTrailingZeros().scale() > 3) throw new BadRequestException("Usage must be 0 to 999999999.999 kWh, with at most 3 decimal places.");
        Instant now = Instant.now().truncatedTo(java.time.temporal.ChronoUnit.MILLIS);
        byte[] original = Json.createObjectBuilder().add("meterId", meterId).add("buildingId", meter.getZoneId())
                .add("usageKwh", usage).add("receivedAt", now.toString()).build().toString().getBytes(StandardCharsets.UTF_8);
        MeterStream stream = stream(meter, auth, compress, encrypt);
        byte[] encoded;
        try {
            encoded = stream.encode(original, credential);
            if (!Arrays.equals(original, stream.decode(encoded, credential)))
                throw new IllegalStateException("Meter message did not round-trip.");
        } catch (CredentialRejectedException exception) { throw new ClientErrorException(exception.getMessage(), 401); }
        // Only a successfully processed and recovered message can update the building.
        zones.usage(cityId, meter.getZoneId(), usage);
        MeterReading reading = new MeterReading(cityId, meterId, usage, auth, compress, encrypt,
                original.length, encoded.length, digest(original), Base64.getEncoder().encodeToString(encoded), now);
        em.persist(reading); em.flush();
        return reading;
    }

    public String recover(long cityId, long meterId, long readingId, String credential, boolean tamper) {
        Meter meter = meter(cityId, meterId);
        MeterReading reading = em.find(MeterReading.class, readingId);
        if (reading == null || reading.getMeterId() != meterId) throw new NotFoundException("Reading not found for this meter.");
        byte[] encoded = Base64.getDecoder().decode(reading.getPayload());
        if (tamper) encoded[encoded.length - 1] ^= 1; // Work on a copy; never alter the saved record.
        try {
            byte[] recovered = stream(meter, reading.isAuthenticated(), reading.isCompressed(), reading.isEncrypted()).decode(encoded, credential);
            if (!MessageDigest.isEqual(HexFormat.of().parseHex(reading.getOriginalHash()), HexFormat.of().parseHex(digest(recovered))))
                throw new BadRequestException("Recovered message does not match the original.");
            return new String(recovered, StandardCharsets.UTF_8);
        } catch (CredentialRejectedException exception) { throw new ClientErrorException(exception.getMessage(), 401); }
        catch (IllegalArgumentException exception) { throw new BadRequestException("Stored message or its test copy failed validation."); }
    }
    private MeterStream stream(Meter meter, boolean auth, boolean compress, boolean encrypt) {
        MeterStream stream = new PlainMeterStream();
        if (compress) stream = new CompressionDecorator(stream);
        if (encrypt) {
            long encryptedCount = em.createQuery("SELECT COUNT(r) FROM MeterReading r WHERE r.encrypted = true", Long.class).getSingleResult();
            stream = new EncryptionDecorator(stream, keyStore.key(encryptedCount == 0));
        }
        if (auth) stream = new AuthenticationDecorator(stream, HexFormat.of().parseHex(meter.getCredentialHash()));
        return stream;
    }
    private void city(long cityId, boolean lock) {
        City city = lock ? em.find(City.class, cityId, LockModeType.PESSIMISTIC_WRITE) : em.find(City.class, cityId);
        if (city == null) throw new NotFoundException("City not found.");
    }
    private Meter meter(long cityId, long meterId) {
        Meter meter = em.find(Meter.class, meterId);
        if (meter == null || meter.getCityId() != cityId) throw new NotFoundException("Meter not found in this city.");
        return meter;
    }
    private String credential() {
        byte[] bytes = new byte[32]; new SecureRandom().nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
    private String hash(String value) { return HexFormat.of().formatHex(AuthenticationDecorator.hash(value)); }
    private String digest(byte[] bytes) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes)); }
        catch (NoSuchAlgorithmException exception) { throw new IllegalStateException(exception); }
    }
}
