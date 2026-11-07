package lk.osini.smartcity360.service;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.*;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.*;
import lk.osini.smartcity360.entity.*;
import lk.osini.smartcity360.pattern.composite.ZoneType;
import lk.osini.smartcity360.pattern.flyweight.*;
import java.util.*;
import java.util.stream.Collectors;

@ApplicationScoped
public class StreetlightService {
    @PersistenceContext(unitName = "SmartCity360PU") private EntityManager em;
    @Inject private LampSpecificationFactory pool;
    public record View(StreetlightEntity row, StreetLight light) { }
    public record Page(List<View> items, int page, int pageSize, long total, long on, long faulty,
                       long ratedLoadWatts, long distinctSpecifications, int pageSpecificationObjects) { }

    public List<LampSpecificationEntity> specifications() {
        return em.createQuery("SELECT s FROM LampSpecificationEntity s ORDER BY s.id", LampSpecificationEntity.class).getResultList();
    }
    @Transactional
    public LampSpecificationEntity saveSpecification(String model, int watts, LightColour colour) {
        model = text(model, 100, "Model");
        if (watts < 1 || watts > 1000 || colour == null) throw new BadRequestException("Choose 1 to 1000 watts and a valid colour.");
        // Unique immutable configurations, including simultaneous identical requests.
        em.createNativeQuery("INSERT INTO lamp_specification(model,rated_watts,colour) VALUES (?1,?2,?3) ON CONFLICT (model,rated_watts,colour) DO NOTHING")
                .setParameter(1, model).setParameter(2, watts).setParameter(3, colour.name()).executeUpdate();
        return em.createQuery("SELECT s FROM LampSpecificationEntity s WHERE s.model = :model AND s.ratedWatts = :watts AND s.colour = :colour", LampSpecificationEntity.class)
                .setParameter("model", model).setParameter("watts", watts).setParameter("colour", colour).getSingleResult();
    }

    public Page list(long cityId, int page, int pageSize) {
        city(cityId, false);
        if (page < 0 || page > 100000 || pageSize < 1 || pageSize > 100)
            throw new BadRequestException("Use page 0 to 100000 and pageSize 1 to 100.");
        List<StreetlightEntity> rows = em.createQuery("SELECT l FROM StreetlightEntity l WHERE l.cityId = :city ORDER BY l.id", StreetlightEntity.class)
                .setParameter("city", cityId).setFirstResult(page * pageSize).setMaxResults(pageSize).getResultList();
        Map<Long, LampSpecification> specs = new HashMap<>();
        if (!rows.isEmpty()) {
            var ids = rows.stream().map(StreetlightEntity::getSpecificationId).collect(Collectors.toSet());
            for (var spec : em.createQuery("SELECT s FROM LampSpecificationEntity s WHERE s.id IN :ids", LampSpecificationEntity.class)
                    .setParameter("ids", ids).getResultList()) specs.put(spec.getId(), shared(spec));
        }
        List<View> views = rows.stream().map(row -> view(row, specs.get(row.getSpecificationId()))).toList();
        Set<LampSpecification> identities = Collections.newSetFromMap(new IdentityHashMap<>());
        views.forEach(view -> identities.add(view.light().getSpecification()));
        Object[] totals = (Object[]) em.createNativeQuery(
                "SELECT count(*), count(*) FILTER (WHERE l.power_on AND NOT l.faulty), count(*) FILTER (WHERE l.faulty), " +
                "coalesce(sum(CASE WHEN l.power_on AND NOT l.faulty THEN s.rated_watts ELSE 0 END),0), count(DISTINCT l.specification_id) " +
                "FROM streetlight l JOIN lamp_specification s ON s.id=l.specification_id WHERE l.city_id=?1")
                .setParameter(1, cityId).getSingleResult();
        return new Page(views, page, pageSize, number(totals[0]), number(totals[1]), number(totals[2]), number(totals[3]), number(totals[4]), identities.size());
    }
    public View detail(long cityId, long id) {
        var row = find(cityId, id);
        return view(row, shared(specification(row.getSpecificationId())));
    }
    @Transactional
    public View create(long cityId, long streetId, long specId, String label, String location) {
        city(cityId, true);
        ZoneEntity street = em.find(ZoneEntity.class, streetId);
        if (street == null || street.getCityId() != cityId) throw new NotFoundException("Street not found in this city.");
        if (street.getType() != ZoneType.STREET) throw new BadRequestException("Streetlights must belong to a street.");
        label = text(label, 60, "Pole label"); location = text(location, 150, "Location");
        uniqueLabel(cityId, label, -1);
        LampSpecification spec = shared(specification(specId));
        StreetlightEntity row = new StreetlightEntity(cityId, streetId, specId, label, location);
        em.persist(row); em.flush();
        return view(row, spec);
    }
    @Transactional
    public View update(long cityId, long id, long version, long specId, String label, String location, boolean on, boolean faulty, String note) {
        city(cityId, true);
        StreetlightEntity row = find(cityId, id);
        em.refresh(row);
        if (row.getVersion() != version) throw new ClientErrorException("This light changed. Refresh before saving again.", 409);
        label = text(label, 60, "Pole label"); location = text(location, 150, "Location");
        note = faulty ? text(note, 500, "Fault note") : "";
        uniqueLabel(cityId, label, id);
        LampSpecification spec = shared(specification(specId));
        row.update(specId, label, location, on, faulty, note); em.flush();
        return view(row, spec);
    }
    private void uniqueLabel(long cityId, String label, long exceptId) {
        if (em.createQuery("SELECT COUNT(l) FROM StreetlightEntity l WHERE l.cityId = :city AND l.label = :label AND l.id <> :id", Long.class)
                .setParameter("city", cityId).setParameter("label", label).setParameter("id", exceptId).getSingleResult() != 0)
            throw new ClientErrorException("This pole label already exists in this city.", 409);
    }
    private View view(StreetlightEntity row, LampSpecification spec) {
        return new View(row, new StreetLight(row.getId(), row.getStreetId(), row.getLocation(), spec, row.isPowerOn(), row.isFaulty()));
    }
    private LampSpecification shared(LampSpecificationEntity spec) {
        return pool.get(spec.getModel(), spec.getRatedWatts(), spec.getColour());
    }
    private LampSpecificationEntity specification(long id) {
        var spec = em.find(LampSpecificationEntity.class, id);
        if (spec == null) throw new NotFoundException("Lamp specification not found.");
        return spec;
    }
    private StreetlightEntity find(long cityId, long id) {
        var row = em.find(StreetlightEntity.class, id);
        if (row == null || row.getCityId() != cityId) throw new NotFoundException("Streetlight not found in this city.");
        return row;
    }
    private void city(long id, boolean lock) {
        City city = lock ? em.find(City.class, id, LockModeType.PESSIMISTIC_WRITE) : em.find(City.class, id);
        if (city == null) throw new NotFoundException("City not found.");
    }
    private String text(String value, int max, String name) {
        if (value == null || value.isBlank() || value.strip().length() > max)
            throw new BadRequestException(name + " must contain 1 to " + max + " characters.");
        return value.strip();
    }
    private long number(Object value) { return ((Number) value).longValue(); }
}
