package lk.osini.smartcity360.pattern.interpreter;

import java.math.BigDecimal;
import java.util.Map;
import java.util.Set;

public final class PolicyContext {
    public static final Set<String> FIELDS = Set.of("noise", "hour", "parkingMinutes");
    private final Map<String, BigDecimal> values;

    public PolicyContext(Map<String, BigDecimal> values) {
        if (values == null) throw new IllegalArgumentException("Provide observation values.");
        values.forEach((field, value) -> {
            if (!FIELDS.contains(field)) throw new IllegalArgumentException("Unknown observation field: " + field);
            if (value == null) throw new IllegalArgumentException("Provide a number for " + field + ".");
            BigDecimal maximum = new BigDecimal(switch (field) {
                case "noise" -> "200"; case "hour" -> "23"; default -> "10080";
            });
            if (value.signum() < 0 || value.compareTo(maximum) > 0)
                throw new IllegalArgumentException(field + " must be between 0 and " + maximum + ".");
            int scale = value.stripTrailingZeros().scale();
            if (scale > (field.equals("noise") ? 3 : 0))
                throw new IllegalArgumentException(field.equals("noise") ? "Noise allows up to three decimal places." : field + " must be a whole number.");
        });
        this.values = Map.copyOf(values);
    }
    public BigDecimal value(String field) {
        BigDecimal value = values.get(field);
        if (value == null) throw new IllegalArgumentException("Missing observation: " + field + ".");
        return value;
    }
    // Validate every referenced field before short-circuit evaluation can skip a branch.
    public void require(Set<String> fields) { fields.stream().sorted().forEach(this::value); }
    public Map<String, BigDecimal> values() { return values; }
}
