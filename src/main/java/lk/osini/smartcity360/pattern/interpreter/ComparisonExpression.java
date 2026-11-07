package lk.osini.smartcity360.pattern.interpreter;

import java.math.BigDecimal;
import java.util.Set;

/** Terminal boolean expression: one known field compared with one decimal literal. */
public record ComparisonExpression(String field, String operator, BigDecimal threshold) implements Expression {
    public ComparisonExpression {
        if (!PolicyContext.FIELDS.contains(field) || !Set.of(">", ">=", "<", "<=", "==", "!=").contains(operator) || threshold == null)
            throw new IllegalArgumentException("Invalid comparison.");
    }
    @Override public boolean interpret(PolicyContext context) {
        int comparison = context.value(field).compareTo(threshold);
        return switch (operator) {
            case ">" -> comparison > 0; case ">=" -> comparison >= 0;
            case "<" -> comparison < 0; case "<=" -> comparison <= 0;
            case "==" -> comparison == 0; case "!=" -> comparison != 0;
            default -> throw new IllegalStateException("Unknown comparison.");
        };
    }
    @Override public Set<String> fields() { return Set.of(field); }
    @Override public String describe() { return field + " " + operator + " " + threshold.toPlainString(); }
}
