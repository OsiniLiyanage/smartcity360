package lk.osini.smartcity360.pattern.interpreter;

import java.util.HashSet;
import java.util.Set;
import java.util.Objects;

public record AndExpression(Expression left, Expression right) implements Expression {
    public AndExpression { Objects.requireNonNull(left); Objects.requireNonNull(right); }
    @Override public boolean interpret(PolicyContext context) { return left.interpret(context) && right.interpret(context); }
    @Override public Set<String> fields() { var fields = new HashSet<>(left.fields()); fields.addAll(right.fields()); return Set.copyOf(fields); }
    @Override public String describe() { return "(" + left.describe() + " AND " + right.describe() + ")"; }
}
