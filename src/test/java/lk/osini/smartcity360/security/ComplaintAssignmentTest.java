package lk.osini.smartcity360.security;

import lk.osini.smartcity360.entity.AppUser;
import lk.osini.smartcity360.entity.Complaint;
import lk.osini.smartcity360.entity.ComplaintStatus;
import lk.osini.smartcity360.pattern.chain.Authority;
import lk.osini.smartcity360.pattern.chain.Severity;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class ComplaintAssignmentTest {
    private Complaint complaint(Severity severity, Authority authority) {
        return new Complaint(12L, null, "Resident", "Street repair", "Surface needs repair", severity, authority);
    }

    private AppUser staff(Role role, Long city) {
        return new AppUser("staff@example.test", "Example employee", "unused", role, city, false);
    }

    @Test void assignmentEndpointsRequireSupervisorOrHigher() {
        for (String operation : new String[]{"ComplaintResource.assign", "ComplaintResource.assignees"}) {
            assertFalse(AccessRules.isPublic(operation));
            assertFalse(AccessRules.allowed(Role.RESIDENT, operation));
            assertFalse(AccessRules.allowed(Role.LOCAL_STAFF, operation));
            assertTrue(AccessRules.allowed(Role.SUPERVISOR, operation));
            assertTrue(AccessRules.allowed(Role.CITY_MANAGER, operation));
            assertTrue(AccessRules.allowed(Role.SYSTEM_ADMIN, operation));
        }
    }

    @Test void requiresAnEmployeeMatchingTheExactAuthorityTier() {
        for (Authority authority : Authority.values()) {
            Complaint item = complaint(Severity.LOW, authority);
            for (Role role : Role.values()) {
                assertEquals(authority.name().equals(role.name()),
                        AccessRules.eligibleAssignee(staff(role, 12L), item), role + " for " + authority);
            }
        }
    }

    @Test void rejectsMissingDisabledAndOtherCityAccounts() {
        Complaint item = complaint(Severity.LOW, Authority.LOCAL_STAFF);
        assertFalse(AccessRules.eligibleAssignee(null, item));
        assertFalse(AccessRules.eligibleAssignee(staff(Role.LOCAL_STAFF, 13L), item));
        assertFalse(AccessRules.eligibleAssignee(staff(Role.LOCAL_STAFF, null), item));
        AppUser employee = staff(Role.LOCAL_STAFF, 12L);
        assertTrue(AccessRules.eligibleAssignee(employee, item));
        employee.permissions(Role.LOCAL_STAFF, 12L, false);
        assertFalse(AccessRules.eligibleAssignee(employee, item));
    }

    @Test void accountPermissionChangesMakeExistingAllocationIneligible() {
        Complaint item = complaint(Severity.LOW, Authority.LOCAL_STAFF);
        AppUser employee = staff(Role.LOCAL_STAFF, 12L);
        employee.permissions(Role.SUPERVISOR, 12L, true);
        assertFalse(AccessRules.eligibleAssignee(employee, item));
        employee.permissions(Role.LOCAL_STAFF, 13L, true);
        assertFalse(AccessRules.eligibleAssignee(employee, item));
    }

    @Test void newAndPreviouslyUnallocatedCasesCanReceiveAndChangeEmployees() {
        Complaint item = complaint(Severity.LOW, Authority.LOCAL_STAFF);
        assertNull(item.getAssignedUserId());
        item.assignUser(27L);
        assertEquals(27L, item.getAssignedUserId());
        assertEquals(Authority.LOCAL_STAFF, item.getAssignedTo());
        assertEquals(ComplaintStatus.ASSIGNED, item.getStatus());
        item.changeStatus(ComplaintStatus.IN_PROGRESS);
        item.assignUser(28L);
        assertEquals(28L, item.getAssignedUserId());
        assertEquals(ComplaintStatus.IN_PROGRESS, item.getStatus());
        item.assignUser(null);
        assertNull(item.getAssignedUserId());
        assertEquals(ComplaintStatus.IN_PROGRESS, item.getStatus());
    }

    @Test void escalationClearsEmployeeButPreservesResidentOwnership() {
        Complaint item = complaint(Severity.LOW, Authority.LOCAL_STAFF);
        item.setOwnerId(99L);
        item.assignUser(27L);
        item.changeStatus(ComplaintStatus.IN_PROGRESS);
        item.route(Severity.HIGH, Authority.CITY_MANAGER);
        assertNull(item.getAssignedUserId());
        assertEquals(99L, item.getOwnerId());
        assertEquals(Authority.CITY_MANAGER, item.getAssignedTo());
        assertEquals(ComplaintStatus.ASSIGNED, item.getStatus());
    }

    @Test void unhandledRoutesCannotReceiveAnEligibleEmployee() {
        Complaint item = complaint(Severity.HIGH, null);
        for (Role role : Role.values()) {
            assertFalse(AccessRules.eligibleAssignee(staff(role, 12L), item));
        }
    }
}
