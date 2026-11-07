package lk.osini.smartcity360.pattern.chain;

import java.util.List;

public record RoutingResult(Authority assignedTo, List<Step> steps) {
    public RoutingResult { steps = List.copyOf(steps); }
    public record Step(Authority handler, String action) { }
}
