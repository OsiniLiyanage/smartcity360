package lk.osini.smartcity360.pattern.interpreter;

import java.util.Objects;
import java.util.Set;

public record NotExpression(Expression expression) implements Expression {
    public NotExpression { Objects.requireNonNull(expression); }
    @Override public boolean interpret(PolicyContext context) { return !expression.interpret(context); }
    @Override public Set<String> fields() { return expression.fields(); }
    @Override public String describe() { return "NOT (" + expression.describe() + ")"; }
}
