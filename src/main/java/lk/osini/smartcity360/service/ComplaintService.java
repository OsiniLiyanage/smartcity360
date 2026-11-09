package lk.osini.smartcity360.service;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import lk.osini.smartcity360.security.CurrentUser;
import lk.osini.smartcity360.security.AccessRules;
import lk.osini.smartcity360.security.Role;
import jakarta.persistence.*;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.*;
import lk.osini.smartcity360.entity.*;
import lk.osini.smartcity360.pattern.chain.*;
import java.util.List;
import java.util.Objects;

@ApplicationScoped
public class ComplaintService {
    @Inject private CurrentUser current;
    @PersistenceContext(unitName = "SmartCity360PU") private EntityManager em;
    // The submission client knows only the first handler. Change this wiring to change the chain.
    private final ComplaintHandler first =
            new LocalStaffHandler(new SupervisorHandler(new CityManagerHandler()));

    public record Assignee(Long id, String displayName, boolean eligible) { }
    public record Detail(Complaint complaint, String zoneName, List<ComplaintEvent> history, Assignee assignee) { }

    public List<Complaint> list(long cityId) {
        city(cityId);
        if (current.resident()) return em.createQuery("SELECT c FROM Complaint c WHERE c.cityId=:city AND c.ownerId=:owner ORDER BY c.updatedAt DESC,c.id DESC",Complaint.class)
                .setParameter("city",cityId).setParameter("owner",current.get().getId()).getResultList();
        if (current.get().getRole().authorityLevel() < 3) return em.createQuery("SELECT c FROM Complaint c WHERE c.cityId=:city AND c.assignedTo IN :tiers ORDER BY c.updatedAt DESC,c.id DESC",Complaint.class)
                .setParameter("city",cityId).setParameter("tiers",tiers()).getResultList();
        return em.createQuery("SELECT c FROM Complaint c WHERE c.cityId = :city ORDER BY c.updatedAt DESC, c.id DESC", Complaint.class)
                .setParameter("city", cityId).getResultList();
    }

    public Detail detail(long cityId, long id) { return view(find(cityId, id, false)); }

    @Transactional
    public Detail message(long cityId, long id, long version, String message) {
        Complaint complaint = find(cityId, id, true);
        checkVersion(complaint, version);
        if (complaint.getOwnerId() == null)
            throw new ClientErrorException("This demonstration case has no resident account to receive replies.", 409);
        message = text(message, 1000, "Public message");
        complaint.touch();
        userEvent(complaint, current.resident() ? "RESIDENT_MESSAGE" : "STAFF_REPLY", message, message);
        return view(complaint);
    }

    @Transactional
    public Detail requestReopen(long cityId, long id, long version, String note) {
        if (!current.resident()) throw new ForbiddenException("Only the resident who owns a case can request reopening.");
        Complaint complaint = find(cityId, id, true);
        checkVersion(complaint, version);
        note = text(note, 1000, "Reopening reason");
        if (complaint.getStatus() != ComplaintStatus.RESOLVED || complaint.isReopenRequested())
            throw new ClientErrorException("Request reopening of a resolved case that has no pending request.", 409);
        complaint.setReopenRequested(true);
        userEvent(complaint, "REOPEN_REQUESTED", note, note);
        return view(complaint);
    }

    @Transactional
    public Detail reviewReopen(long cityId, long id, long version, boolean approve, String note) {
        if (!AccessRules.allowed(current.get().getRole(), "ComplaintResource.reviewReopen"))
            throw new ForbiddenException("Only supervisors, city managers and system administrators can review reopening requests.");
        Complaint complaint = find(cityId, id, true);
        checkVersion(complaint, version);
        note = text(note, 1000, "Public review explanation");
        if (complaint.getStatus() != ComplaintStatus.RESOLVED || !complaint.isReopenRequested())
            throw new ClientErrorException("This complaint has no pending reopening request.", 409);
        complaint.setReopenRequested(false);
        if (approve) complaint.changeStatus(ComplaintStatus.IN_PROGRESS);
        String explanation = (approve ? "Reopening approved. " : "Reopening declined. ") + note;
        userEvent(complaint, approve ? "REOPEN_APPROVED" : "REOPEN_DECLINED", explanation, explanation);
        return view(complaint);
    }

    public List<AppUser> assignees(long cityId, long id, int page) {
        requireAssignmentManager();
        Complaint complaint = find(cityId, id, false);
        if (page < 0 || page > 100000) throw new BadRequestException("Choose a valid page.");
        if (complaint.getAssignedTo() == null || complaint.getStatus() == ComplaintStatus.RESOLVED) return List.of();
        return em.createQuery("SELECT u FROM AppUser u WHERE u.cityId = :city AND u.enabled = true AND u.role = :role ORDER BY u.displayName, u.id", AppUser.class)
                .setParameter("city", cityId)
                .setParameter("role", Role.valueOf(complaint.getAssignedTo().name()))
                .setFirstResult(page * 25).setMaxResults(25).getResultList();
    }

    @Transactional
    public Detail assign(long cityId, long id, long version, Long userId, String note) {
        requireAssignmentManager();
        // Authorize the case before looking up any candidate account.
        find(cityId, id, false);
        note = text(note, 1000, "Assignment reason");
        AppUser assignee = null;
        if (userId != null) {
            if (userId < 1) throw new BadRequestException("Choose a valid staff account.");
            assignee = em.find(AppUser.class, userId);
            if (assignee == null) throw new BadRequestException("Choose an active staff member in this city and authority tier.");
            // Keep eligibility stable until the assignment commits, including concurrent account updates.
            em.refresh(assignee, LockModeType.PESSIMISTIC_READ);
        }
        Complaint complaint = find(cityId, id, true);
        checkVersion(complaint, version);
        if (complaint.getStatus() == ComplaintStatus.RESOLVED || complaint.getAssignedTo() == null)
            throw new ClientErrorException("Assign an employee to an open complaint with a responsible authority tier.", 409);
        if (userId != null && !AccessRules.eligibleAssignee(assignee, complaint))
            throw new BadRequestException("Choose an active staff member in this city and authority tier.");
        if (Objects.equals(complaint.getAssignedUserId(), userId)) return view(complaint);
        Long previous = complaint.getAssignedUserId();
        complaint.assignUser(userId);
        String employee = assignee == null ? "unallocated" : assignee.getDisplayName() + " (#" + userId + ")";
        userEvent(complaint, "EMPLOYEE_ASSIGNED",
                "Employee assignment changed from " + previous + " to " + employee + ": " + note,
                "The city team updated the staff allocation for this complaint.");
        em.flush();
        return view(complaint);
    }

    @Transactional
    public Detail create(long cityId, Long zoneId, String resident, String subject, String description, Severity severity) {
        if (!current.resident()) throw new ForbiddenException("Sign in as a resident to submit a complaint.");
        city(cityId);
        if (zoneId != null) {
            ZoneEntity zone = em.find(ZoneEntity.class, zoneId);
            if (zone == null || zone.getCityId() != cityId) throw new NotFoundException("Area not found in this city.");
        }
        resident = current.get().getDisplayName();
        subject = text(subject, 160, "Subject");
        description = text(description, 2000, "Description");
        if (severity == null) throw new BadRequestException("Choose a severity.");
        RoutingResult result = first.handle(severity);
        Complaint complaint = new Complaint(cityId, zoneId, resident, subject, description, severity, result.assignedTo());
        if (current.resident()) complaint.setOwnerId(current.get().getId());
        em.persist(complaint);
        em.flush();
        userEvent(complaint, "SUBMITTED", "Complaint submitted with " + severity + " severity.", "Complaint submitted with " + severity + " severity.");
        recordRoute(complaint, result);
        em.flush();
        return view(complaint);
    }

    @Transactional
    public Detail status(long cityId, long id, long version, ComplaintStatus target, String note) {
        requireOperator();
        Complaint complaint = find(cityId, id, true);
        checkVersion(complaint, version);
        note = text(note, 1000, "Work note");
        ComplaintStatus previous = complaint.getStatus();
        boolean allowed = previous == ComplaintStatus.ASSIGNED && target == ComplaintStatus.IN_PROGRESS
                || previous == ComplaintStatus.IN_PROGRESS && target == ComplaintStatus.RESOLVED
                || previous == ComplaintStatus.RESOLVED && target == ComplaintStatus.IN_PROGRESS;
        if (!allowed) throw new ClientErrorException("Start assigned work before resolving it. Resolved work can be reopened.", 409);
        complaint.changeStatus(target);
        if (previous == ComplaintStatus.RESOLVED && complaint.isReopenRequested()) {
            complaint.setReopenRequested(false);
            userEvent(complaint, "REOPEN_APPROVED", "Pending resident request accepted by staff reopening.",
                    "Your reopening request was accepted and work has resumed.");
        }
        userEvent(complaint, previous == ComplaintStatus.RESOLVED ? "REOPENED" : "STATUS_CHANGED",
                previous + " -> " + target + ": " + note, "Status changed from " + previous + " to " + target + ".");
        em.flush();
        return view(complaint);
    }

    @Transactional
    public Detail escalate(long cityId, long id, long version, Severity severity, String note) {
        requireOperator();
        Complaint complaint = find(cityId, id, true);
        checkVersion(complaint, version);
        note = text(note, 1000, "Escalation reason");
        if (complaint.getStatus() == ComplaintStatus.RESOLVED)
            throw new ClientErrorException("Reopen the complaint before escalating it.", 409);
        if (severity == null || severity.ordinal() <= complaint.getSeverity().ordinal())
            throw new BadRequestException("Choose a higher severity for escalation.");
        Severity previous = complaint.getSeverity();
        RoutingResult result = first.handle(severity);
        Long previousEmployee = complaint.getAssignedUserId();
        complaint.route(severity, result.assignedTo());
        userEvent(complaint, "ESCALATED", previous + " -> " + severity + ": " + note, "Severity changed from " + previous + " to " + severity + ".");
        if (previousEmployee != null)
            userEvent(complaint, "EMPLOYEE_UNASSIGNED", "Employee #" + previousEmployee + " released by escalation.",
                    "The new responsible team will allocate the complaint.");
        recordRoute(complaint, result);
        em.flush();
        return view(complaint);
    }

    private void city(long cityId) {
        current.requireCity(cityId);
        if (em.find(City.class, cityId) == null) throw new NotFoundException("City not found.");
    }
    private Complaint find(long cityId, long id, boolean lock) {
        current.requireCity(cityId);
        Complaint item = em.find(Complaint.class, id);
        if (item == null || item.getCityId() != cityId) throw new NotFoundException("Complaint not found in this city.");
        if (lock) em.refresh(item, LockModeType.PESSIMISTIC_WRITE);
        if (current.resident() && !current.get().getId().equals(item.getOwnerId())) throw new NotFoundException("Complaint not found.");
        if (!current.resident() && current.get().getRole().authorityLevel() < 3 && !tiers().contains(item.getAssignedTo()))
            throw new NotFoundException("Complaint not found in your work queue.");
        return item;
    }
    private List<Authority> tiers() { return current.get().getRole() == Role.LOCAL_STAFF ? List.of(Authority.LOCAL_STAFF) : List.of(Authority.LOCAL_STAFF, Authority.SUPERVISOR); }
    private void requireOperator() { if (current.resident()) throw new ForbiddenException("Residents cannot change staff work status."); }
    private void requireAssignmentManager() {
        if (!AccessRules.allowed(current.get().getRole(), "ComplaintResource.assign"))
            throw new ForbiddenException("Only supervisors, city managers and system administrators can allocate complaints.");
    }
    private void userEvent(Complaint complaint, String type, String message, String publicMessage) {
        var event = new ComplaintEvent(complaint.getId(),type,current.get().getDisplayName(),message);
        event.identity(current.get().getId(),publicMessage); em.persist(event); em.flush();
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
        var event = new ComplaintEvent(complaint.getId(), type, actor, message);
        event.identity(null,message); em.persist(event);
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
        Assignee assignee = null;
        if (!current.resident() && item.getAssignedUserId() != null) {
            AppUser user = em.find(AppUser.class, item.getAssignedUserId());
            assignee = new Assignee(item.getAssignedUserId(), user == null ? "Unavailable account" : user.getDisplayName(),
                    AccessRules.eligibleAssignee(user, item));
        }
        return new Detail(item, area, events, assignee);
    }
}
