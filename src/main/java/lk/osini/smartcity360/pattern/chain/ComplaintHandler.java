package lk.osini.smartcity360.pattern.chain;

import java.util.ArrayList;
import java.util.Objects;

/** A handler either accepts the complaint or forwards it to its successor. */
public abstract class ComplaintHandler {
    private final ComplaintHandler next;

    protected ComplaintHandler(ComplaintHandler next) { this.next = next; }
    protected abstract Authority authority();
    protected abstract boolean canHandle(Severity severity);

    public final RoutingResult handle(Severity severity) {
        Objects.requireNonNull(severity, "Severity is required.");
        if (canHandle(severity)) {
            return new RoutingResult(authority(),
                    java.util.List.of(new RoutingResult.Step(authority(), "ASSIGNED")));
        }
        if (next == null) {
            return new RoutingResult(null,
                    java.util.List.of(new RoutingResult.Step(authority(), "UNHANDLED")));
        }
        RoutingResult downstream = next.handle(severity);
        var steps = new ArrayList<RoutingResult.Step>();
        steps.add(new RoutingResult.Step(authority(), "FORWARDED"));
        steps.addAll(downstream.steps());
        return new RoutingResult(downstream.assignedTo(), steps);
    }
}
