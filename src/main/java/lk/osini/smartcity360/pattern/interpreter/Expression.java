package lk.osini.smartcity360.pattern.interpreter;

import java.util.Set;

/** A node in the policy language. Interpret receives observation state explicitly. */
public interface Expression {
    boolean interpret(PolicyContext context);
    Set<String> fields();
    String describe();
}
