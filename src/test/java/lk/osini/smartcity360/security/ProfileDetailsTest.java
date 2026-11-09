package lk.osini.smartcity360.security;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
class ProfileDetailsTest {
    @Test void validatesAndNormalizesUsername() {
        assertEquals("osini_1", ProfileDetails.username(" Osini_1 "));
        assertNull(ProfileDetails.username(""));
        for(String value : new String[]{"a", "2user", "a b", "a".repeat(31)})
            assertThrows(IllegalArgumentException.class, () -> ProfileDetails.username(value));
    }
    @Test void validatesPhone() {
        assertEquals("+94771234567", ProfileDetails.phone("+94771234567"));
        assertNull(ProfileDetails.phone(""));
        for(String value : new String[]{"abc", "+123", "01234567890123456", "12+3456789"})
            assertThrows(IllegalArgumentException.class, () -> ProfileDetails.phone(value));
    }
    @Test void acceptsEightCharacterPasswordAndRejectsShorter() {
        PasswordHash.validate("Test1234");
        assertThrows(IllegalArgumentException.class, () -> PasswordHash.validate("1234567"));
    }
    @Test void complaintSubmissionBelongsToResidents() {
        for(Role role : Role.values()) assertEquals(role == Role.RESIDENT, AccessRules.allowed(role,"ComplaintResource.create"));
    }
    @Test void rejectsInvalidOrExecutablePhotos() {
        assertNull(ProfileDetails.avatar(""));
        for(String value : new String[]{"javascript:alert(1)", "data:image/svg+xml;base64,abc", "data:image/jpeg;base64,broken"})
            assertThrows(IllegalArgumentException.class, () -> ProfileDetails.avatar(value));
    }
}
