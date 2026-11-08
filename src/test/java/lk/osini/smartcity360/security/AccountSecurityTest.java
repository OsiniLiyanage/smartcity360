package lk.osini.smartcity360.security;

import org.junit.jupiter.api.Test;
import java.time.*;
import static org.junit.jupiter.api.Assertions.*;

class AccountSecurityTest {
    @Test void hashesWithUniqueSaltsAndVerifiesWithoutPlaintextStorage() {
        String password="A long test passphrase 827!";
        String first=PasswordHash.hash(password),second=PasswordHash.hash(password);
        assertNotEquals(first,second);assertFalse(first.contains(password));assertTrue(PasswordHash.verify(password,first));
        assertFalse(PasswordHash.verify("incorrect password",first));assertFalse(PasswordHash.verify(password,"malformed"));
    }
    @Test void enforcesPasswordBoundsWithoutTrimmingSignificantSpaces() {
        assertThrows(IllegalArgumentException.class,()->PasswordHash.hash("short"));
        assertThrows(IllegalArgumentException.class,()->PasswordHash.hash(" ".repeat(12)));
        assertThrows(IllegalArgumentException.class,()->PasswordHash.hash("a".repeat(129)));
        String value="  my long passphrase  ";String hash=PasswordHash.hash(value);
        assertTrue(PasswordHash.verify(value,hash));assertFalse(PasswordHash.verify(value.strip(),hash));
    }
    @Test void unknownOperationsAreDeniedEvenForAdministrators() {
        for(Role role:Role.values()) assertFalse(AccessRules.allowed(role,"UnreviewedResource.deleteEverything"));
        assertFalse(AccessRules.allowed(null,"CityResource.list"));
        assertFalse(AccessRules.isPublic("AccountResource.create"));assertTrue(AccessRules.isPublic("AuthResource.register"));
    }
    @Test void separatesResidentsOperatorsManagersAndAdministrators() {
        assertTrue(AccessRules.allowed(Role.RESIDENT,"ComplaintResource.create"));
        for(String operation:new String[]{"ZoneResource.tree","ZoneResource.power","ComplaintResource.status","MeterResource.list","AccountResource.list"})
            assertFalse(AccessRules.allowed(Role.RESIDENT,operation));
        assertTrue(AccessRules.allowed(Role.LOCAL_STAFF,"StreetlightResource.update"));
        assertFalse(AccessRules.allowed(Role.LOCAL_STAFF,"PolicyResource.update"));
        assertTrue(AccessRules.allowed(Role.SUPERVISOR,"MeterResource.register"));
        assertFalse(AccessRules.allowed(Role.SUPERVISOR,"ZoneResource.power"));
        assertTrue(AccessRules.allowed(Role.CITY_MANAGER,"ZoneResource.power"));
        assertFalse(AccessRules.allowed(Role.CITY_MANAGER,"AccountResource.create"));
        assertTrue(AccessRules.allowed(Role.SYSTEM_ADMIN,"AccountResource.create"));
    }
    @Test void rateLimitsEachKeyAndExpiresTheWindow() {
        class MutableClock extends Clock {
            Instant now=Instant.EPOCH;public ZoneId getZone(){return ZoneOffset.UTC;}public Clock withZone(ZoneId zone){return this;}public Instant instant(){return now;}
        }
        var clock=new MutableClock();var limiter=new LoginLimiter(clock);
        assertTrue(limiter.allow("one",2));assertTrue(limiter.allow("one",2));
        assertFalse(limiter.allow("one",2));
        assertTrue(limiter.allow("two",2));clock.now=clock.now.plusSeconds(61);assertTrue(limiter.allow("one",2));
    }
}
