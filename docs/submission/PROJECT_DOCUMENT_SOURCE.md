# 1. Introduction

## 1.1 Overview

SmartCity360 is an integrated Java web application for managing selected city infrastructure, operational devices, public services and resident interactions. The application connects five compulsory Object Oriented Design Patterns II scenarios in one product. City teams can inspect a city hierarchy, process simulated energy-meter messages, route and work on resident complaints, manage streetlights, and evaluate city-policy rules written in a small domain-specific language. Residents can register, submit complaints and follow their own cases, while staff roles receive different operational permissions.

The assessed design patterns remain visible in ordinary Java classes rather than being hidden inside framework code. Decorator provides selectable meter-message layers. Composite represents city zones. Chain of Responsibility routes complaints according to severity. Flyweight shares common lamp specifications. Interpreter evaluates textual policy expressions. Jakarta REST, JPA, PostgreSQL, Payara, HTML, Tailwind CSS and JavaScript support those pattern implementations but are not presented as extra answers to Parts A-E.

SmartCity360 is packaged as one Maven WAR and deployed on Payara Community. The browser and server use one origin, so the interface calls relative REST endpoints without a separate frontend server. Persistent records are stored in PostgreSQL. The current system is a local academic demonstration: software processing and persistence are real, while power switching, meter devices, lamp hardware and sensor observations are explicitly simulated.

## 1.2 Problem Statement

A city platform contains objects with very different structures and lifecycles. An energy message may need optional security and compression layers. A city is naturally hierarchical. A complaint may pass through several authorities. Thousands of lights can repeat the same model data. A policy written by an officer must be parsed and evaluated without hard-coding one Java class for every rule. Solving each problem with large conditional blocks or duplicated classes would make the application difficult to change, test and explain.

The project must therefore choose one appropriate object-oriented pattern for each scenario, justify that choice, implement the collaborating classes and critically evaluate the consequences. The final result must also be demonstrable as one working system, documented with readable UML and supported by genuine code and test evidence. This requirement creates a second challenge: the pattern examples must be academically clear while still participating in useful browser workflows and persistent data operations.

## 1.3 Motivation

SmartCity360 was selected because it provides a connected setting in which structural, behavioral and language-oriented patterns can be compared. The same city data can support several journeys. A resident can report a faulty light; the complaint chain assigns the correct authority; staff can inspect the street and its individual light; managers can review scoped reports. A building can receive a validated meter reading; the Composite immediately reports the updated district and city total. A policy can evaluate an observation for one of the same stored zones.

This integration is more meaningful than five unrelated console examples. It demonstrates not only the textbook class shape, but also how a pattern interacts with validation, persistence, access control, concurrent edits and user feedback. The application remains deliberately bounded so each pattern can still be explained during the viva.

## 1.4 Project Objectives

1. Implement all five compulsory scenarios in one Java application using exactly one suitable assessed pattern for each scenario.
2. Keep the pattern roles visible and testable independently of REST, persistence and browser code.
3. Build a city hierarchy that supports uniform usage reporting and simulated power commands at city, district, street and building levels.
4. Process meter messages with runtime-selectable authentication, compression and encryption while verifying exact recovery before accepting a reading.
5. Route complaints from local staff to supervisors and city managers according to severity while preserving traceable history and a separate work lifecycle.
6. Demonstrate shared streetlight specifications at a scale of 100,000 temporary light contexts without losing independent location and operating state.
7. Parse and evaluate editable noise and parking expressions with explicit precedence, validation and revision snapshots.
8. Persist important records in PostgreSQL and enforce role, city, tier and ownership boundaries in Java.
9. Provide a consistent, responsive browser interface, scoped dashboards and complaint reports using local assets.
10. Produce comprehensive project documentation that answers A1-A3 through E1-E3, includes UML diagrams and reports only genuine evidence.

## 1.5 Scope

The implemented scope includes city and zone creation, hierarchical usage and power operations, meter registration and reading history, complaint submission and escalation, employee assignment, resident/staff messages, reopening review, streetlight inventory and sharing demonstrations, policy management and evaluation history, account administration, role dashboards, profile settings, themes and filtered complaint reports.

Physical sensors and municipal hardware are outside the project. A meter message is created by the browser and processed by the real Java Decorator chain; it is not transmitted by a physical meter. Power changes are saved simulated states, not commands sent to an electrical network. Noise and parking observations are manually entered demonstration values, not legal findings. Email verification, password recovery, persisted notifications, complete maintenance history, historical energy periods and broader operational reports are not claimed as completed features.

[[STATUS|Scope control|The five assessed pattern scenarios are implemented. Broader municipal-product ideas are separated into future work so optional features cannot hide or distort the required pattern answers.]]

## 1.6 Assessment Traceability

[[TABLE|Assessment-question traceability]]
| Question | Required response | Selected solution | Primary implementation | Main evidence in this document |
|---|---|---|---|---|
| A1 | Identify and justify a pattern | Decorator | `pattern/decorator`, `MeterService` | Section 5.1.1 |
| A2 | Explain flexible layered enhancement | Common component plus runtime wrappers | `MeterStream`, concrete decorators | Section 5.1.2 and UML |
| A3 | Evaluate reuse and extensibility | Combination, testing, cost and lifecycle analysis | Unit/live checks and meter history | Section 5.1.3 |
| B1 | Identify hierarchy pattern | Composite | `ZoneComponent`, `ZoneGroup`, `Building` | Section 5.2.1 |
| B2 | Provide UML and mechanism | Component, composite and leaf | `pattern/composite`, `ZoneService` | Section 5.2.2 and UML |
| B3 | Discuss growth and infrastructure use | Recursive uniform operations with stated costs | Zone API, transactions and tests | Section 5.2.3 |
| C1 | Identify dynamic escalation pattern | Chain of Responsibility | Three `ComplaintHandler` classes | Section 5.3.1 |
| C2 | Explain decoupling | Sender knows first handler and common operation | `ComplaintService`, `RoutingResult` | Section 5.3.2 and UML |
| C3 | Evaluate flexibility and traceability | Ordering, history, failure and concurrency analysis | Complaint events and version checks | Section 5.3.3 |
| D1 | Identify resource-sharing pattern | Flyweight | `LampSpecificationFactory` and shared specification | Section 5.4.1 |
| D2 | Explain intrinsic/extrinsic state | Shared immutable configuration plus light context | `LampSpecification`, `StreetLight` | Section 5.4.2 and UML |
| D3 | Analyze tens-of-thousands scale | N contexts and K specifications | 100,000-light test/demonstration | Section 5.4.3 |
| E1 | Identify mini-language pattern | Interpreter | Expression interface and nodes | Section 5.5.1 |
| E2 | Provide UML and mechanism | Parser creates an expression tree evaluated with context | `PolicyParser`, expressions, context | Section 5.5.2 and UML |
| E3 | Critically assess updates/extensibility | Runtime rule edits versus grammar-code changes | Revisions, bounds and tests | Section 5.5.3 |

# 2. Background and Technology Context

## 2.1 Smart-City Management Context

A smart-city platform coordinates information from infrastructure, operational teams and residents. Even a small demonstration has several kinds of state: spatial ownership, equipment configuration, reported observations, service requests and user permissions. These concerns should not be placed in one large controller. SmartCity360 separates browser presentation, HTTP resources, application services, pattern classes and persistence mappings.

The project uses fictional demonstration data. Names, thresholds, meter readings and operational outcomes are not presented as records from a real Sri Lankan municipality. A true policy result means only what the saved policy declares, such as VIOLATION or PERMITTED. It does not automatically impose a penalty or establish legal compliance. This boundary is important for both technical accuracy and the assessment rule against invented evidence.

## 2.2 Object-Oriented Design Patterns

A design pattern describes a reusable collaboration for a recurring design problem, not a copy-and-paste implementation. The Gang of Four catalogue distinguishes creational, structural and behavioral patterns and emphasizes consequences as well as intent (Gamma et al., 1994). The supplied OODP II notes provide the class structures used as the teaching baseline. SmartCity360 adapts those structures to the five specified scenarios.

Decorator, Composite and Flyweight are structural patterns. Decorator layers behavior around a common component; Composite gives individual objects and groups a uniform interface; Flyweight separates shared intrinsic state from per-context extrinsic state. Chain of Responsibility and Interpreter are behavioral patterns. The chain passes a request across possible handlers, while Interpreter represents grammar rules as objects that evaluate a context.

The assignment requires exactly one appropriate pattern for each scenario. Supporting components such as a factory method, recursive-descent parser, JPA service or REST filter are described by their technical responsibility. They are not falsely counted as additional assessed patterns.

[[TABLE|Selected patterns and scenario fit]]
| Part | Scenario pressure | Pattern | Why it fits |
|---|---|---|---|
| A | Optional layers and combinations without changing core stream logic | Decorator | Wrappers share one interface, delegate and add one responsibility at runtime. |
| B | City groups and individual buildings need the same operations | Composite | Component, composite and leaf support uniform recursive operations. |
| C | Sender should not select the final authority | Chain of Responsibility | Each handler accepts or forwards to its successor. |
| D | Many light objects repeat a small set of configurations | Flyweight | Immutable intrinsic configuration is shared while context remains independent. |
| E | Text rules must become executable object structures | Interpreter | Terminal and nonterminal expressions evaluate a supplied observation context. |

## 2.3 Technology Stack

[[TABLE|Project technology stack]]
| Component | Project version or choice | Responsibility |
|---|---|---|
| Java | 21 | Pattern classes, validation, services and server-side business logic |
| Jakarta EE API | 11.0.0 | Standard REST, CDI, transactions, servlet sessions and persistence APIs |
| Payara Community | 7.2026.10 in the recorded local environment | Jakarta runtime and WAR deployment |
| Jakarta REST | JAX-RS through Payara | JSON HTTP resources under `/api` |
| Jakarta Persistence | JPA through Payara provider | Entity mapping and transaction-aware persistence |
| PostgreSQL | 18.6 in the recorded local environment | Durable relational records, constraints and indexes |
| PostgreSQL JDBC | 42.7.14 | Database connectivity supplied to Payara |
| Maven | WAR build | Dependency, compilation, testing and packaging lifecycle |
| JUnit Jupiter | 5.11.4 | Java unit and service tests |
| HTML and JavaScript | Browser-native | Forms, API calls, role workspaces, filters and interactions |
| Tailwind CSS | 4.3.0 CLI plus project CSS | Compiled local styles without a runtime CDN |
| IntelliJ IDEA Ultimate | Development environment | Editing, Maven integration and local Payara workflow |

## 2.4 Technology Rationale

Java is required by the lecturer guidance and directly supports the class examples. Jakarta REST keeps HTTP concerns in resources while the assessed patterns remain framework-independent Java. Payara supplies the Jakarta EE runtime, transaction integration and persistence provider. PostgreSQL is suitable for the strongly related city, zone, complaint, device and history records. Database constraints reinforce, but do not replace, Java validation.

The frontend uses plain HTML and JavaScript so the project does not introduce a second application framework merely for presentation. Tailwind's CLI produces a static CSS file committed with the source. The deployed application therefore does not require Node.js or an external CDN at runtime. One WAR and one browser origin simplify setup and avoid cross-origin configuration during the demonstration.

## 2.5 Source and Evidence Integrity

The assessment brief, supplied lecture notes, official platform documentation and project-owned test evidence are acknowledged. Pattern descriptions are written for this implementation rather than copied from third-party tutorials. Direct code names and short snippets are taken from the student's own repository. Screenshots contain labelled demonstration records rather than real citizen information.

Some test evidence was produced at earlier development checkpoints. The latest repository records 67 Java tests and additional checks, but it also states that not every older module HTTP suite was rerun after every later permission change. This report retains that distinction. The final acceptance chapter must be updated after the last combined run instead of converting historical evidence into an unsupported claim of current full regression.

# 3. Requirements and Specification

## 3.1 Stakeholders and Roles

SmartCity360 has five application roles. A role alone does not grant access to every record. Java also checks staff city assignment, complaint authority tier, resident ownership, workflow state and named assignment where relevant.

[[TABLE|Role responsibilities and boundaries]]
| Role | Main responsibilities | Enforced boundary |
|---|---|---|
| Resident | Register, manage profile, submit complaints, read own public history, send messages and request reopening | Own complaints only; no operational device data or staff-only notes |
| Local staff | Work on local-tier cases, add work notes, inspect assigned-city operations and update permitted device state | Assigned city and accessible tier |
| Supervisor | Review local work, handle medium cases, assign eligible staff and approve supported operations | Assigned city; local and supervisor tiers |
| City manager | Handle high-severity cases, oversee city operations, manage policies and broader power commands | Assigned city; no global user administration |
| System administrator | Bootstrap/provision accounts, manage access, create cities/specifications and inspect cross-city administration | Cross-city administrative scope; self-role/status changes are blocked |

## 3.2 Functional Requirements

[[TABLE|Functional requirements]]
| ID | Requirement | Current status |
|---|---|---|
| FR-01 | Register resident accounts and authenticate all roles with server sessions | Implemented and recorded |
| FR-02 | Apply role, city, tier and ownership checks to protected endpoints | Implemented and recorded |
| FR-03 | Create city, district, street and building structures in strict order | Implemented and recorded |
| FR-04 | Report usage and apply simulated power commands uniformly at any hierarchy level | Implemented and recorded |
| FR-05 | Register a building meter and issue/replace its private demonstration credential | Implemented and recorded |
| FR-06 | Process a reading through any supported combination of authentication, compression and encryption | Implemented and recorded |
| FR-07 | Recover a stored reading, detect invalid credentials/tampering and update usage only after a successful round trip | Implemented and recorded |
| FR-08 | Allow a resident to submit a complaint against a city/area and route it by severity | Implemented and recorded |
| FR-09 | Preserve route/work history, assign eligible employees, exchange public messages and review reopening requests | Implemented and recorded |
| FR-10 | Register lights, update independent power/fault state and reuse immutable specifications | Implemented and recorded |
| FR-11 | Demonstrate 100,000 temporary light contexts sharing three specification identities | Implemented and recorded |
| FR-12 | Save, edit, activate and validate policy expressions | Implemented and recorded |
| FR-13 | Evaluate a saved policy against zone observations and preserve the original revision in history | Implemented and recorded |
| FR-14 | Display role-scoped dashboard totals, recent cases and a status chart | Implemented; richer trends remain planned |
| FR-15 | Filter authorized complaints and provide printable report layout | Implemented; native print/PDF verification pending |
| FR-16 | Persist account, city, complaint, device and policy records across restart | Recorded at dated checkpoints; final combined persistence recheck pending |

## 3.3 Non-Functional Requirements

[[TABLE|Non-functional requirements]]
| Quality | Requirement | Design response |
|---|---|---|
| Maintainability | Keep pattern logic separate from HTTP and entity mapping | Dedicated `pattern/*` packages, resources and services |
| Correctness | Reject malformed types, invalid hierarchy links, cross-city IDs and stale edits | Server validation, foreign keys, version fields and conflict responses |
| Security | Hash passwords and meter credentials; protect sessions and state-changing requests | PBKDF2-HMAC-SHA256, SHA-256 meter hash, HttpOnly/SameSite session and CSRF token |
| Privacy | Prevent residents from reading other cases or internal staff notes | Ownership queries and privacy-safe event JSON |
| Reliability | Commit state and history together; preserve ordered complaint events | JPA transactions, row locks and explicit event flushing |
| Performance | Bound message, rule, page and demonstration sizes | 64 KiB meter limit, 1,000-character DSL, token/depth limits and paged inventory |
| Scalability | Avoid repeated specification objects and unbounded browser lists | Flyweight pool, database aggregates and bounded pages |
| Usability | Provide role navigation, validation, loading/error/success feedback and responsive layout | Shared shell, alerts, light/dark themes and mobile drawer |
| Portability | Build from source with documented Java/Maven/runtime versions | Maven WAR, committed CSS and additive SQL scripts |
| Auditability | Preserve relevant history and original policy/evaluation snapshots | Complaint events, account events, meter readings and policy-evaluation rows |

## 3.4 Use-Case Overview

The use-case diagram summarizes major role interactions. It is intentionally high-level: the permission matrix and Java access rules remain authoritative for exact operations.

![SmartCity360 role and use-case overview](docs/submission/figures/use-cases.png){width=6.35}

A typical connected journey begins when a resident signs in and reports a faulty light. The severity passes through the complaint chain and establishes an authority tier. An authorized manager may allocate an eligible staff member. Staff inspect the streetlight record, communicate a public update, preserve private work notes and resolve the case. The resident can read the public outcome and request reopening if the issue remains. This journey links resident services, the Chain of Responsibility and streetlight operations without merging their class responsibilities.

## 3.5 Input and Domain Constraints

Names and descriptions are trimmed and bounded before persistence. Hierarchy nodes must follow CITY to DISTRICT to STREET to BUILDING. A building owns non-negative usage with at most three decimal places and an explicit simulated power state. Cross-city parent references are rejected by service validation and composite foreign keys.

Meter messages are limited to 64 KiB before transformation. Meter credentials are random and only their SHA-256 hashes are stored. AES-GCM uses a fresh 12-byte nonce and 128-bit tag. The private encryption key is stored outside both the source repository and PostgreSQL.

Complaint severity is LOW, MEDIUM or HIGH. Work status is separate from routing authority. Mutations require the current version and return a conflict for stale views. Policy expressions accept only `noise`, `hour` and `parkingMinutes`, comparison operators, `AND`, `OR`, `NOT` and parentheses. The parser rejects more than 1,000 source characters, 200 tokens or 20 nesting levels.

## 3.6 Technical Constraints

The application requires JDK 21, Maven, Payara Community compatible with Jakarta EE 11 and PostgreSQL. It is not a standalone Spring Boot executable and has no `main` method. Local setup uses a separate Payara domain with HTTP port 9080 and administration port 9048. Browser URLs are relative to the `/smartcity360` context.

The current database scripts are additive and rerunnable but do not use a migration-history table. Future one-time data transformations need a migration runner before they can be considered safe. The local demonstration uses loopback HTTP; public deployment would require HTTPS, production secrets, backup procedures, monitoring and a full security review.

# 4. System Design

## 4.1 Layered Architecture

SmartCity360 follows a layered web architecture. Browser files render presentation and issue JSON requests. Jakarta REST resources parse HTTP input and return status-specific responses. The access filter resolves the authenticated user and checks an allowlist. Services coordinate pattern objects, transactions and entities. JPA maps entities to PostgreSQL. The meter encryption key is deliberately outside the database and Git repository.

![Layered architecture of SmartCity360](docs/submission/figures/architecture.png){width=6.35}

This separation prevents a design pattern from becoming a controller or database entity. For example, `ComplaintHandler` knows only severity, successor and routing result. `ComplaintService` supplies authentication context, transactions and persistence. `ComplaintResource` supplies HTTP behavior. The same principle applies to each assessed pattern.

## 4.2 Request Flow

A normal protected request follows these steps:

1. The browser loads the current session and CSRF token from the authentication endpoint.
2. JavaScript sends JSON to a relative `/api` URL and includes the CSRF header for a write.
3. `ApiAccessFilter` resolves the resource operation, denies unknown operations by default and establishes `CurrentUser`.
4. The resource validates JSON shape and delegates to a service.
5. The service checks record-level scope, invokes the pattern collaboration and changes entities inside a transaction.
6. PostgreSQL constraints provide an additional integrity boundary.
7. The resource converts the result to privacy-appropriate JSON and the page displays a success, validation or error alert.

HTTP status codes distinguish outcomes: 400 for malformed input, 401 for missing/invalid authentication, 403 for insufficient permission, 404 for inaccessible or missing scoped records, and 409 for stale or invalid workflow transitions. Hiding a browser control is only a usability measure; Java repeats authorization for direct requests.

## 4.3 Persistent Data Design

The relational model stores current operational state separately from immutable or append-oriented history. `city` and `zone` represent location. `complaint_event`, `meter_reading` and `policy_evaluation` preserve evidence around changing parent records. `lamp_specification` is normalized and referenced by many `streetlight` rows. `app_user` supports both resident ownership and named staff assignment.

![Simplified SmartCity360 relational model](docs/submission/figures/data-model.png){width=6.35}

[[TABLE|Database table responsibilities]]
| Table group | Responsibility | Integrity approach |
|---|---|---|
| `city`, `zone` | City hierarchy, current building usage and power state | Parent/city foreign keys, strict type and leaf-state checks |
| `complaint`, `complaint_event` | Current routing/work state and ordered history | Version checks, scoped ownership, insert-only application history permission |
| `meter`, `meter_reading` | Building registration, credential hash and processed payload history | Unique building meter, hashed credential and immutable readings |
| `lamp_specification`, `streetlight` | Shared configuration and per-light state | Unique configuration, foreign keys and per-light version |
| `policy`, `policy_evaluation` | Current DSL rule and historical evaluation snapshots | City/zone keys, version checks and immutable result rows |
| `app_user`, `account_event` | Identity, role, staff city and account actions | Unique email/username, role/city checks and security version |

## 4.4 Package and Module Structure

[[TABLE|Main source modules]]
| Module | Examples | Responsibility |
|---|---|---|
| `config` | `RestApplication`, `SessionConfiguration` | REST base path and session settings |
| `security` | `ApiAccessFilter`, `AccessRules`, `CurrentUser`, `PasswordHash` | Authentication context, permission rules and password protection |
| `resource` | `ComplaintResource`, `MeterResource`, `PolicyResource` | HTTP paths, JSON parsing and response codes |
| `service` | `ZoneService`, `ComplaintService`, `MeterService` | Transactions, record scope and pattern integration |
| `pattern.decorator` | `MeterStream`, wrappers | Part A behavior independent of Jakarta/JPA |
| `pattern.composite` | `ZoneComponent`, `ZoneGroup`, `Building` | Part B hierarchy operations |
| `pattern.chain` | `ComplaintHandler` and concrete handlers | Part C accept-or-forward routing |
| `pattern.flyweight` | specification, pool and context | Part D shared-object behavior |
| `pattern.interpreter` | parser, expressions and context | Part E policy language semantics |
| `entity` | JPA entities | Persistent data mappings |
| `webapp` | HTML, CSS, JavaScript and local images | Role workspaces and browser interaction |
| `database` | numbered SQL files | Additive schema and permissions |
| `scripts` | build/server/database and verification helpers | Repeatable local operations and checks |

## 4.5 Access and Security Design

Public registration always creates a resident. The first system administrator is created with a local bootstrap helper only when no administrator exists, and its generated credential is stored in an ignored local file. Administrators provision staff and city assignments. No default password is committed and no public endpoint can self-select an elevated role.

Passwords use PBKDF2-HMAC-SHA256 with a random salt and 600,000 iterations. Sessions have HttpOnly and SameSite=Strict cookies, a 30-minute idle timeout and eight-hour absolute lifetime. Sign-in rotates the session. State changes require a session-specific CSRF token. Password or account-access changes increment a security version so older sessions are rejected on their next request.

Authorization is deny-by-default at the REST operation level and is narrowed further in service queries. A resident query includes the owner's user ID. Staff are limited to their assigned city and accessible complaint tiers. Public complaint history uses public-message fields and anonymized actor labels, while staff receive internal notes according to permission. Password hashes, raw credentials and session tokens are excluded from API output and reports.

These controls support the application but are not one of the five selected assignment patterns. Meter authentication similarly proves a Decorator layer for one device message; it does not replace application login or HTTPS.

## 4.6 Complaint Interaction Design

The complaint journey demonstrates how one pattern participates in a broader request without taking responsibility for everything. Chain of Responsibility decides the authority tier. The service separately handles identity, named assignment, workflow state, concurrency and persistence.

![Sequence of resident complaint submission and routing](docs/submission/figures/complaint-sequence.png){width=6.35}

Each event is saved in logical order. A complaint and its new events commit together. Mutation code locks and refreshes the current record, checks the browser's version and rejects stale changes. Resident messages and staff replies use public text. Private work notes remain internal. Reopening is a request and review workflow rather than an unconditional resident state change.

## 4.7 User Interface Design

The interface has a shared desktop sidebar that collapses to an icon rail and becomes a drawer on narrow screens. Light and dark themes use centralized semantic tokens. Role navigation shows relevant workspaces, but server permission remains authoritative. Forms provide native constraints and shared action feedback. Slow operations show delayed loading feedback; success notices expire; errors remain until dismissed.

The sign-in page uses a local city illustration rather than a remote asset. Dashboard counts and charts are derived from authorized complaint responses. Complaint records, account records and reports use separate forms/dialogs so large tables are not crowded by permanent edit controls. Print CSS hides navigation and interaction controls from complaint reports.

![Role dashboard in the implemented light theme](docs/evidence/dashboard-light.png){width=6.35}

## 4.8 Design Decisions and Tradeoffs

One WAR reduces deployment complexity but also means frontend and backend changes are released together. Plain JavaScript keeps the stack small but requires the project to provide its own shared UI conventions. PostgreSQL transactions provide strong local consistency, while city-level locks serialize writes that might need finer-grained coordination at production scale.

The pattern classes favor clarity over generic abstraction. `ZoneGroup` represents city, district and street because they share behavior, while `ZoneType` enforces the four supported levels. The policy grammar supports three numeric fields rather than arbitrary scripts. The complaint chain has three handlers matching the assessment. These decisions keep the implementation explainable and safe, but they establish explicit limits discussed in Sections 5 and 7.

# 5. Design Patterns and Assessment Answers

This chapter answers every marked question in the assessment. Each subsection identifies the selected pattern, explains its mechanism in the actual application and evaluates both benefits and limitations. The class diagrams use the final project class names. Supporting framework classes are shown only where they clarify the mechanism.

[[TABLE|Pattern implementation summary]]
| Part | Pattern roles in SmartCity360 | Demonstrated outcome |
|---|---|---|
| A Decorator | component, base component, abstract decorator, three concrete decorators | Eight layer combinations recover exact bytes; invalid/tampered input is rejected |
| B Composite | component, composite groups and building leaf | Uniform usage/power operations at city, district, street or building |
| C Chain of Responsibility | abstract handler, three concrete handlers and immutable route result | LOW, MEDIUM and HIGH reach the intended authority with saved route history |
| D Flyweight | immutable flyweight, concurrent pool and individual context | 100,000 contexts share three specification identities |
| E Interpreter | abstract expression, terminal/nonterminal expressions, context and parser | Editable policy text is parsed, evaluated and snapshotted by revision |

## 5.1 Part A - Dynamic Security Wrappers for Data Streams

### 5.1.1 A1 - Pattern Identification and Justification

The most suitable pattern is **Decorator**. The requirement asks for authentication, compression and encryption layers that can be added without altering the energy stream's core logic. In SmartCity360, every base or wrapped stream implements `MeterStream`, which exposes `encode(byte[], credential)` and `decode(byte[], credential)`. `PlainMeterStream` performs bounded defensive copying. `MeterStreamDecorator` holds another `MeterStream`. Each concrete decorator delegates to that wrapped component and contributes one responsibility.

Decorator is preferable to a subclass for every combination. Three optional features produce eight combinations. A subclass design would tend toward names such as `AuthenticatedEncryptedCompressedStream` and would grow combinatorially as layers are added. The implemented wrappers can instead be composed at runtime from three independent classes. This matches the Decorator intent of attaching additional responsibilities dynamically while preserving the common component interface (Gamma et al., 1994; Java Institute for Advanced Technology, n.d.-b).

The Java security and compression APIs are implementation tools, not alternative design-pattern answers. SHA-256 checks the issued meter credential, AES-GCM provides authenticated encryption and GZIP provides compression. Base64 only stores transformed bytes as text and is not described as encryption.

### 5.1.2 A2 - Flexible and Layered Enhancement

`MeterService` creates a fresh chain for each submission. It begins with `PlainMeterStream`, then conditionally wraps compression, encryption and finally authentication. With all options enabled, the object structure is:

`AuthenticationDecorator(EncryptionDecorator(CompressionDecorator(PlainMeterStream)))`

The relevant implementation is concise because the service programs to the common interface:

```java
private MeterStream stream(Meter meter, boolean auth, boolean compress, boolean encrypt) {
    MeterStream stream = new PlainMeterStream();
    if (compress) stream = new CompressionDecorator(stream);
    if (encrypt) stream = new EncryptionDecorator(stream, keyStore.key(...));
    if (auth) stream = new AuthenticationDecorator(
            stream, HexFormat.of().parseHex(meter.getCredentialHash()));
    return stream;
}
```

Calling `encode` on the outer wrapper first checks the credential. Delegation then reaches the plain component, after which compression and encryption transform the returned bytes while the calls unwind. Recovery rebuilds the same chain from saved layer flags. Authentication checks the current credential, encryption verifies/decrypts, compression expands within the 64 KiB bound and the base returns a defensive copy.

Before persistence, the service compares recovered bytes with the original. Only a successfully encoded and decoded message updates building usage and creates `MeterReading` history. A wrong credential returns an authentication error. A wrong key, changed AES-GCM tag, corrupt GZIP stream or mismatched original hash fails without changing usage.

![Decorator class diagram for meter streams](docs/submission/figures/decorator-uml.png){width=6.35}

The wrappers can be independently omitted. No `if` statement is placed inside `PlainMeterStream` for each feature, and a wrapper does not need to know the concrete type inside it. The fixed order is deliberate: compressing before encryption can reduce repetitive data, while compressing ciphertext would usually be ineffective. Authentication is outermost so an invalid credential is rejected before expensive transformation work.

### 5.1.3 A3 - Long-Term Reusability and Extensibility

**Reusability.** Each decorator operates on bounded byte arrays through `MeterStream`, so the transformation classes do not depend on a particular page or JPA entity. The same base and wrappers support all eight current combinations. Domain decisions, such as replacing building usage after acceptance, remain in `MeterService`. This makes the core pattern reusable for another bounded meter-message format.

**Open extension point.** A new logging, checksum or format-version decorator could implement the same interface and wrap the existing chain without editing `PlainMeterStream`. Extension still requires decisions about order, error handling, stored metadata and tests. Decorator reduces modification of stable classes; it does not make a poorly specified new layer safe automatically.

**Testability.** Seven Decorator tests cover all eight combinations, Unicode recovery, invalid credentials, fresh nonces, tampering, wrong keys, compression behavior, corrupt data and decompression bounds. Individual responsibilities can be tested without Payara or PostgreSQL. This protection is important because a change to one wrapper can otherwise affect every composition that contains it.

**Ordering and versioning.** Decorators can be composed, but order is semantically important. The service supports one documented order and stores boolean flags so recovery reconstructs it. If an algorithm or payload structure changes, a future implementation should persist a format version and retain readers for historical records. Treating all old data as the newest format would harm long-term recovery.

**Performance costs.** Each layer adds method calls and can allocate another byte array. GZIP and AES-GCM headers can increase a small message. The recorded browser example changed an 87-byte message to 132 processed bytes before Base64 with all layers selected. This is evidence for that input, not a claim that compression always reduces size. High-volume throughput has not been benchmarked.

**Security lifecycle.** The plaintext meter credential is shown only when issued or replaced, while the database stores its SHA-256 hash. The AES key survives redeployment in the local Payara domain. Losing that key prevents recovery of encrypted history. Backups must therefore protect the database and key together. Multi-key rotation is not implemented. Payload encryption also does not replace HTTPS or hide usage metadata.

**Failure isolation.** Because the service verifies a round trip before accepting a reading, a failed wrapper cannot partially update usage in the normal transaction. This integration strengthens the value of the pattern but is supplied by the service and transaction design, not by Decorator alone.

![Meter reading processed and recovered through the selected layers](docs/report/evidence/meter-recovery.png){width=6.35}

The recorded evidence includes seven unit tests and 63 live meter HTTP checks at the Part A checkpoint. The full project later reached 67 Java tests. The meter HTTP suite has not been claimed as rerun after every later account-permission change, so the final acceptance run should repeat the current authenticated journey.

## 5.2 Part B - Hierarchical Structure of Smart Zones

### 5.2.1 B1 - Pattern Identification and Justification

The most appropriate pattern is **Composite**. The domain is a part-whole hierarchy: a city contains districts, each district contains streets and each street contains buildings. A building is a leaf. City, district and street are composites. All inherit the common `ZoneComponent` operations for usage, power, building counts and power-state reporting.

A caller can therefore invoke `getUsageKwh()` or `setPower(boolean)` on one building or an entire district through the same abstraction. A `ZoneGroup` recursively aggregates or delegates to children. A `Building` supplies the leaf result and changes its own simulated state. This is the principal benefit requested by the scenario: uniform treatment of an individual object and a composition (Gamma et al., 1994; Java Institute for Advanced Technology, n.d.-b).

### 5.2.2 B2 - UML Class Diagram and Mechanism

![Composite UML for city zones](docs/submission/figures/composite-uml.png){width=6.35}

`ZoneComponent` defines the uniform operations and stores common identity. `ZoneGroup` owns a list of child components. It represents CITY, DISTRICT and STREET because those levels use the same behavior. `Building` stores `BigDecimal usageKwh` and an independent `powerOn` value.

`ZoneType.accepts` enforces the exact next level. `ZoneGroup.add` rejects wrong levels and duplicate child identities, while `attachTo` prevents one object instance from having two parents. The strict level order also prevents cycles in the in-memory model. PostgreSQL reinforces city/parent ownership.

For usage, a leaf returns its value and each group sums child values recursively. For power, a group calls `setPower` on every descendant until the leaves change. Power-state reporting counts total and powered buildings to return EMPTY, OFF, ON or MIXED. Switching off a district does not erase previously recorded consumption.

The service mechanism is:

1. `ZoneResource` receives the city, optional target zone and requested state.
2. `ZoneService` locks the city for a write and reconstructs its Composite from stored rows.
3. It resolves the selected `ZoneComponent` and invokes the same operation used for any level.
4. Composite groups recursively delegate; building leaves update their state.
5. The service copies final leaf states to entities and commits one transaction.
6. Updated totals and hierarchy state return to the browser.

A recorded demonstration used Library at 12.125 kWh, Clinic at 7.875 kWh and Community Hall at 5 kWh. The first district total was 20 kWh and the city total was 25 kWh. Switching off the first district turned off its two buildings, left the neighboring district on and produced a MIXED city state while retaining the 25 kWh recorded total.

![Composite hierarchy workspace with recursive totals and controls](docs/report/evidence/composite-workspace.png){width=5.3}

### 5.2.3 B3 - Usefulness for Large and Growing Infrastructure

**Uniform client code.** Services and future clients use one component operation instead of separate city, district, street and building methods. Adding another building does not require new aggregate code. The parent automatically includes that leaf in later recursion.

**Local responsibilities.** A building owns only its usage and power state. A group owns children and recursive behavior. This separation avoids repeated loops at each level and allows five focused unit tests for aggregation, isolation, hierarchy rules, duplicate ownership and empty groups.

**Data growth without recompilation.** New city records and supported hierarchy nodes are data changes. The implementation intentionally has four fixed levels. Adding a zone type such as neighborhood would require `ZoneType`, validation, database and interface changes; it is not misrepresented as configuration-only extensibility.

**Correctness and isolation.** Decimal totals use `BigDecimal`. Cross-city IDs, negative readings, excess precision, invalid parents and group usage are rejected. A command against one district does not affect a neighboring district. Empty composites report zero and EMPTY rather than inventing a power state.

**Complexity.** Aggregation or power over a subtree visits its descendants, giving approximately O(n) work for n nodes in that subtree. The current service reconstructs the full city and returns the full tree, so memory, JSON size and page rendering also grow with the city. City-level pessimistic write locking serializes concurrent writes. This is suitable for the assessed dataset but not proof of metropolitan scale.

**Possible production evolution.** Lazy subtree loading, cached aggregates or asynchronous physical commands could improve a measured bottleneck. Each introduces additional problems: cache invalidation, partial device failure, command progress and eventual consistency. Composite supplies a clear structure for delegation but does not solve unreliable networks or physical-device acknowledgement.

The Part B checkpoint records five unit tests and 41 live HTTP checks, browser interaction and restart persistence. Later access-control work changed who can issue commands, so the final test pass should verify the same Composite behavior through every currently authorized role.

## 5.3 Part C - Escalation of Citizen Complaints

### 5.3.1 C1 - Pattern Identification and Justification

The selected pattern is **Chain of Responsibility**. A resident submits severity with the complaint, but the sender should not choose a concrete authority directly. The request starts at the first `ComplaintHandler`. A handler either accepts it or forwards it through its `next` reference.

The configured chain is:

`LocalStaffHandler -> SupervisorHandler -> CityManagerHandler`

Local staff accept LOW. A supervisor accepts LOW or MEDIUM but normally receives MEDIUM after local staff forward it. The manager accepts all supported severities and normally receives HIGH. The first acceptance ends routing. These thresholds are project business rules built on the pattern, not rules inherent to Chain of Responsibility.

The choice is appropriate because it separates the sender from the eventual receiver and permits alternative chain wiring without changing the submission operation (Gamma et al., 1994; Java Institute for Advanced Technology, n.d.-b). A direct `switch(severity)` inside the resource would couple submission to every current authority and would not demonstrate forwarding behavior.

### 5.3.2 C2 - Decoupled Request Handling

`ComplaintService` stores the first handler through the abstract type:

```java
private final ComplaintHandler first =
        new LocalStaffHandler(
            new SupervisorHandler(
                new CityManagerHandler()));
```

The browser and resource know severity and complaint data, not the final handler. The base class owns the common algorithm. `canHandle` and `authority` are supplied by concrete handlers. `handle` either returns an assigned `RoutingResult`, calls the successor and prepends FORWARDED, or returns an explicit UNHANDLED step if no successor exists.

![Chain of Responsibility UML for complaint routing](docs/submission/figures/chain-uml.png){width=6.35}

For a MEDIUM request, local staff produce FORWARDED, the supervisor produces ASSIGNED and the manager is never called. The immutable result protects a completed route from later requests. The service saves each step as ordered history alongside the current assigned authority.

Routing is separate from the work lifecycle. A complaint begins ASSIGNED, can move to IN_PROGRESS and then RESOLVED with mandatory explanations. Escalating an unresolved case reruns the chain at higher severity and preserves the old route. Authorized managers can also allocate a named employee eligible for the city and tier. Named allocation does not replace the chain: the chain determines responsibility tier; assignment chooses an individual within authorized coverage.

Resident messages, public staff replies and reopening review are supporting complaint workflows. They operate on the routed record but do not change the Chain of Responsibility structure. This separation keeps the pattern focused and prevents `ComplaintHandler` from becoming a large workflow controller.

### 5.3.3 C3 - Flexibility and Traceability

**Flexible receivers.** Acceptance rules are localized in handlers. A specialist or emergency handler could be inserted without changing the resident endpoint. However, the new authority would also need database labels, permissions, interface text and tests. Pattern extensibility does not eliminate domain integration work.

**Reduced coupling.** `ComplaintService` invokes `first.handle(severity)` rather than selecting a concrete authority. Six pure Java chain tests cover LOW, MEDIUM, HIGH, a shortened chain, alternative starting handler and independent immutable results without needing a server.

**Order sensitivity.** The first accepting handler wins. If `CityManagerHandler` were placed first, it would accept everything and bypass local teams. A handler with an overly broad rule can hide later handlers. Full route tests are therefore required whenever order or acceptance rules change.

**Explicit failure.** An incomplete chain returns UNHANDLED instead of dropping a request silently. The production three-handler chain covers every supported severity, while a shortened chain unit test proves the failure representation. This makes missing responsibility observable.

**Persistent traceability.** SmartCity360 records submission, each forward/assignment, severity escalation, named assignment, public replies, internal work notes, resolution and reopening review. Earlier events are not overwritten when current authority or status changes. Resident JSON excludes internal text and staff identity, while authorized staff can see the operational record.

**Pattern limitation.** Chain of Responsibility alone does not create audit storage, timestamps, authorization, transactions or privacy. Those qualities come from `ComplaintService`, JPA, PostgreSQL and access rules. The application role cannot update/delete history through normal grants, but a database administrator still can; the history is not claimed as cryptographically tamper-proof.

**Concurrency and cost.** Complaint mutations lock the current row and compare the submitted version. In recorded concurrent tests, one request succeeded and one stale request returned 409, leaving one coherent event. Each routing visit produces history and is explicitly flushed in order. The current chain has only three nodes, so routing cost is small. Large queues, retention and paging require separate attention.

**Current integrated evidence.** The older chain checkpoint recorded 46 HTTP checks. Later complaint assignment/follow-up integration recorded 48 checks and a complete browser journey across supervisor, resident and manager roles. The latest Java suite contains 6 chain tests, 7 assignment tests and 17 follow-up tests. The final combined regression still needs to adapt older fixtures that attempted resident-only submission as an administrator.

![Complaint route and lifecycle history retained in the browser](docs/report/evidence/complaint-history.png){width=5.4}

Overall, the chain provides flexible decoupled routing, while explicit persisted events counter its common traceability weakness. The price is order dependence and the need to coordinate supporting permissions and labels whenever handlers change.

## 5.4 Part D - Efficient Management of Smart Streetlights

### 5.4.1 D1 - Pattern Identification and Justification

The suitable pattern is **Flyweight**. Thousands of streetlights may have different IDs, locations and states while repeating a small set of lamp models, rated watts and light colours. SmartCity360 stores repeated immutable configuration in `LampSpecification` and lets many `StreetLight` contexts reference the same object.

`LampSpecificationFactory` maintains a concurrent map keyed by model, wattage and colour. `computeIfAbsent` returns the existing identity or creates one specification. The factory is the pooling role inside Flyweight, not a second selected pattern. Sharing avoids creating the same model data for every context, while immutable state prevents one light from accidentally changing every light that references it (Gamma et al., 1994; Java Institute for Advanced Technology, n.d.-b).

### 5.4.2 D2 - Intrinsic and Extrinsic State

[[TABLE|Flyweight intrinsic and extrinsic state]]
| State | Location | Classification and reason |
|---|---|---|
| Model name | `LampSpecification` | Intrinsic: repeated and immutable for a configuration |
| Rated watts | `LampSpecification` | Intrinsic: shared specification property |
| Light colour | `LampSpecification` | Intrinsic: shared specification property |
| Light ID and label | `StreetLight` / entity | Extrinsic: identifies one physical context |
| Street and location | `StreetLight` / entity | Extrinsic: differs for every placement |
| Power and fault state | `StreetLight` / entity | Extrinsic and mutable without affecting peers |
| Fault note and edit version | `StreetlightEntity` | Persistent extrinsic workflow information |

![Flyweight UML showing shared and unique streetlight state](docs/submission/figures/flyweight-uml.png){width=6.35}

The service resolves every persisted specification through the application-scoped pool and constructs an independent context for each inventory row. Identity counting proves actual object reuse rather than merely equal values. Specifications expose no setters.

`StreetLight.getRatedLoadWatts()` supplies current power and fault flags to shared behavior. The flyweight calculates rated watts only for an on, healthy light but never stores those flags. Therefore one shared object can serve multiple contexts safely. This is a nameplate-load simulation, not a measured energy value.

PostgreSQL separately normalizes one `lamp_specification` row per unique configuration and references it from `streetlight`. Database normalization reduces stored duplication; the Java pool provides runtime identity reuse. A foreign key alone would not be sufficient evidence of the Flyweight object structure.

### 5.4.3 D3 - Performance at Tens of Thousands of Objects

Let N be the number of lights and K the number of distinct configurations. A non-shared design can create N specification objects. Flyweight creates K specifications plus N contexts and references. When K is much smaller than N, avoided intrinsic objects approach N - K.

An illustrative model is:

`without sharing = N x (extrinsic state + intrinsic state)`

`with sharing = N x (extrinsic state + reference) + K x intrinsic state + pool overhead`

This expression explains the direction of savings but is not a measured JVM byte count. Object headers, references, alignment, strings and map entries depend on the runtime. The report therefore uses identity counts rather than inventing a memory percentage.

[[TABLE|Recorded 100,000-light Flyweight demonstration]]
| Observation | Recorded result |
|---|---|
| Individual temporary light contexts | 100,000 |
| Shared specification identities | 3 |
| Unshared baseline specification identities | 100,000 |
| Specification objects avoided | 99,997 |
| Independent state for contexts sharing a specification | Passed |
| Database rows created by demonstration | 0 |
| Recorded browser elapsed time | 106.30 ms for combined construction/counting on that machine |
| Separate recorded API elapsed time | 375.96 ms for combined construction/counting on that machine |

The elapsed observations are uncontrolled and include constructing both shared and unshared baseline objects plus identity counting. They do not prove that Flyweight is a certain percentage faster. The useful evidence is the object-identity reduction and independent state. Six Flyweight tests include concurrent lookups and the 100,000-context case. The Part D checkpoint also records 55 streetlight HTTP checks and restart persistence.

![Streetlight sharing demonstration output](docs/report/evidence/streetlight-sharing.png){width=6.35}

**Benefits.** Repeated intrinsic state and object construction are reduced. Immutable flyweights can be shared without coordinating edits. The same specification can support database pages, demonstrations and service calculations.

**Costs.** Every context still exists. The map, key objects and references add overhead. If K approaches N because every light has a unique configuration, sharing offers little benefit and the pool may cost more. The current pool retains requested configurations until redeployment and has no eviction.

**Scale boundary.** Inventory pages load 25 lights in the interface and at most 100 through the API. City counts and rated-load totals use database queries. The 100,000-light demonstration is intentionally isolated and creates no persistent rows. It proves pattern behavior at that object count, not database or browser performance for 100,000 stored lamps.

## 5.5 Part E - Interpreting City Policies Defined in a DSL

### 5.5.1 E1 - Pattern Identification and Justification

The most appropriate pattern is **Interpreter**. The requirement defines a mini-language that must be parsed and evaluated dynamically. SmartCity360 represents each grammar element as an object implementing `Expression.interpret(PolicyContext)`. `ComparisonExpression` is a terminal expression. `AndExpression`, `OrExpression` and `NotExpression` are nonterminal expressions that combine child expressions.

For example:

`noise > 65 AND (hour >= 22 OR hour < 6)`

becomes an `AndExpression` whose left child compares noise and whose right child is an `OrExpression` containing two hour comparisons. `PolicyContext` supplies the numeric observations. A true result is interpreted with the saved meaning, because one policy can use true to mean VIOLATION while another uses true to mean PERMITTED.

This structure follows the abstract expression, terminal expression, nonterminal expression and context roles of Interpreter (Gamma et al., 1994; Java Institute for Advanced Technology, n.d.-b). Changing 65 to 75 or recombining supported comparisons changes saved data and evaluation behavior without recompiling Java.

### 5.5.2 E2 - UML Class Diagram and Mechanism

![Interpreter UML for the SmartCity360 policy language](docs/submission/figures/interpreter-uml.png){width=6.35}

`PolicyParser` is a bounded recursive-descent parser. It tokenizes source and constructs immutable expression records. The grammar gives `NOT` higher precedence than `AND`, and `AND` higher precedence than `OR`; parentheses override grouping. Unknown fields, unsupported operators, malformed numbers, unexpected tokens and missing parentheses produce a position-aware error.

The interpretation mechanism is:

1. An authorized browser sends a policy expression to the REST resource.
2. Java parses the text during validation and again when saving, so malformed rules cannot become active records.
3. On evaluation, `PolicyService` loads and locks the city context, checks the active policy and compares the requested saved version.
4. The selected observation zone must belong to the same city.
5. `PolicyContext` validates values and requires every field referenced by the tree before interpretation. A missing value cannot be hidden by boolean short-circuiting.
6. Terminal comparisons use `BigDecimal`; nonterminal expressions recursively combine booleans.
7. The result is saved with the policy name, category, original expression, true meaning, revision, observations, zone and timestamp.

`Parsed` is a nested record returned by `PolicyParser`. `describe()` displays explicit parsed grouping. The parser, JPA and REST resource support the pattern but do not replace the expression objects that perform interpretation.

### 5.5.3 E3 - Suitability for Rule Updates and Extensibility

**Runtime updates using the existing grammar.** Officers can change thresholds, operators and boolean grouping without changing source code. The same `ComparisonExpression` handles noise, hour and parking duration. A 65 dB revision can evaluate true while a later 75 dB revision evaluates false for the same 70 dB observation.

**Traceable revisions.** Each evaluation stores the expression and meaning used at that moment. Editing the current policy does not rewrite old outcomes. The interface blocks evaluation while unsaved edits exist, and the server rejects stale policy versions. Inactive policies retain history but cannot produce new evaluations.

**Small testable nodes.** Comparison boundaries, precedence, parentheses, negation and malformed input can be tested separately. Nine Interpreter unit tests cover all comparison operators, rule updates, missing fields, hostile/executable-looking text, resource bounds and context immutability. The Part E checkpoint records 84 HTTP checks.

**New grammar features require code.** A new numeric field needs context validation, parser recognition, browser input, persistence and tests. A new operator needs an expression type and precedence decisions. Dates, units, arithmetic or functions would substantially increase parser and semantic complexity. Interpreter makes the current language extensible through composition; it does not make arbitrary language growth automatic.

**Complexity and maintenance.** Interpreter is easy to understand for a small grammar. As grammar size grows, node types and parser cases multiply. At that point a parser generator or rule engine may be more suitable, but would reduce the direct visibility expected in this assignment. User-written text can also be syntactically valid but operationally wrong, so policy review remains necessary.

**Performance.** The current implementation reparses for each operation and recursively evaluates the tree. This is acceptable for small manually entered policies, but no large-policy throughput benchmark exists. A cache would need policy revision and language version in its key to avoid stale semantics.

**Safety bounds.** The language accepts only three known fields and explicit operators. It permits no loops, external calls or dynamic Java execution. Source is capped at 1,000 characters, 200 tokens, 20 nesting levels and 20 characters per numeric literal. Noise is 0-200 with up to three decimals; hour is 0-23; parking duration is a whole number up to 10,080 minutes.

**Domain limitation.** Observations are manual and evaluate one selected zone. The language has no calendars, time zones, holidays or continuous sensors. A match records an outcome but does not switch devices, issue fines or prove legal compliance. History records evaluated revisions, not every intermediate unsaved/edit-only state.

![Policy revisions and immutable evaluation history](docs/report/evidence/policy-history.png){width=6.35}

Interpreter is therefore suitable because the domain language is deliberately small and compositional. It allows meaningful rule updates without recompilation while keeping the implementation teachable. Its suitability decreases if SmartCity360 grows into a general-purpose policy engine.

# 6. Implementation

## 6.1 Development and Deployment Environment

The project uses a standard Maven directory layout. `pom.xml` compiles release 21, runs JUnit through Surefire and packages `target/smartcity360.war`. Jakarta APIs and the PostgreSQL driver are `provided` because Payara supplies them at runtime. Compiled CSS is committed so a fresh source extraction can build the WAR with Maven alone. Node is needed only when regenerating Tailwind CSS or running JavaScript verification.

The recorded local environment uses a dedicated Payara 7 domain and PostgreSQL instance. Setup scripts preserve existing records and apply numbered SQL files in filename order. The deployment context is `/smartcity360`; a public health endpoint returns `{"application":"SmartCity360","status":"UP"}`. Protected data endpoints require sign-in.

## 6.2 Integrated Feature Implementation

**City zones.** The page creates supported node types, renders a selectable hierarchy and displays usage, building count and power state. Server-side structure checks prevent invalid trees even if browser validation is bypassed.

**Energy monitoring.** A meter belongs to one building. Its issued credential is shown once and stored as a hash. Reading submission records layer flags, original/encoded byte lengths, original hash, Base64 payload and timestamp. Successful readings replace current building usage instead of summing historical snapshots as if each were additional consumption.

**Citizen services.** Resident identity comes from the session, not request text. The chain records route visits. Authorized staff then work, reply, escalate, assign and resolve. Residents can send public messages and request review of a resolved case. The page separates a record table, submission dialog and case detail dialog.

**Streetlight operations.** Staff view paged contexts reconstructed with pooled specifications. Individual power/fault updates use version checks. Administrators can create shared specifications and run the isolated sharing demonstration.

**Policy centre.** Authorized roles save and revise rules, inspect required fields and explicit grouping, enter observations and retain result snapshots. The interface disables evaluation when its editor differs from the saved revision.

**Accounts and profile.** Residents self-register; administrators provision staff. Profile supports validated username, phone and a browser-resized square photograph. User management supports server-side search, role/status/city filters and pagination.

## 6.3 Dashboard, Reports and Presentation

The dashboard uses authorized complaint data to show totals, a status ring and recent cases. It does not invent device metrics that are not yet modeled. Complaint reports apply city, area, severity, status, assignee, text and date filters to the already authorized records. Chart totals and the detail table use the same filtered set. Print styles remove navigation and controls.

![Scoped complaint report with charts and detail table](docs/evidence/complaint-report-light.png){width=6.35}

The report feature is implemented, and 62 live read-only report checks are recorded. Native browser print preview, multipage behavior and Save as PDF remain pending final verification. Broader energy, maintenance, policy and administration reports are future work.

## 6.4 Validation and Concurrency

Validation exists in HTML for immediate feedback and in Java as the authoritative boundary. JSON endpoints reject null, arrays and scalar values where an object is required. Numeric values use `BigDecimal` where exact decimal behavior matters. Enum values are allowlisted.

City hierarchy, policy and device writes use transactions and locks appropriate to the current service design. Complaint and account updates use version values so stale views receive 409. Concurrent tests prove single-winner outcomes for selected edits. These checks prevent silent last-write-wins behavior, but they are not a substitute for production load testing.

## 6.5 Implementation Challenges and Solutions

[[TABLE|Implementation challenges and resolutions]]
| Challenge | Risk or observed effect | Resolution implemented |
|---|---|---|
| JPA could reorder pending complaint events | History could display a misleading route order | Flush each event in logical order inside the same transaction |
| JSON `null` could miss an object parameter and cause HTTP 500 | Invalid client input appeared as a server failure | Accept `JsonValue`, check object shape and return 400 |
| Encrypted history could become unreadable after key loss | Silent replacement would corrupt recovery expectations | Store key outside deployment, fail closed if encrypted rows exist and key is absent |
| Two browser windows could overwrite current work | Lost updates and mismatched explanations | Lock/refresh records and compare submitted version; stale request returns 409 |
| Residents could infer internal staff details from history | Privacy breach | Store public/private messages separately and serialize role-appropriate history |
| Identical lamp values did not prove object sharing | Flyweight claim could be superficial | Count pooled objects by Java identity and test concurrent lookups |
| Short-circuit boolean evaluation could hide missing context | Incomplete observation might appear valid | Validate all fields referenced by the expression before interpretation |
| Later permissions made older admin complaint fixtures invalid | Regression scripts no longer represented allowed submission | Mark fixtures for resident-client adaptation before final full run |
| Browser reports could expose unauthorized records | Report path might bypass normal access | Build reports only from protected scoped endpoints and exclude secret/internal fields |

## 6.6 Source-Code Organization and Build Output

The repository contains Java source, browser source, SQL scripts, verification helpers and report evidence. Local credentials, generated keys, database files, build output and installed servers remain ignored. `target/smartcity360.war` is generated rather than committed. Documentation source is not packaged into the deployed WAR.

The current implementation includes 72 main Java source files, 9 Java test classes, 11 SQL scripts and multiple browser/verifier modules. Counts can change as development continues; the final report should regenerate its source inventory immediately before submission.

# 7. Results and Evaluation

## 7.1 Test Strategy

Testing is layered. Pure Java tests validate pattern semantics without external infrastructure. Service/security tests use JUnit and Mockito where collaboration needs isolation. Node tests validate deterministic report calculations and action-feedback timing. Live scripts sign in to the deployed application, exercise HTTP status and JSON behavior against PostgreSQL, and preserve labelled demonstration data. Browser checks verify visible workflows and themes. Restart snapshots compare saved state after PostgreSQL and Payara restart.

The existence of different layers is important. A unit test proves a pattern's object behavior but not JSON routing or database mapping. A live HTTP check proves deployed integration but may not detect a visual layout problem. A screenshot proves appearance at one point, not every permission or response. This report therefore avoids treating one evidence type as universal proof.

## 7.2 Current Java Test Inventory

[[TABLE|Java test inventory in the latest source]]
| Test class | Focus | Test methods |
|---|---|---:|
| `MeterStreamTest` | Decorator combinations, credentials, encryption, compression and bounds | 7 |
| `ZoneCompositeTest` | Aggregation, subtree power, hierarchy and leaf behavior | 5 |
| `ComplaintHandlerTest` | Chain routes, missing successor, wiring and result isolation | 6 |
| `StreetLightTest` | Flyweight identity, independent state, concurrency and scale | 6 |
| `PolicyParserTest` | Interpreter operators, precedence, validation and bounds | 9 |
| `AccountSecurityTest` | Password, permissions and limiter fundamentals | 5 |
| `ComplaintAssignmentTest` | Named assignment eligibility and privacy | 7 |
| `ProfileDetailsTest` | Username, phone and image validation | 5 |
| `ComplaintFollowUpTest` | Messages, reopening, roles, versions and visibility | 17 |
| **Total** | Latest recorded Maven checkpoint | **67** |

The repository records a successful Maven package with all 67 tests and no failures/errors. This Arena environment did not contain Java on its PATH when this document was first assembled, so this document generation did not independently rerun Maven. The final local acceptance run must replace this statement with the newest executed result.

## 7.3 Recorded Integration Checkpoints

[[TABLE|Selected recorded integration and browser evidence]]
| Area | Recorded checks | Important scope note |
|---|---:|---|
| Composite zones | 41 HTTP checks plus browser/restart | Dated Part B checkpoint; later role rules need final rerun |
| Complaint core | 46 HTTP checks | Initial routing/workflow checkpoint |
| Meter Decorator | 63 HTTP checks | Dated Part A integration checkpoint |
| Streetlight Flyweight | 55 HTTP checks | Includes pagination, identity sharing and restart snapshot |
| Policy Interpreter | 84 HTTP checks | Includes revisions, boundaries, stale edits and history |
| Accounts/access | 95 checks across five roles | Includes ownership, city boundaries, CSRF and session invalidation |
| Assignment/follow-up | 48 checks | Includes named staff, messages and concurrent reopening review |
| Profile/demo | 40 checks | Includes five roles, validation and JPEG persistence |
| Complaint reports | 62 checks | Read-only filter, scope and metric checks |
| Action feedback | 6 deterministic Node checks | Minimal DOM, not real-browser rendering |
| Report model | 6 Node checks | Filter and calculation model |

These numbers describe separate dated checkpoints. They must not be added together and described as one current end-to-end suite because some were run against earlier application revisions. The final acceptance procedure should rerun the currently applicable scripts against a fresh documented deployment and record failures/fixes.

## 7.4 Evaluation Against Assessment Requirements

[[TABLE|Assessment acceptance evaluation]]
| Requirement | Evidence | Current evaluation |
|---|---|---|
| A: addable authentication, encryption and compression | Decorator classes, 7 tests, meter UI/history | Implemented; final authenticated regression pending |
| B: city to building hierarchy with uniform shutdown/report | Composite UML, 5 tests, 41-check checkpoint | Implemented |
| C: severity escalation from local to supervisor to manager | Chain classes, 6 tests, stored route history | Implemented and integrated with broader complaint workflow |
| D: thousands of lights share common configuration | Flyweight identity test and 100,000-context demonstration | Implemented; no heap benchmark claimed |
| E: parse/evaluate dynamic policy mini-language | Interpreter tree, 9 tests, revision history | Implemented |
| Working application demonstrating patterns | Browser workspaces and evidence images | Implemented; final integrated acceptance pending |
| Comprehensive documentation and UML | This editable document and generated diagrams | Draft created; final field/update/review pending |
| 10-15 minute video | Not part of this Word deliverable | Pending after application/report freeze |
| Source ZIP | Build/setup content exists | Packaging pending after final clean-run verification |

## 7.5 Usability and Visual Results

Recorded desktop checks covered light/dark sign-in and dashboards at 1280 pixels. A 390 by 844 CSS viewport was checked for navigation and major pages without page-wide horizontal overflow in the tested journeys. Fourteen configured text/background pairs passed a 4.5:1 contrast check, with the lowest recorded pair at 5.45:1. Theme selection persisted across navigation and reload.

These observations are useful but limited. The mobile screenshot tool produced unusually downscaled images, so mobile conclusions used rendered dimensions and interactions rather than a high-resolution image claim. There has been no physical-device, full screen-reader or cross-browser certification. The final browser pass must inspect action alerts and profile-photo workflow after the latest refinements.

## 7.6 Known Limitations

[[TABLE|Known limitations and impact]]
| Limitation | Current impact | Appropriate future response |
|---|---|---|
| Device operations are simulated | No physical meter/lamp acknowledgement or offline handling | Add a deliberate device gateway only when hardware/protocol is defined |
| Usage is a current reading, not a defined time-series | Cannot claim billing, historical trends or summed consumption | Add explicit periods and interval semantics before charts |
| Whole city Composite is reconstructed for operations | Memory/response cost grows with hierarchy size | Measure, then consider subtree loading/lazy UI/cached aggregates |
| Complaint lists are not fully server-paginated in every view | Large queues may load too many records | Add consistent server filters and paging |
| Flyweight pool has no eviction | Many unique configurations remain until redeploy | Bound configuration catalogue or add measured eviction policy |
| Policy grammar is intentionally small | No dates, units, functions, calendars or sensors | Version the grammar and add features only with tests/migration strategy |
| Evaluation history is not every policy edit | Unevaluated intermediate revisions are not retained | Add a policy-revision table if full audit becomes required |
| Email verification/recovery is absent | Email identity is not proven; no password reset | Integrate a real verified delivery/recovery mechanism before claiming it |
| Persisted workflow notifications are absent | Users must visit current pages to see changes | Add owned read/unread notifications distinct from action popups |
| Complaint report print not finally verified | Page breaks/Save as PDF could still need refinement | Complete native print-preview and PDF inspection |
| Final clean setup and combined regression pending | Latest code is not yet final-submission certified | Execute the acceptance checklist on a fresh extraction |

## 7.7 Current Acceptance Position

The five compulsory design-pattern implementations are present and backed by code, tests, interfaces and dated evidence. The largest assignment risk is no longer absence of a pattern; it is final reconciliation. Screenshots, test totals, class diagrams, setup steps and limitations must match the final commit. Native report printing and the complete current-role regression need final verification. Submission PDF, source ZIP and video should be produced only after that freeze.

[[STATUS|Final evidence placeholder|Before PDF export, replace this box with the date, commit hash, Java/Maven result, currently applicable HTTP totals, browser/print outcome and fresh-restart result from the final acceptance run.]]

# 8. Future Work

## 8.1 Final Application Verification

The immediate priority is a full acceptance run using the final permission model. Older scripts that submit complaints as an administrator must use a resident client. The run should build from a fresh extraction, apply all migrations, deploy, verify all five role journeys, rerun pattern behavior, restart services and compare persistent records. Native print preview and Save as PDF must be inspected across one-page and multipage complaint reports.

## 8.2 Municipal Operations

Zones would benefit from edit/archive workflows, search, power-command history with actor/reason and affected-scope previews. Meters need defined reporting periods and trends before historical energy charts are valid. Streetlights need maintenance assignments and immutable repair history instead of only current fault state. Policies need a complete edit-revision table if every change must be audited.

## 8.3 Notifications and Broader Reports

Persisted notifications should be generated by real workflow events, scoped to owners and support read/unread state. They must remain distinct from temporary success/error alerts. Broader reports can cover energy, lighting maintenance, policy outcomes, account activity and resident-safe case history. Every report must reuse backend authorization and exclude passwords, meter credentials, internal notes and unauthorized personal data.

## 8.4 Additional Patterns

Builder and Visitor have been proposed but are **not currently implemented patterns**. Builder could assemble an immutable report request with optional dates, areas, statuses and sections while deriving authorization from the authenticated user. Visitor could traverse the existing Composite hierarchy to calculate different report projections without placing every reporting operation in zone classes. They should be added only with the complete class collaboration and tests, not merely named around a normal constructor or loop.

## 8.5 Production Readiness

A public deployment would require HTTPS, externally managed secrets, database/key backup and restore drills, monitoring, production rate limiting, email ownership/recovery, dependency review and penetration testing. Physical device integration would require protocol selection, authentication, delivery acknowledgement, retries and explicit treatment of partial failure. These are outside the academic demonstration.

# 9. Conclusion

SmartCity360 demonstrates five design patterns as connected, working Java components. Decorator composes optional meter processing around a stable interface. Composite treats a building and a group of zones uniformly. Chain of Responsibility routes a complaint without making the sender select its final authority. Flyweight shares immutable lamp configuration while each light retains independent state. Interpreter turns a bounded textual policy into an executable expression tree.

The project also demonstrates that a pattern is only one part of an application. Persistence, transactions, access rules, privacy, validation, user feedback and testing are supporting responsibilities. Keeping those responsibilities separate makes the pattern roles easier to identify and prevents unsupported claims about what a pattern solves by itself.

Recorded results provide strong evidence for the five compulsory scenarios: 33 focused pattern tests are part of a 67-test Java suite, and each feature has dated integration evidence. The report explicitly identifies simulation boundaries and remaining verification rather than treating planned functionality as complete. After the final combined acceptance run, updated Word fields, screenshots and evidence can be exported as the required PDF and used to prepare the 10-15 minute demonstration and viva.

# 10. References

Gamma, E., Helm, R., Johnson, R. and Vlissides, J. (1994) *Design Patterns: Elements of Reusable Object-Oriented Software*. Reading, MA: Addison-Wesley.

Java Institute for Advanced Technology (n.d.-a) *Object Oriented Design Patterns II: Final Assessment, JIAT/OODP II/EX/01*. Department of Examinations. Supplied assessment paper.

Java Institute for Advanced Technology (n.d.-b) *Object Oriented Design Patterns - II*. Class lecture notes supplied for the unit. Final lecturer/author metadata must be confirmed before submission.

Jakarta EE (2025) *Jakarta RESTful Web Services*. Available at: https://jakarta.ee/specifications/restful-ws/ (Accessed: 8 November 2026).

Jakarta EE (2025) *Jakarta Persistence 3.2*. Available at: https://jakarta.ee/specifications/persistence/3.2/ (Accessed: 8 November 2026).

Jakarta EE (2025) *Jakarta Servlet 6.1*. Available at: https://jakarta.ee/specifications/servlet/6.1/ (Accessed: 8 November 2026).

Apache Software Foundation (2026) *Apache Maven: What is Maven?* Available at: https://maven.apache.org/what-is-maven.html (Accessed: 8 November 2026).

Oracle (n.d.-a) *Cipher, Java SE 21 API Documentation*. Available at: https://docs.oracle.com/en/java/javase/21/docs/api/java.base/javax/crypto/Cipher.html (Accessed: 8 November 2026).

Oracle (n.d.-b) *MessageDigest, Java SE 21 API Documentation*. Available at: https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/security/MessageDigest.html (Accessed: 8 November 2026).

Oracle (n.d.-c) *GZIPInputStream, Java SE 21 API Documentation*. Available at: https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/zip/GZIPInputStream.html (Accessed: 8 November 2026).

OWASP Foundation (2024a) *Password Storage Cheat Sheet*. Available at: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html (Accessed: 8 November 2026).

OWASP Foundation (2024b) *Authorization Cheat Sheet*. Available at: https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html (Accessed: 8 November 2026).

Payara Services Ltd. (2026) *Payara Community Documentation*. Available at: https://docs.payara.fish/community/docs/ (Accessed: 8 November 2026).

PostgreSQL Global Development Group (2026) *PostgreSQL Documentation*. Available at: https://www.postgresql.org/docs/ (Accessed: 8 November 2026).

PostgreSQL Global Development Group (2026) *PostgreSQL JDBC Driver*. Available at: https://jdbc.postgresql.org/ (Accessed: 8 November 2026).

Tailwind Labs (2026) *Tailwind CSS CLI Installation*. Available at: https://tailwindcss.com/docs/installation/tailwind-cli (Accessed: 8 November 2026).

# Appendix A - Application Screenshots

This appendix contains selected project-owned evidence. All records shown are demonstration data. Final screenshots should be recaptured after the last deployment if visible labels, permissions or layouts change.

## A.1 Authentication Themes

![SmartCity360 sign-in page in the light theme](docs/evidence/signin-light.png){width=6.35}

![SmartCity360 sign-in page in the dark theme](docs/evidence/signin-dark.png){width=6.35}

## A.2 Dashboard Themes

![Role dashboard in the dark theme](docs/evidence/dashboard-dark.png){width=6.35}

## A.3 Account Administration

![System-administrator account management workspace](docs/evidence/account-management.png){width=6.35}

## A.4 Complaint Resolution

![Resolved complaint with role-appropriate controls](docs/report/evidence/complaint-resolved.png){width=6.35}

## A.5 Streetlight Operations

![Streetlight inventory and individual controls](docs/report/evidence/streetlight-workspace.png){width=5.2}

# Appendix B - Code, Test and Evidence Matrix

[[TABLE|Detailed assessment-to-evidence matrix]]
| Part | Pattern classes | Integration classes | Focused tests | Recorded live/browser evidence |
|---|---|---|---|---|
| A | `MeterStream`, `PlainMeterStream`, `MeterStreamDecorator`, three concrete decorators | `MeterService`, `MeterKeyStore`, `MeterResource`, meter entities | 7 `MeterStreamTest` methods | 63-check meter checkpoint; recovery screenshot |
| B | `ZoneComponent`, `ZoneGroup`, `Building`, `ZoneType` | `ZoneService`, `ZoneResource`, `ZoneEntity` | 5 `ZoneCompositeTest` methods | 41-check zone checkpoint; hierarchy screenshot and restart snapshot |
| C | `ComplaintHandler`, three concrete handlers, `RoutingResult` | `ComplaintService`, `ComplaintResource`, complaint entities | 6 chain, 7 assignment and 17 follow-up methods | 46 core and 48 follow-up checks; route/resolution screenshots |
| D | `LampSpecification`, `LampSpecificationFactory`, `StreetLight` | `StreetlightService`, `FlyweightDemonstration`, resource/entities | 6 `StreetLightTest` methods | 55-check checkpoint; 100,000-context result and inventory screenshots |
| E | `Expression`, comparison/boolean nodes, `PolicyContext`, `PolicyParser` | `PolicyService`, `PolicyResource`, policy entities | 9 `PolicyParserTest` methods | 84-check checkpoint; revision-history screenshot |

# Appendix C - Build and Demonstration Setup

## C.1 Build

1. Install JDK 21 and Maven and set IntelliJ's Project SDK and Maven runner to Java 21.
2. Install/extract a Jakarta EE 11-compatible Payara Community 7 runtime outside the repository.
3. Configure PostgreSQL and run the project database helper to apply every numbered SQL script.
4. Bootstrap the first administrator using the local helper. Keep the generated ignored credential file private and change the temporary password.
5. Run `mvn package`. The expected output is `target/smartcity360.war`.
6. Deploy with context `/smartcity360` and wait for `/api/health` to report UP before testing data endpoints.

## C.2 Suggested Demonstration Order

1. Sign in and identify the current role dashboard and scoped counts.
2. Part B: open City zones, report totals at multiple levels and switch one district while its neighbor remains unchanged.
3. Part A: select a meter, enable all layers, submit a reading, recover it and show an invalid/tampered recovery failure.
4. Part C: submit LOW/MEDIUM/HIGH examples or use prepared cases, explain handler visits, then show named assignment and public/private history.
5. Part D: show two lights sharing one specification, change one independently and run the 100,000-light demonstration.
6. Part E: evaluate a policy, edit its threshold, evaluate again and compare immutable revision snapshots.
7. Open a scoped complaint report and explain filters, charts, table and print boundary.
8. Finish with tests, code packages, limitations and one-minute viva summary of why each pattern fits.

## C.3 Final Document Checklist

- Confirm candidate name, NIC, branch, student ID and admission number.
- Confirm official unit/assessment identifiers and lecturer/class-note metadata.
- Run the final acceptance suite and update Section 7 with the exact commit and outcomes.
- Replace screenshots affected by later interface or data changes.
- In Microsoft Word, select all and update fields, including contents and lists.
- Inspect every UML label and figure at normal PDF zoom.
- Check table page breaks, headers and print margins.
- Remove every working-draft notice and unresolved placeholder.
- Export to PDF and verify that fonts, hyperlinks, diagrams and page numbers render correctly.
- Package a clean source ZIP separately and verify the 10-15 minute MP4 before portal upload.

# Appendix D - Viva Quick Reference

## D.1 One-Sentence Pattern Explanations

- **Decorator:** The plain meter stream is wrapped at runtime by selected layers that share the same interface and delegate inward.
- **Composite:** Buildings and groups are both zone components, so the same usage or power operation works at any hierarchy level.
- **Chain of Responsibility:** A complaint starts at local staff and is forwarded until the first authority that accepts its severity.
- **Flyweight:** Every light keeps unique location/state, while identical immutable lamp configuration is shared by identity.
- **Interpreter:** Policy text is parsed into expression objects that recursively evaluate a validated observation context.

## D.2 Common Critical Questions

**Why not subclasses for every meter combination?** Three options already create eight combinations, and each new option multiplies them. Decorator composes independent responsibilities.

**Does Composite prove physical power was shut down?** No. It proves uniform recursive software commands and persisted simulated states. Real devices need acknowledgement and partial-failure handling.

**Does the chain resolve the complaint?** No. It assigns the responsibility tier. Work status, employee allocation, replies and resolution are separate supporting workflows.

**Did Flyweight save an exact memory percentage?** No exact heap percentage is claimed. The verified result is 100,000 contexts using three specification identities rather than 100,000.

**Can policy users add any language feature without Java changes?** They can edit thresholds and combine supported expressions at runtime. New fields/operators still require parser, context, UI, persistence and test changes.

**Are all later product features extra patterns?** No. Only the five explicitly selected pattern implementations answer Parts A-E. Supporting services, parsers, pools and framework APIs are named accurately rather than counted for marks.
