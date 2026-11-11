# Assessment acceptance review

Reviewed 11 November 2026 against `1793255323861-OODP_II_Final_Assessment.pdf`, all five pages. Application baseline: 5652fe0. This is an implementation and report-source review, not a final submission report or a prediction of marks.

## Conclusion

All five compulsory scenario patterns are implemented and invoked by the application services. A fresh pattern-only Maven run passed 33 tests with no failures, errors or skips. The earlier current full suite passed 67 tests. No missing core A-E pattern mechanism was found. Submission readiness is still incomplete: the report sources need consolidation, rendered UML, current evidence and verified references; the video and viva preparation are outstanding.

The PDF requires one appropriate pattern for each scenario, not every pattern taught in class. Builder and Visitor are optional product extensions, not missing A-E requirements. The PDF refers to a supplied pattern set but does not enumerate it; the class PDF explicitly teaches the five selected patterns (Decorator pp. 2-5, Composite pp. 5-9, Chain of Responsibility pp. 17-20, Flyweight pp. 20-25, Interpreter pp. 25-27).

## Every marked question

Each A-E part is 15 marks: identification 3, mechanism/diagram 4, evaluation 8. Status below means source/code coverage, not awarded marks or final PDF completion.

| Question | Requirement | Reviewed evidence and status |
|---|---|---|
| A1 | Identify and justify wrappers pattern | Covered in `report/PART_A_DECORATOR.md` A1: Decorator, shared interface and composition instead of subclass combinations. |
| A2 | Explain flexible layered behavior | A2 describes `AuthenticationDecorator(EncryptionDecorator(CompressionDecorator(PlainMeterStream)))`, encode/decode order and runtime flags. `MeterService` builds the actual chain. Covered. |
| A3 | Evaluate reuse and extensibility | A3 covers wrapper responsibility, reuse, ordering, allocation costs, credential/key lifecycle and limitations. Covered; stale account-security claims corrected in this review. |
| B1 | Identify hierarchy pattern | `report/PART_B_COMPOSITE.md` B1 identifies Composite with uniform component operations. Covered. |
| B2 | UML showing the mechanism | B2 Mermaid models `ZoneComponent`, `ZoneGroup`, `Building` and service delegation. Core relationships match implementation. Source ready; readable rendered figure still required in final PDF. |
| B3 | Large/growing infrastructure | B3 discusses uniform clients, recursion, adding nodes, tree reconstruction cost, locking and scale limits. Covered; saved-reading/authentication status corrected. |
| C1 | Identify dynamic escalation pattern | `report/PART_C_CHAIN_OF_RESPONSIBILITY.md` C1 selects Chain of Responsibility. `ComplaintService` wires local, supervisor and manager handlers. Covered. |
| C2 | Explain decoupling | C2 explains common handler operation, next link and accept-or-forward behavior. Service calls the first handler rather than selecting the final team directly. Covered. |
| C3 | Benefits and drawbacks | C3 discusses flexible wiring, order dependence, unhandled requests, traceability and persistence cost. Covered; authenticated actor/private-note explanation corrected. |
| D1 | Identify memory-sharing pattern | `report/PART_D_FLYWEIGHT.md` D1 explains immutable shared lamp configuration and pooled object identity. Covered. |
| D2 | Intrinsic versus extrinsic | D2 separates model/watts/colour from individual ID, street/location and state. `StreetLightService` obtains actual objects from the factory. Covered. |
| D3 | Tens-of-thousands analysis | D3 provides the N/K memory model, overhead and limitations. The test creates 100,000 contexts sharing three specifications; this is not a measured heap-byte reduction or database load benchmark. Covered with these qualifications. |
| E1 | Identify DSL pattern | `report/PART_E_INTERPRETER.md` E1 identifies Interpreter. `PolicyParser` constructs expression objects rather than executing arbitrary source. Covered. |
| E2 | UML showing mechanism | E2 Mermaid shows `Expression`, comparison/AND/OR/NOT nodes, context, parser and nested `Parsed` result. Core roles match source. Rendered figure still required. |
| E3 | Rule updates and extensibility | E3 distinguishes changing existing rule text at runtime from adding grammar features in code; covers parsing cost, limits, snapshots and missing full edit audit. Covered. |

## Five pattern behavior checks

Run: `mvn -B -o -Dtest=MeterStreamTest,ZoneCompositeTest,ComplaintHandlerTest,StreetLightTest,PolicyParserTest test`.

| Scenario | Passed tests | Behavior confirmed |
|---|---:|---|
| A: Decorator | 7 | All eight layer combinations recover original bytes; credentials, nonce uniqueness, tampering, wrong keys, compression/corruption and bounded decoding. |
| B: Composite | 5 | Uniform building/group operations, subtree power isolation, usage preservation, empty groups and invalid hierarchy/ownership rejection. |
| C: Chain of Responsibility | 6 | LOW/MEDIUM/HIGH routes, ordered visits, alternate entry point, explicit unhandled result and independent immutable histories. |
| D: Flyweight | 6 | Shared identity, configuration-key distinction, independent light state, concurrency, 100,000-light sharing and invalid specifications. |
| E: Interpreter | 9 | Noise/parking boundaries, comparisons, precedence, parentheses, rule changes without recompilation, malformed input, missing values, complexity limits and immutable context. |

These fresh tests confirm pattern behavior in Java; they are not a fresh browser/database regression of every module. Integration is visible in `MeterService`, `ZoneService`, `ComplaintService`, `StreetLightService` and `PolicyService`. Prior live evidence is in `VERIFICATION.md`, `UI_CHECKPOINT.md` and `SAMPLE_DATA.md`. The latest complaint journey additionally passed 42 live write/isolation checks, followed by 106 role checks without an ownership skip.

## Part F and general requirements

| Requirement | Status / remaining action |
|---|---|
| One SmartCity360 application covering A-E | Implemented in one Java WAR, with linked city/zone data and five relevant modules. |
| Working implementation and code evidence | Code exists and pattern tests pass. Select current excerpts and labelled screenshots for the final report. |
| Viva: patterns, architecture, functionality, structure (15 marks) | Per-part explanation drafts exist. User rehearsal and ability to explain tradeoffs are not yet verified. |
| Comprehensive documentation, UML and working code (10 marks) | Five answer drafts and diagram sources exist. Consolidation, rendering and final cross-check remain. |
| PDF uploaded to Project Document | Pending and on user hold. No final PDF prepared in this review. |
| Complete source/resources ZIP uploaded to Project File | Pending and on user hold. Must exclude local secrets and include reproducible setup instructions. |
| 10-15 minute MP4 demonstration uploaded to Demonstration Video | Pending and on user hold. Must visibly demonstrate all five patterns, not only general screens. |
| Acknowledge used sources and distinguish quotations (page 2) | Reference drafts exist, but metadata, adaptations and final citations still require review. Do not claim this is complete. |
| No fabricated evidence (page 2) | Samples are fictional application data. Explicitly label them as such in the report/demo; realistic record names do not make them real municipal observations. Preserve genuine test outcomes and benchmark limits. |
| Java, consolidated report and Harvard style | Java stack implemented. Consolidation/Harvard consistency remain; these additional instructions came from the lecturer messages supplied by the user. |

## Required next steps versus enhancements

1. Finish report-source cleanup: older dated evidence counts must remain labelled historical, and remaining access-control descriptions must reflect the current backend. Validate screenshot paths and bibliography metadata.
2. When authorized, render B/E UML (and supporting diagrams), assemble the single report with all 15 answers and current code evidence, and verify the final layout.
3. Rehearse five short demonstrations: meter wrapper selection/recovery; subtree power/usage; severity routing/history; shared streetlight identity at scale; edited policy producing changed outcomes while retaining old snapshots.
4. Complete a final integrated walkthrough and clean-setup/restart check before packaging and recording.

Saved notifications, maintenance assignment/history, more reports, power-command history, Builder and Visitor are product enhancements. They should not be described as explicit missing requirements of this assessment PDF. Pattern correctness is confirmed within the stated evidence; the complete assignment is not yet submission-ready.
