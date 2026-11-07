package lk.osini.smartcity360.service;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.persistence.*;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.*;
import lk.osini.smartcity360.entity.*;
import lk.osini.smartcity360.pattern.chain.*;
import java.util.List;

@ApplicationScoped
public class ComplaintService {
    @PersistenceContext(unitName = "SmartCity360PU") private EntityManager em;
    // The submission client knows only the first handler. Change this wiring to change the chain.
    private final ComplaintHandler first =
            new LocalStaffHandler(new SupervisorHandler(new CityManagerHandler()));

    public record Detail(Complaint complaint, String zoneName, List<ComplaintEvent> history) { }

    public List<Complaint> list(long cityId) {
        city(cityId);
        return em.createQuery("SELECT c FROM Complaint c WHERE c.cityId = :city ORDER BY c.updatedAt DESC, c.id DESC", Complaint.class)
                .setParameter("city", cityId).getResultList();
    }

    public Detail detail(long cityId, long id) { return view(find(cityId, id, false)); }

    @Transactional
    public Detail create(long cityId, Long zoneId, String resident, String subject, String description, Severity severity) {
        city(cityId);
        if (zoneId != null) {
            ZoneEntity zone = em.find(ZoneEntity.class, zoneId);
            if (zone == null || zone.getCityId() != cityId) throw new NotFoundException("Area not found in this city.");
        }
        resident = text(resident, 100, "Resident name");
        subject = text(subject, 160, "Subject");
        description = text(description, 2000, "Description");
        if (severity == null) throw new BadRequestException("Choose a severity.");
        RoutingResult result = first.handle(severity);
        Complaint complaint = new Complaint(cityId, zoneId, resident, subject, description, severity, result.assignedTo());
        em.persist(complaint);
        em.flush();
        event(complaint, "SUBMITTED", "RESIDENT", "Complaint submitted with " + severity + " severity.");
        recordRoute(complaint, result);
        em.flush();
        return view(complaint);
    }

    @Transactional
    public Detail status(long cityId, long id, long version, ComplaintStatus target, String note) {
        Complaint complaint = find(cityId, id, true);
        checkVersion(complaint, version);
        note = text(note, 1000, "Work note");
        ComplaintStatus previous = complaint.getStatus();
        boolean allowed = previous == ComplaintStatus.ASSIGNED && target == ComplaintStatus.IN_PROGRESS
                || previous == ComplaintStatus.IN_PROGRESS && target == ComplaintStatus.RESOLVED
                || previous == ComplaintStatus.RESOLVED && target == ComplaintStatus.IN_PROGRESS;
        if (!allowed) throw new ClientErrorException("Start assigned work before resolving it. Resolved work can be reopened.", 409);
        complaint.changeStatus(target);
        event(complaint, previous == ComplaintStatus.RESOLVED ? "REOPENED" : "STATUS_CHANGED",
                "DEMO_OPERATOR", previous + " -> " + target + ": " + note);
        em.flush();
        return view(complaint);
    }

    @Transactional
    public Detail escalate(long cityId, long id, long version, Severity severity, String note) {
        Complaint complaint = find(cityId, id, true);
        checkVersion(complaint, version);
        note = text(note, 1000, "Escalation reason");
        if (complaint.getStatus() == ComplaintStatus.RESOLVED)
            throw new ClientErrorException("Reopen the complaint before escalating it.", 409);
        if (severity == null || severity.ordinal() <= complaint.getSeverity().ordinal())
            throw new BadRequestException("Choose a higher severity for escalation.");
        Severity previous = complaint.getSeverity();
        RoutingResult result = first.handle(severity);
        complaint.route(severity, result.assignedTo());
        event(complaint, "ESCALATED", "DEMO_OPERATOR", previous + " -> " + severity + ": " + note);
        recordRoute(complaint, result);
        em.flush();
        return view(complaint);
    }

    private void city(long cityId) {
        if (em.find(City.class, cityId) == null) throw new NotFoundException("City not found.");
    }
    private Complaint find(long cityId, long id, boolean lock) {
        Complaint item = em.find(Complaint.class, id);
        if (item == null || item.getCityId() != cityId) throw new NotFoundException("Complaint not found in this city.");
        if (lock) em.refresh(item, LockModeType.PESSIMISTIC_WRITE);
        return item;
    }
    private void checkVersion(Complaint item, long version) {
        if (item.getVersion() != version)
            throw new ClientErrorException("This complaint changed. Refresh its details before trying again.", 409);
    }
    private String text(String value, int max, String field) {
        if (value == null || value.isBlank() || value.strip().length() > max)
            throw new BadRequestException(field + " must contain 1 to " + max + " characters.");
        return value.strip();
    }
    private void event(Complaint complaint, String type, String actor, String message) {
        em.persist(new ComplaintEvent(complaint.getId(), type, actor, message));
        // Flush each event to allocate IDs in handling order. This does not commit:
        // the complaint and all history entries still share one atomic transaction.
        em.flush();
    }
    private void recordRoute(Complaint complaint, RoutingResult result) {
        for (RoutingResult.Step step : result.steps()) {
            String message = switch (step.action()) {
                case "ASSIGNED" -> "Accepted " + complaint.getSeverity() + " complaint; assigned for work, not resolved.";
                case "FORWARDED" -> "Severity " + complaint.getSeverity() + " exceeds this handler's responsibility; forwarded.";
                default -> "No successor can accept this complaint. Manual attention required.";
            };
            event(complaint, step.action(), step.handler().name(), message);
        }
    }
    private Detail view(Complaint item) {
        String area = item.getZoneId() == null ? "Whole city" : em.find(ZoneEntity.class, item.getZoneId()).getName();
        List<ComplaintEvent> events = em.createQuery(
                "SELECT e FROM ComplaintEvent e WHERE e.complaintId = :id ORDER BY e.id", ComplaintEvent.class)
                .setParameter("id", item.getId()).getResultList();
        return new Detail(item, area, events);
    }
}
