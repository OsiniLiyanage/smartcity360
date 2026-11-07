package lk.osini.smartcity360.service;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.persistence.*;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.*;
import lk.osini.smartcity360.entity.*;
import lk.osini.smartcity360.pattern.interpreter.*;
import java.util.List;
import java.util.Set;

@ApplicationScoped
public class PolicyService {
    @PersistenceContext(unitName = "SmartCity360PU") private EntityManager em;
    public record Page<T>(List<T> items, long total, int page, int pageSize) { }
    public Page<Policy> list(long cityId, int page, int size) {
        city(cityId, false); bounds(page, size);
        var rows = em.createQuery("SELECT p FROM Policy p WHERE p.cityId=:city ORDER BY p.id", Policy.class)
                .setParameter("city", cityId).setFirstResult(page * size).setMaxResults(size).getResultList();
        long total = em.createQuery("SELECT COUNT(p) FROM Policy p WHERE p.cityId=:city", Long.class).setParameter("city", cityId).getSingleResult();
        return new Page<>(rows, total, page, size);
    }
    public Policy detail(long cityId, long id) {
        Policy policy = em.find(Policy.class, id);
        if (policy == null || policy.getCityId() != cityId) throw new NotFoundException("Policy not found in this city.");
        return policy;
    }
    @Transactional
    public Policy create(long cityId, String name, String category, String expression, String meaning, boolean active) {
        city(cityId, true); name = text(name, 80, "Name"); expression = valid(expression, category, meaning);
        unique(cityId, name, -1);
        Policy policy = new Policy(cityId, name, category, expression, meaning, active);
        em.persist(policy); em.flush(); return policy;
    }
    @Transactional
    public Policy update(long cityId, long id, long version, String name, String category, String expression, String meaning, boolean active) {
        city(cityId, true); Policy policy = detail(cityId, id); em.refresh(policy); version(policy, version);
        name = text(name, 80, "Name"); expression = valid(expression, category, meaning); unique(cityId, name, id);
        policy.update(name, category, expression, meaning, active); em.flush(); return policy;
    }
    @Transactional
    public PolicyEvaluation evaluate(long cityId, long id, long version, long zoneId, PolicyContext context, String note) {
        city(cityId, true); Policy policy = detail(cityId, id); em.refresh(policy); version(policy, version);
        if (!policy.isActive()) throw new ClientErrorException("This policy is inactive. Activate it before recording an evaluation.", 409);
        ZoneEntity zone = em.find(ZoneEntity.class, zoneId);
        if (zone == null || zone.getCityId() != cityId) throw new NotFoundException("Observation zone not found in this city.");
        if (note == null || note.strip().length() > 500) throw new BadRequestException("Observation note must be at most 500 characters.");
        boolean matched;
        try { matched = PolicyParser.parse(policy.getExpression()).evaluate(context); }
        catch (IllegalArgumentException error) { throw new BadRequestException(error.getMessage()); }
        var result = new PolicyEvaluation(policy, zoneId, context, matched, note.strip());
        em.persist(result); em.flush(); return result;
    }
    public Page<PolicyEvaluation> history(long cityId, long id, int page, int size) {
        detail(cityId, id); bounds(page, size);
        var rows = em.createQuery("SELECT e FROM PolicyEvaluation e WHERE e.cityId=:city AND e.policyId=:id ORDER BY e.id DESC", PolicyEvaluation.class)
                .setParameter("city", cityId).setParameter("id", id).setFirstResult(page * size).setMaxResults(size).getResultList();
        long total = em.createQuery("SELECT COUNT(e) FROM PolicyEvaluation e WHERE e.cityId=:city AND e.policyId=:id", Long.class)
                .setParameter("city", cityId).setParameter("id", id).getSingleResult();
        return new Page<>(rows, total, page, size);
    }
    public PolicyParser.Parsed parse(String expression) {
        try { return PolicyParser.parse(expression); }
        catch (IllegalArgumentException error) { throw new BadRequestException(error.getMessage()); }
    }
    private String valid(String expression, String category, String meaning) {
        if (!Set.of("NOISE", "PARKING", "CUSTOM").contains(category)) throw new BadRequestException("Choose NOISE, PARKING or CUSTOM.");
        if (!Set.of("VIOLATION", "PERMITTED").contains(meaning)) throw new BadRequestException("Choose what a true result means: VIOLATION or PERMITTED.");
        // Check original length before trimming so the language limit is consistent across endpoints.
        parse(expression); return expression.strip();
    }
    private void version(Policy policy, long version) {
        if (policy.getVersion() != version) throw new ClientErrorException("This policy changed. Refresh it before saving or evaluating.", 409);
    }
    private void unique(long cityId, String name, long except) {
        if (em.createQuery("SELECT COUNT(p) FROM Policy p WHERE p.cityId=:city AND p.name=:name AND p.id<>:id", Long.class)
                .setParameter("city", cityId).setParameter("name", name).setParameter("id", except).getSingleResult() > 0)
            throw new ClientErrorException("A policy with this name already exists in this city.", 409);
    }
    private void city(long id, boolean lock) {
        City row = lock ? em.find(City.class, id, LockModeType.PESSIMISTIC_WRITE) : em.find(City.class, id);
        if (row == null) throw new NotFoundException("City not found.");
    }
    private void bounds(int page, int size) {
        if (page < 0 || page > 100000 || size < 1 || size > 100) throw new BadRequestException("Use page 0 to 100000 and pageSize 1 to 100.");
    }
    private String text(String value, int max, String label) {
        if (value == null || value.isBlank() || value.strip().length() > max) throw new BadRequestException(label + " must contain 1 to " + max + " characters.");
        return value.strip();
    }
}
