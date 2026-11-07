package lk.osini.smartcity360.pattern.chain;

import org.junit.jupiter.api.Test;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;

class ComplaintHandlerTest {
    private ComplaintHandler standard() {
        return new LocalStaffHandler(new SupervisorHandler(new CityManagerHandler()));
    }
    @Test void lowStopsAtLocalStaff() {
        var result = standard().handle(Severity.LOW);
        assertEquals(Authority.LOCAL_STAFF, result.assignedTo());
        assertEquals(List.of(new RoutingResult.Step(Authority.LOCAL_STAFF, "ASSIGNED")), result.steps());
    }
    @Test void mediumPassesLocalAndStopsAtSupervisor() {
        var result = standard().handle(Severity.MEDIUM);
        assertEquals(Authority.SUPERVISOR, result.assignedTo());
        assertEquals(List.of("FORWARDED", "ASSIGNED"), result.steps().stream().map(RoutingResult.Step::action).toList());
        assertEquals(List.of(Authority.LOCAL_STAFF, Authority.SUPERVISOR), result.steps().stream().map(RoutingResult.Step::handler).toList());
    }
    @Test void highVisitsEveryHandlerInOrder() {
        var result = standard().handle(Severity.HIGH);
        assertEquals(Authority.CITY_MANAGER, result.assignedTo());
        assertEquals(List.of("FORWARDED", "FORWARDED", "ASSIGNED"), result.steps().stream().map(RoutingResult.Step::action).toList());
        assertEquals(List.of(Authority.LOCAL_STAFF, Authority.SUPERVISOR, Authority.CITY_MANAGER), result.steps().stream().map(RoutingResult.Step::handler).toList());
    }
    @Test void missingSuccessorReturnsExplicitUnhandledResult() {
        var result = new LocalStaffHandler(new SupervisorHandler(null)).handle(Severity.HIGH);
        assertNull(result.assignedTo());
        assertEquals(List.of("FORWARDED", "UNHANDLED"), result.steps().stream().map(RoutingResult.Step::action).toList());
    }
    @Test void chainCanStartAtSupervisorWithoutChangingCaller() {
        ComplaintHandler first = new SupervisorHandler(new CityManagerHandler());
        assertEquals(Authority.SUPERVISOR, first.handle(Severity.LOW).assignedTo());
        assertEquals(Authority.CITY_MANAGER, first.handle(Severity.HIGH).assignedTo());
    }
    @Test void independentRequestsHaveImmutableIndependentHistories() {
        var chain = standard();
        var first = chain.handle(Severity.HIGH);
        chain.handle(Severity.LOW);
        assertEquals(3, first.steps().size());
        assertThrows(UnsupportedOperationException.class, () -> first.steps().clear());
        assertThrows(NullPointerException.class, () -> chain.handle(null));
    }
}
