package lk.osini.smartcity360.service;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import jakarta.persistence.PersistenceContext;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.BadRequestException;
import jakarta.ws.rs.NotFoundException;
import lk.osini.smartcity360.entity.City;
import lk.osini.smartcity360.entity.ZoneEntity;
import lk.osini.smartcity360.pattern.composite.*;
import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@ApplicationScoped
public class ZoneService {
    @PersistenceContext(unitName = "SmartCity360PU")
    private EntityManager em;

    public ZoneComponent tree(long cityId) {
        return load(city(cityId, false)).root;
    }

    @Transactional
    public ZoneComponent create(long cityId, Long parentId, String name, ZoneType type) {
        City city = city(cityId, true);
        if (name == null || name.isBlank() || name.strip().length() > 100) {
            throw new BadRequestException("Enter a name between 1 and 100 characters.");
        }
        if (type == null || type == ZoneType.CITY) {
            throw new BadRequestException("Choose district, street or building.");
        }
        ZoneType parentType = parentId == null ? ZoneType.CITY : zone(cityId, parentId).getType();
        if (!parentType.accepts(type)) {
            throw new BadRequestException("Use the city / district / street / building order.");
        }
        em.persist(new ZoneEntity(cityId, parentId, name.strip(), type));
        em.flush();
        return load(city).root;
    }

    @Transactional
    public ZoneComponent usage(long cityId, long zoneId, BigDecimal value) {
        City city = city(cityId, true);
        ZoneEntity zone = zone(cityId, zoneId);
        if (zone.getType() != ZoneType.BUILDING) {
            throw new BadRequestException("Record usage on a building; group totals are calculated.");
        }
        if (value == null || value.signum() < 0 || value.compareTo(new BigDecimal("999999999.999")) > 0
                || value.stripTrailingZeros().scale() > 3) {
            throw new BadRequestException("Usage must be 0 to 999999999.999 kWh, with at most 3 decimal places.");
        }
        zone.setUsageKwh(value);
        em.flush();
        return load(city).root;
    }

    @Transactional
    public ZoneComponent power(long cityId, Long zoneId, boolean on) {
        City city = city(cityId, true);
        Tree snapshot = load(city);
        ZoneComponent target = zoneId == null ? snapshot.root : snapshot.nodes.get(zoneId);
        if (target == null) throw new NotFoundException("Zone not found in this city.");
        // The actual command is delegated recursively by the Composite, not by SQL.
        target.setPower(on);
        for (ZoneEntity row : snapshot.rows) {
            ZoneComponent component = snapshot.nodes.get(row.getId());
            if (component instanceof Building building) row.setPowerOn(building.isPowerOn());
        }
        em.flush();
        return snapshot.root;
    }

    private City city(long id, boolean lock) {
        // All hierarchy mutations lock the same city row to serialize simultaneous commands.
        City city = lock ? em.find(City.class, id, LockModeType.PESSIMISTIC_WRITE) : em.find(City.class, id);
        if (city == null) throw new NotFoundException("City not found.");
        return city;
    }

    private ZoneEntity zone(long cityId, long id) {
        ZoneEntity zone = em.find(ZoneEntity.class, id);
        if (zone == null || zone.getCityId() != cityId) throw new NotFoundException("Zone not found in this city.");
        return zone;
    }

    private Tree load(City city) {
        List<ZoneEntity> rows = em.createQuery("SELECT z FROM ZoneEntity z WHERE z.cityId = :city ORDER BY z.id", ZoneEntity.class)
                .setParameter("city", city.getId()).getResultList();
        ZoneGroup root = new ZoneGroup(city.getId(), city.getName(), ZoneType.CITY);
        Map<Long, ZoneComponent> nodes = new LinkedHashMap<>();
        for (ZoneEntity row : rows) {
            ZoneComponent node = row.getType() == ZoneType.BUILDING
                    ? new Building(row.getId(), row.getName(), row.getUsageKwh(), row.getPowerOn())
                    : new ZoneGroup(row.getId(), row.getName(), row.getType());
            nodes.put(row.getId(), node);
        }
        for (ZoneEntity row : rows) {
            ZoneComponent parent = row.getParentId() == null ? root : nodes.get(row.getParentId());
            if (!(parent instanceof ZoneGroup group)) throw new IllegalStateException("Invalid stored zone hierarchy.");
            group.add(nodes.get(row.getId()));
        }
        return new Tree(root, nodes, rows);
    }

    private static class Tree {
        final ZoneGroup root;
        final Map<Long, ZoneComponent> nodes;
        final List<ZoneEntity> rows;
        Tree(ZoneGroup root, Map<Long, ZoneComponent> nodes, List<ZoneEntity> rows) {
            this.root = root; this.nodes = nodes; this.rows = rows;
        }
    }
}
