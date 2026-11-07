package lk.osini.smartcity360.pattern.interpreter;

import org.junit.jupiter.api.Test;
import java.math.BigDecimal;
import java.util.Map;
import static org.junit.jupiter.api.Assertions.*;

class PolicyParserTest {
    private PolicyContext context(String noise, int hour) {
        return new PolicyContext(Map.of("noise", new BigDecimal(noise), "hour", BigDecimal.valueOf(hour), "parkingMinutes", new BigDecimal("120")));
    }
    private boolean evaluate(String rule, String noise, int hour) { return PolicyParser.parse(rule).evaluate(context(noise, hour)); }
    @Test void handlesOvernightNoiseAndBoundaries() {
        String rule = "noise > 65 AND (hour >= 22 OR hour < 6)";
        assertTrue(evaluate(rule, "65.001", 22)); assertTrue(evaluate(rule, "70", 0));
        assertFalse(evaluate(rule, "65", 23)); assertFalse(evaluate(rule, "70", 6)); assertFalse(evaluate(rule, "70", 21));
    }
    @Test void respectsPrecedenceAndParentheses() {
        assertTrue(evaluate("hour == 8 OR hour == 9 AND noise > 65", "20", 8));
        assertFalse(evaluate("(hour == 8 OR hour == 9) AND noise > 65", "20", 8));
        assertTrue(evaluate("NOT hour == 9 AND noise < 65", "20", 8));
        assertTrue(evaluate("NOT (hour == 8 AND noise > 65)", "20", 8));
        assertTrue(evaluate("NOT NOT hour == 8", "20", 8));
    }
    @Test void implementsEveryComparisonUsingDecimalValues() {
        for (String operator : new String[]{">=", "<=", "=="}) assertTrue(evaluate("noise " + operator + " 65.00", "65", 0));
        for (String operator : new String[]{">", "<", "!="}) assertFalse(evaluate("noise " + operator + " 65.00", "65", 0));
        assertTrue(evaluate("noise != 64.999", "65", 0)); assertTrue(evaluate("noise > -1", "0", 0));
    }
    @Test void handlesParkingAndRuleChangesWithoutCodeChanges() {
        var ctx = context("0", 17);
        assertTrue(PolicyParser.parse("hour >= 8 AND hour < 18 AND parkingMinutes <= 120").evaluate(ctx));
        assertFalse(PolicyParser.parse("hour >= 8 AND hour < 17 AND parkingMinutes <= 120").evaluate(ctx));
    }
    @Test void rejectsMissingFieldsEvenInShortCircuitedBranches() {
        var ctx = new PolicyContext(Map.of("hour", BigDecimal.ZERO));
        assertThrows(IllegalArgumentException.class, () -> PolicyParser.parse("hour == 0 OR noise > 65").evaluate(ctx));
        assertThrows(IllegalArgumentException.class, () -> PolicyParser.parse("hour == 1 AND noise > 65").evaluate(ctx));
    }
    @Test void rejectsMalformedAndExecutableTextWithPositions() {
        for (String rule : new String[]{"noise >", "noise = 65", "noise > 65 trailing", "(noise > 65", "noise > 65)",
                "temperature > 20", "noise > 1e2", "hour > 1 AND", "noise > .5", "noise > 1.", "noise > 65; System.exit(0)", "noise > 1 && hour > 1", "noise > 1 or hour > 1"}) {
            var error = assertThrows(IllegalArgumentException.class, () -> PolicyParser.parse(rule), rule);
            assertTrue(error.getMessage().contains("character"), rule);
        }
    }
    @Test void boundsComplexityBeforeEvaluation() {
        assertThrows(IllegalArgumentException.class, () -> PolicyParser.parse(" ".repeat(1001)));
        assertThrows(IllegalArgumentException.class, () -> PolicyParser.parse("(".repeat(22) + "hour == 0" + ")".repeat(22)));
        assertThrows(IllegalArgumentException.class, () -> PolicyParser.parse("NOT ".repeat(22) + "hour == 0"));
        assertThrows(IllegalArgumentException.class, () -> PolicyParser.parse("hour==0 OR ".repeat(51) + "hour==0"));
        assertThrows(IllegalArgumentException.class, () -> PolicyParser.parse("noise > " + "1".repeat(21)));
    }
    @Test void validatesObservationRangesTypesAndPrecision() {
        for (var entry : Map.of("noise", "200.001", "hour", "24", "parkingMinutes", "10081", "unknown", "0").entrySet())
            assertThrows(IllegalArgumentException.class, () -> new PolicyContext(Map.of(entry.getKey(), new BigDecimal(entry.getValue()))));
        assertThrows(IllegalArgumentException.class, () -> context("-1", 0));
        assertThrows(IllegalArgumentException.class, () -> context("0.0001", 0));
        assertThrows(IllegalArgumentException.class, () -> new PolicyContext(Map.of("hour", new BigDecimal("1.5"))));
    }
    @Test void retainsImmutableContextAndExplainsParsedGrouping() {
        var rule = PolicyParser.parse("noise > 65 AND (hour >= 22 OR hour < 6)");
        assertEquals("(noise > 65 AND (hour >= 22 OR hour < 6))", rule.root().describe());
        assertEquals(java.util.Set.of("noise", "hour"), rule.root().fields());
        var values = new java.util.HashMap<>(Map.of("noise", new BigDecimal("70")));
        var ctx = new PolicyContext(values); values.put("noise", BigDecimal.ZERO);
        assertTrue(PolicyParser.parse("noise > 65").evaluate(ctx));
        assertThrows(UnsupportedOperationException.class, () -> ctx.values().clear());
    }
}
