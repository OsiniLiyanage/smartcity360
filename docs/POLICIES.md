# City policy workflow and Interpreter language

Part E lets staff save a small text rule, evaluate it against observations for a city zone, and retain the original rule with each result. Open `http://localhost:9080/smartcity360/policies.html`. All examples are fictional demonstration policies, not legal requirements.

## Setup and use

Apply the numbered database scripts through `006_policies.sql` using the database helper's `Setup` action, build the WAR and deploy. Existing records remain intact. Start PostgreSQL before Payara.

1. Choose a city. Add a district, street or building in City zones if the city has no zones yet.
2. Select **Overnight noise limit** or **Daytime parking permission** to open a new draft, or write your own rule.
3. Set its name, category and meaning. **A violation is detected** means true indicates a violation; **The activity is permitted** means true grants permission under this fictional rule.
4. Check syntax and review the explicit grouping. This check saves nothing.
5. Save the active policy. Select an observation zone, provide all required observation values and optionally add a note.
6. Choose **Evaluate and save result**. The result and its original rule, revision, meaning, observations, zone and timestamp are saved together.
7. Edit and save the rule, then evaluate again. Earlier history keeps the previous rule and outcome. Unsaved edits disable evaluation in the screen.

Policies can be made inactive to prevent new evaluations without deleting history. The page shows the revision supplied by the server. If another request changes a policy, an old edit or evaluation is rejected with 409; reload the saved policy before retrying. Reloading or selecting a different policy replaces the current draft.

## Language

The grammar is deliberately small and case-sensitive:

```text
rule       = orExpression
orExpression  = andExpression ("OR" andExpression)*
andExpression = unary ("AND" unary)*
unary      = "NOT" unary | "(" orExpression ")" | comparison
comparison = field operator number
field      = "noise" | "hour" | "parkingMinutes"
operator   = ">" | ">=" | "<" | "<=" | "==" | "!="
number     = optional minus, digits, optional decimal point followed by digits
```

`NOT` binds before `AND`, which binds before `OR`. Use parentheses to make intent clear. Numbers in expressions use ordinary decimal notation, not exponent notation. Literals have at most 20 characters including their sign and decimal point. The rule is limited to 1,000 characters, 200 tokens and 20 nested groups/negations.

| Observation | Accepted values | Meaning |
|---|---|---|
| `noise` | 0–200, at most 3 decimal places | Manually supplied noise level in dB |
| `hour` | Whole number 0–23 | Local hour of the observation; not automatically read from the server clock |
| `parkingMinutes` | Whole number 0–10080 | Manually supplied parking duration, up to seven days |

Every referenced field is required, including a field on a branch that boolean short-circuiting might otherwise skip. Additional known observation fields are optional but must still be valid. Unknown fields, numeric strings, null values and out-of-range values are rejected. Decimal comparisons use `BigDecimal` so numerical equality does not depend on trailing zeros.

Examples:

| Rule | Meaning of true | Example |
|---|---|---|
| `noise > 65 AND (hour >= 22 OR hour < 6)` | Violation | 70 dB at 23:00 matches; 65 dB at 23:00 and 70 dB at 06:00 do not |
| `hour >= 8 AND hour < 18 AND parkingMinutes <= 120` | Permitted | 120 minutes at 08:00 matches; 18:00 or 121 minutes does not |
| `NOT (hour >= 8 AND hour < 18)` | As chosen by author | Matches hours outside the daytime interval |

Category is an organizational label; it does not restrict which supported fields a rule may use. Rules belong to a city and are explicitly evaluated against a selected zone in that city. They are not automatically attached to all descendants or scheduled to run in the background.

## Pattern and storage

`Expression` defines `interpret(PolicyContext)`. `ComparisonExpression` is a terminal boolean expression. `AndExpression`, `OrExpression` and `NotExpression` are nonterminal expressions containing other expressions. `PolicyParser` constructs this tree from text. The immutable `PolicyContext` supplies observations, and `Parsed.evaluate()` validates all referenced fields before interpreting the root.

The parser is supporting code for creating the pattern's expression objects. It does not execute Java, JavaScript, SQL, functions or arbitrary code. A new parser instance is used for each parse, avoiding shared mutable parser state.

`policy` stores the current rule, name, category, meaning, active flag, edit version and update time. Names are unique within a city, with case-sensitive matching after trimming outer whitespace. `policy_evaluation` stores immutable result snapshots. The application database role can read/insert history but cannot update/delete it. Policies can be read/inserted/updated but not deleted through that role.

Both policy edits and evaluation writes lock the owning city inside a transaction. Evaluation checks the caller's saved version and active status before interpreting and saving. This prevents an evaluation from silently using a newer rule than the submitted version. Validation failures create no evaluation row. The server records evaluation time, not an independently verified observation time.

## API

All paths start with `/api`; write requests contain JSON objects.

| Method/path | Input or result |
|---|---|
| `POST /policy-language/validate` | `{expression}` → grouping and sorted `requiredFields`; no persistence |
| `GET /cities/{cityId}/policies` | Paginated policy list |
| `POST /cities/{cityId}/policies` | `{name, category, expression, trueMeaning, active}` → 201 |
| `GET /cities/{cityId}/policies/{id}` | Current policy, version, grouping and required fields |
| `PUT /cities/{cityId}/policies/{id}` | Same fields as create plus `version` → updated policy |
| `POST /cities/{cityId}/policies/{id}/evaluations` | `{version, zoneId, observations, note}` → 201 saved result; note optional |
| `GET /cities/{cityId}/policies/{id}/evaluations` | Paginated result history, newest first |

Both lists accept `page` (zero-based, 0–100000) and `pageSize` (1–100; default 25). Names allow 1–80 characters; notes at most 500. Categories are `NOISE`, `PARKING`, `CUSTOM`; meanings are `VIOLATION`, `PERMITTED`. Outcomes are `VIOLATION`, `NO_VIOLATION`, `PERMITTED`, `NOT_PERMITTED`. A false violation rule means no violation **under that particular rule**, not blanket legal compliance.

Invalid inputs return 400, missing or cross-city records 404, and duplicate names, stale versions or inactive-policy evaluation 409. Rule syntax errors include a one-based character position. Extremely large/malformed transport bodies may be rejected by the server before application validation.

## Verification and limits

`mvn test` includes nine Interpreter tests. With both servers running, `node scripts/verify-policies.mjs` executes 84 HTTP checks. A successful run retains two demo cities, three policies and eight evaluation snapshots. An initial development run stopped after creating one policy because the test incorrectly assumed JPA's first version would be zero; that retained dataset is separate. The assertion and UI now use the actual server version.

See [verification evidence](VERIFICATION.md) for browser and restart results, and [E1–E3 report material](report/PART_E_INTERPRETER.md) for the UML and critical assessment.

There are no date/calendar rules, functions, arithmetic, unit conversions, automated sensing, enforcement actions or full policy-edit audit log. Evaluated revisions are preserved, but unevaluated intermediate edits are not. The grammar is parsed afresh rather than cached; scale testing of very large policy collections is not claimed. Application accounts and role/city boundaries are enforced; see [accounts](ACCOUNTS.md).
