package lk.osini.smartcity360.service;

import jakarta.json.Json;
import jakarta.json.JsonObject;
import jakarta.json.JsonValue;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import jakarta.persistence.TypedQuery;
import jakarta.ws.rs.BadRequestException;
import jakarta.ws.rs.ClientErrorException;
import jakarta.ws.rs.ForbiddenException;
import jakarta.ws.rs.NotFoundException;
import lk.osini.smartcity360.entity.AppUser;
import lk.osini.smartcity360.entity.Complaint;
import lk.osini.smartcity360.entity.ComplaintEvent;
import lk.osini.smartcity360.entity.ComplaintStatus;
import lk.osini.smartcity360.pattern.chain.Authority;
import lk.osini.smartcity360.pattern.chain.Severity;
import lk.osini.smartcity360.resource.ComplaintResource;
import lk.osini.smartcity360.security.AccessRules;
import lk.osini.smartcity360.security.CurrentUser;
import lk.osini.smartcity360.security.Role;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Field;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/** Exercises real service/resource methods with persistence mocked. Live transaction checks are separate. */
class ComplaintFollowUpTest {
    private final EntityManager em = mock(EntityManager.class);
    private final CurrentUser current = new CurrentUser();
    private final ComplaintService service = new ComplaintService();
    private final ComplaintResource resource = new ComplaintResource();
    private final List<ComplaintEvent> events = new ArrayList<>();
    private Complaint complaint;

    @BeforeEach
    @SuppressWarnings("unchecked")
    void setUp() throws Exception {
        complaint = new Complaint(12L, null, "Resident", "Broken light", "Light needs repair", Severity.LOW, Authority.LOCAL_STAFF);
        setField(complaint, "id", 9L);
        setField(complaint, "version", 3L);
        complaint.setOwnerId(42L);
        signIn(42L, Role.RESIDENT, null);
        setField(service, "em", em);
        setField(service, "current", current);
        setField(resource, "service", service);
        setField(resource, "current", current);
        when(em.find(Complaint.class, 9L)).thenReturn(complaint);
        TypedQuery<ComplaintEvent> history = mock(TypedQuery.class);
        when(em.createQuery(anyString(), eq(ComplaintEvent.class))).thenReturn(history);
        when(history.setParameter(eq("id"), any())).thenReturn(history);
        when(history.getResultList()).thenReturn(events);
        doAnswer(invocation -> {
            ComplaintEvent event = invocation.getArgument(0);
            setField(event, "id", (long) events.size() + 1);
            events.add(event);
            return null;
        }).when(em).persist(any(ComplaintEvent.class));
    }

    @Test void residentMessagesUseTheAuthenticatedOwnerAndDirtyTheComplaint() {
        Instant before = complaint.getUpdatedAt();
        service.message(12, 9, 3, "  Still broken this morning  ");
        assertTrue(complaint.getUpdatedAt().isAfter(before));
        assertEquals(ComplaintStatus.ASSIGNED, complaint.getStatus());
        assertEquals(42L, events.getFirst().getActorUserId());
        assertEquals("RESIDENT_MESSAGE", events.getFirst().getEventType());
        assertEquals("Still broken this morning", events.getFirst().getPublicMessage());
        verify(em).refresh(complaint, LockModeType.PESSIMISTIC_WRITE);
    }

    @Test void anotherResidentAndOwnerlessLegacyCasesCannotReceiveResidentFollowUp() throws Exception {
        signIn(43L, Role.RESIDENT, null);
        assertThrows(NotFoundException.class, () -> service.message(12, 9, 3, "Wrong owner"));
        complaint.setOwnerId(null);
        signIn(42L, Role.RESIDENT, null);
        assertThrows(NotFoundException.class, () -> service.requestReopen(12, 9, 3, "Wrong owner"));
        signIn(7L, Role.SUPERVISOR, 12L);
        assertEquals(409, assertThrows(ClientErrorException.class,
                () -> service.message(12, 9, 3, "No recipient")).getResponse().getStatus());
        assertTrue(events.isEmpty());
    }

    @Test void publicStaffRepliesDoNotExposePrivateWorkNotesOrStaffIdentity() throws Exception {
        signIn(7L, Role.LOCAL_STAFF, 12L);
        service.status(12, 9, 3, ComplaintStatus.IN_PROGRESS, "INTERNAL_ONLY staff detail");
        service.message(12, 9, 3, "We will inspect the light tomorrow.");
        signIn(42L, Role.RESIDENT, null);
        JsonObject view = resource.detail(12, 9);
        assertFalse(view.toString().contains("INTERNAL_ONLY"));
        assertFalse(view.toString().contains("Employee 7"));
        assertTrue(view.toString().contains("We will inspect the light tomorrow."));
        assertEquals("City team", view.getJsonArray("history").getJsonObject(1).getString("actor"));
        assertFalse(view.containsKey("assignedUserId"));
        assertFalse(view.containsKey("assignee"));
    }

    @Test void crossCityAndAboveTierStaffCannotReadOrReply() throws Exception {
        signIn(7L, Role.LOCAL_STAFF, 13L);
        assertThrows(ForbiddenException.class, () -> service.message(12, 9, 3, "Other city"));
        signIn(7L, Role.LOCAL_STAFF, 12L);
        complaint.route(Severity.HIGH, Authority.CITY_MANAGER);
        assertThrows(NotFoundException.class, () -> service.message(12, 9, 3, "Other tier"));
        assertTrue(events.isEmpty());
    }

    @Test void staleMessagesAndInvalidTextDoNotCreateEvents() {
        Instant before = complaint.getUpdatedAt();
        assertEquals(409, assertThrows(ClientErrorException.class,
                () -> service.message(12, 9, 2, "Stale message")).getResponse().getStatus());
        for (String message : new String[]{null, "  ", "x".repeat(1001)}) {
            assertThrows(BadRequestException.class, () -> service.message(12, 9, 3, message));
        }
        assertEquals(before, complaint.getUpdatedAt());
        assertTrue(events.isEmpty());
    }

    @Test void repeatedMessagesAdvanceActivityEvenWithinOneMillisecond() throws Exception {
        // A future timestamp makes the same-millisecond/clock-regression path deterministic.
        setField(complaint, "updatedAt", Instant.parse("2099-01-01T00:00:00Z"));
        service.message(12, 9, 3, "First");
        Instant first = complaint.getUpdatedAt();
        service.message(12, 9, 3, "Second");
        assertTrue(complaint.getUpdatedAt().isAfter(first));
        assertEquals(2, events.size());
    }

    @Test void reopeningRequestKeepsCaseResolvedAndRejectsDuplicates() {
        assertThrows(ClientErrorException.class, () -> service.requestReopen(12, 9, 3, "Still broken"));
        complaint.changeStatus(ComplaintStatus.RESOLVED);
        JsonObject view = resource.requestReopen(12, 9, note("Still broken"));
        assertTrue(view.getBoolean("reopenRequested"));
        assertFalse(view.getBoolean("canRequestReopen"));
        assertFalse(view.getBoolean("canReviewReopen"));
        assertEquals(ComplaintStatus.RESOLVED, complaint.getStatus());
        assertThrows(ClientErrorException.class, () -> service.requestReopen(12, 9, 3, "Duplicate"));
        assertEquals(1, events.size());
    }

    @Test void onlyOwnerCanRequestAndOnlyManagersCanReview() throws Exception {
        complaint.changeStatus(ComplaintStatus.RESOLVED);
        signIn(43L, Role.RESIDENT, null);
        assertThrows(NotFoundException.class, () -> service.requestReopen(12, 9, 3, "Another case"));
        signIn(7L, Role.LOCAL_STAFF, 12L);
        assertThrows(ForbiddenException.class, () -> service.requestReopen(12, 9, 3, "Impersonating owner"));
        assertThrows(ForbiddenException.class, () -> service.reviewReopen(12, 9, 3, true, "Approve"));
        signIn(42L, Role.RESIDENT, null);
        service.requestReopen(12, 9, 3, "Please review");
        assertThrows(ForbiddenException.class, () -> service.reviewReopen(12, 9, 3, true, "Self approval"));
        assertEquals(1, events.size());
    }

    @Test void approvalResumesWorkAndPublishesAnExplanation() throws Exception {
        complaint.changeStatus(ComplaintStatus.RESOLVED);
        service.requestReopen(12, 9, 3, "The light failed again");
        signIn(8L, Role.SUPERVISOR, 12L);
        assertTrue(resource.detail(12, 9).getBoolean("canReviewReopen"));
        service.reviewReopen(12, 9, 3, true, "We will replace the fitting");
        assertEquals(ComplaintStatus.IN_PROGRESS, complaint.getStatus());
        assertFalse(complaint.isReopenRequested());
        assertEquals("REOPEN_APPROVED", events.getLast().getEventType());
        assertTrue(events.getLast().getPublicMessage().contains("replace the fitting"));
        assertThrows(ClientErrorException.class, () -> service.reviewReopen(12, 9, 3, true, "Duplicate review"));
        assertEquals(2, events.size());
    }

    @Test void declineKeepsResolutionAndAllowsALaterRequestWithNewEvidence() throws Exception {
        complaint.changeStatus(ComplaintStatus.RESOLVED);
        service.requestReopen(12, 9, 3, "Please check");
        signIn(8L, Role.SUPERVISOR, 12L);
        service.reviewReopen(12, 9, 3, false, "Inspection confirms the repair");
        assertFalse(complaint.isReopenRequested());
        assertEquals(ComplaintStatus.RESOLVED, complaint.getStatus());
        assertEquals("REOPEN_DECLINED", events.getLast().getEventType());
        signIn(42L, Role.RESIDENT, null);
        service.requestReopen(12, 9, 3, "New evidence after the inspection");
        assertTrue(complaint.isReopenRequested());
        assertEquals(3, events.size());
    }

    @Test void reviewRequiresPendingRequestCurrentVersionAndExplanation() throws Exception {
        signIn(8L, Role.SUPERVISOR, 12L);
        assertThrows(ClientErrorException.class, () -> service.reviewReopen(12, 9, 3, true, "No request"));
        complaint.changeStatus(ComplaintStatus.RESOLVED);
        complaint.setReopenRequested(true);
        assertThrows(ClientErrorException.class, () -> service.reviewReopen(12, 9, 2, true, "Stale"));
        assertThrows(BadRequestException.class, () -> service.reviewReopen(12, 9, 3, true, " "));
        assertTrue(complaint.isReopenRequested());
        assertEquals(ComplaintStatus.RESOLVED, complaint.getStatus());
        assertTrue(events.isEmpty());
    }

    @Test void existingStaffReopeningClosesThePendingRequestAndKeepsPrivateNotesPrivate() throws Exception {
        complaint.changeStatus(ComplaintStatus.RESOLVED);
        service.requestReopen(12, 9, 3, "Failed again");
        signIn(7L, Role.LOCAL_STAFF, 12L);
        service.status(12, 9, 3, ComplaintStatus.IN_PROGRESS, "PRIVATE_REOPEN_NOTE");
        assertFalse(complaint.isReopenRequested());
        assertEquals(ComplaintStatus.IN_PROGRESS, complaint.getStatus());
        signIn(42L, Role.RESIDENT, null);
        String view = resource.detail(12, 9).toString();
        assertTrue(view.contains("REOPEN_APPROVED"));
        assertFalse(view.contains("PRIVATE_REOPEN_NOTE"));
    }

    @Test void jsonEndpointsRejectWrongTypesAndMissingVersions() {
        assertThrows(BadRequestException.class, () -> resource.message(12, 9, JsonValue.NULL));
        assertThrows(BadRequestException.class, () -> resource.message(12, 9,
                Json.createObjectBuilder().add("message", "Hello").build()));
        assertThrows(BadRequestException.class, () -> resource.message(12, 9,
                Json.createObjectBuilder().add("version", 3).add("message", 17).build()));
        assertThrows(BadRequestException.class, () -> resource.reviewReopen(12, 9,
                Json.createObjectBuilder().add("version", 3).add("note", "Review").add("approve", "false").build()));
        assertTrue(events.isEmpty());
    }

    @Test void endpointAllowlistSeparatesRequestingFromReviewing() {
        for (Role role : Role.values()) {
            assertTrue(AccessRules.allowed(role, "ComplaintResource.message"));
            assertEquals(role == Role.RESIDENT, AccessRules.allowed(role, "ComplaintResource.requestReopen"));
            assertEquals(role.authorityLevel() >= 2, AccessRules.allowed(role, "ComplaintResource.reviewReopen"));
        }
        assertFalse(AccessRules.isPublic("ComplaintResource.message"));
        assertFalse(AccessRules.isPublic("ComplaintResource.requestReopen"));
        assertFalse(AccessRules.isPublic("ComplaintResource.reviewReopen"));
    }

    @Test void fullLengthAccountNamesAndPublicMessagesAreRetained() {
        current.get().profile("N".repeat(100));
        service.message(12, 9, 3, "M".repeat(1000));
        assertEquals(100, events.getFirst().getActor().length());
        assertEquals(1000, events.getFirst().getPublicMessage().length());
    }

    @Test void assignmentServiceChecksVersionAndCandidateEligibility() throws Exception {
        signIn(8L, Role.SUPERVISOR, 12L);
        AppUser employee = user(7L, Role.LOCAL_STAFF, 12L);
        when(em.find(AppUser.class, 7L)).thenReturn(employee);
        assertThrows(ClientErrorException.class, () -> service.assign(12, 9, 2, 7L, "Stale"));
        employee.permissions(Role.LOCAL_STAFF, 13L, true);
        assertThrows(BadRequestException.class, () -> service.assign(12, 9, 3, 7L, "Wrong city"));
        employee.permissions(Role.LOCAL_STAFF, 12L, false);
        assertThrows(BadRequestException.class, () -> service.assign(12, 9, 3, 7L, "Disabled"));
        assertNull(complaint.getAssignedUserId());
        assertTrue(events.isEmpty());
        employee.permissions(Role.LOCAL_STAFF, 12L, true);
        service.assign(12, 9, 3, 7L, "Please inspect");
        assertEquals(7L, complaint.getAssignedUserId());
        verify(em, atLeastOnce()).refresh(employee, LockModeType.PESSIMISTIC_READ);
        signIn(42L, Role.RESIDENT, null);
        String view = resource.detail(12, 9).toString();
        assertFalse(view.contains("Employee 7"));
        assertFalse(view.contains("Please inspect"));
        assertFalse(view.contains("assignedUserId"));
    }

    @Test void assignedEmployeeIsReleasedWithHistoryOnEscalation() throws Exception {
        signIn(8L, Role.SUPERVISOR, 12L);
        complaint.assignUser(7L);
        service.escalate(12, 9, 3, Severity.MEDIUM, "Needs supervisor attention");
        assertNull(complaint.getAssignedUserId());
        assertEquals(Authority.SUPERVISOR, complaint.getAssignedTo());
        assertTrue(events.stream().anyMatch(event -> event.getEventType().equals("EMPLOYEE_UNASSIGNED")));
    }

    private JsonObject note(String text) {
        return Json.createObjectBuilder().add("version", 3).add("note", text).build();
    }

    private void signIn(long id, Role role, Long cityId) throws Exception {
        current.set(user(id, role, cityId));
    }

    private AppUser user(long id, Role role, Long cityId) throws Exception {
        AppUser user = new AppUser("user" + id + "@example.test", "Employee " + id, "unused", role, cityId, false);
        setField(user, "id", id);
        return user;
    }

    private static void setField(Object target, String name, Object value) throws Exception {
        Field field = target.getClass().getDeclaredField(name);
        field.setAccessible(true);
        field.set(target, value);
    }
}
