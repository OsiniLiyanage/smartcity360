package lk.osini.smartcity360.pattern.interpreter;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

/** Bounded recursive-descent parser. No script engine or dynamic Java execution. */
public final class PolicyParser {
    private record Token(String text, int position) { }
    public record Parsed(Expression root) {
        public boolean evaluate(PolicyContext context) { context.require(root.fields()); return root.interpret(context); }
    }
    private final List<Token> tokens = new ArrayList<>();
    private int cursor;
    private PolicyParser(String source) {
        if (source == null || source.isBlank() || source.length() > 1000)
            throw new IllegalArgumentException("Rule must contain 1 to 1000 characters.");
        for (int i = 0; i < source.length();) {
            char c = source.charAt(i);
            if (Character.isWhitespace(c)) { i++; continue; }
            int start = i;
            if (Character.isLetter(c)) {
                while (i < source.length() && Character.isLetter(source.charAt(i))) i++;
            } else if (c >= '0' && c <= '9' || c == '-') {
                if (c == '-') i++;
                int digits = i;
                while (i < source.length() && source.charAt(i) >= '0' && source.charAt(i) <= '9') i++;
                if (digits == i) throw error("Expected digits after minus", start);
                if (i < source.length() && source.charAt(i) == '.') {
                    i++; int fraction = i;
                    while (i < source.length() && source.charAt(i) >= '0' && source.charAt(i) <= '9') i++;
                    if (fraction == i) throw error("Expected digits after decimal point", i);
                }
                if (i - start > 20) throw error("Number is too long (maximum 20 characters)", start);
            } else if ("<>=!".indexOf(c) >= 0) {
                i++; if (i < source.length() && source.charAt(i) == '=') i++;
            } else if (c == '(' || c == ')') i++;
            else throw error("Unexpected character '" + c + "'", i);
            tokens.add(new Token(source.substring(start, i), start));
            if (tokens.size() > 200) throw error("Rule is too complex (maximum 200 tokens)", start);
        }
        tokens.add(new Token("<end>", source.length()));
    }
    public static Parsed parse(String source) {
        var parser = new PolicyParser(source);
        Expression root = parser.or(0);
        if (!parser.peek().equals("<end>")) throw parser.failure("Unexpected token '" + parser.peek() + "'");
        return new Parsed(root);
    }
    private Expression or(int depth) {
        Expression result = and(depth);
        while (accept("OR")) result = new OrExpression(result, and(depth));
        return result;
    }
    private Expression and(int depth) {
        Expression result = unary(depth);
        while (accept("AND")) result = new AndExpression(result, unary(depth));
        return result;
    }
    private Expression unary(int depth) {
        if (depth > 20) throw failure("Nesting is too deep (maximum 20)");
        if (accept("NOT")) return new NotExpression(unary(depth + 1));
        if (accept("(")) {
            Expression result = or(depth + 1);
            if (!accept(")")) throw failure("Expected ')'");
            return result;
        }
        String field = peek();
        if (!PolicyContext.FIELDS.contains(field)) throw failure("Expected noise, hour or parkingMinutes; found '" + field + "'");
        cursor++;
        String operator = peek();
        if (!Set.of(">", ">=", "<", "<=", "==", "!=").contains(operator)) throw failure("Expected >, >=, <, <=, == or !=");
        cursor++;
        String value = peek();
        if (!value.matches("-?[0-9]+(\\.[0-9]+)?")) throw failure("Expected a decimal number");
        cursor++;
        return new ComparisonExpression(field, operator, new BigDecimal(value));
    }
    private String peek() { return tokens.get(cursor).text(); }
    private boolean accept(String text) { if (!peek().equals(text)) return false; cursor++; return true; }
    private IllegalArgumentException failure(String message) { return error(message, tokens.get(cursor).position()); }
    private static IllegalArgumentException error(String message, int position) {
        return new IllegalArgumentException(message + " at character " + (position + 1) + ".");
    }
}
