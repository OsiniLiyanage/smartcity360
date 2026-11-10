"""Generate report diagrams for the SmartCity360 project document.

Run with Pillow installed:
    python scripts/generate_report_diagrams.py

The diagrams are intentionally generated from project-owned labels so they can be
edited and regenerated without relying on an online diagram service.
"""

from __future__ import annotations

from math import atan2, cos, sin, pi
from pathlib import Path
from textwrap import wrap

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "submission" / "figures"
OUT.mkdir(parents=True, exist_ok=True)

WIDTH = 2400
HEIGHT = 1400
WHITE = "#FFFFFF"
INK = "#17212B"
MUTED = "#586879"
BLUE = "#1F4E79"
BLUE_LIGHT = "#DCEAF5"
GREEN = "#2D7A5D"
GREEN_LIGHT = "#E0F1E9"
GOLD = "#B7791F"
GOLD_LIGHT = "#FFF3D6"
RED = "#A63D40"
RED_LIGHT = "#F8E2E2"
LINE = "#6B7C8D"
PALE = "#F5F8FA"

FONT_REGULAR = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
FONT_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FONT_MONO = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"
FONT_MONO_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf"


def font(size: int, bold: bool = False, mono: bool = False):
    if mono:
        return ImageFont.truetype(FONT_MONO_BOLD if bold else FONT_MONO, size)
    return ImageFont.truetype(FONT_BOLD if bold else FONT_REGULAR, size)


def canvas(title: str, subtitle: str = ""):
    image = Image.new("RGB", (WIDTH, HEIGHT), WHITE)
    draw = ImageDraw.Draw(image)
    draw.rectangle((0, 0, WIDTH, 112), fill=BLUE)
    draw.text((70, 25), title, fill=WHITE, font=font(46, True))
    if subtitle:
        draw.text((70, 124), subtitle, fill=MUTED, font=font(25))
    return image, draw


def rounded_box(draw, box, title, lines=(), fill=PALE, outline=BLUE, title_fill=None,
                title_size=30, body_size=23, radius=22, align="left"):
    x1, y1, x2, y2 = box
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=4)
    header_h = 62
    draw.rounded_rectangle((x1, y1, x2, y1 + header_h), radius=radius,
                           fill=title_fill or outline, outline=outline, width=2)
    draw.rectangle((x1, y1 + header_h - radius, x2, y1 + header_h), fill=title_fill or outline)
    title_font = font(title_size, True)
    tw = draw.textbbox((0, 0), title, font=title_font)[2]
    draw.text(((x1 + x2 - tw) / 2, y1 + 12), title, fill=WHITE, font=title_font)
    y = y1 + header_h + 18
    body_font = font(body_size)
    for line in lines:
        if isinstance(line, tuple):
            text, emphasized = line
            f = font(body_size, bool(emphasized))
        else:
            text, f = line, body_font
        available = max(12, int((x2 - x1 - 42) / (body_size * 0.56)))
        pieces = wrap(text, width=available, break_long_words=False) or [""]
        for piece in pieces:
            if align == "center":
                boxw = draw.textbbox((0, 0), piece, font=f)[2]
                tx = (x1 + x2 - boxw) / 2
            else:
                tx = x1 + 21
            draw.text((tx, y), piece, fill=INK, font=f)
            y += body_size + 10
        y += 3
    return box


def class_box(draw, x, y, w, title, stereotype="", attributes=(), methods=(),
              color=BLUE, min_height=190):
    title_font = font(28, True, mono=True)
    stereo_font = font(21, mono=True)
    body_font = font(20, mono=True)
    title_h = 54 + (31 if stereotype else 0)
    attr_lines = sum(max(1, len(wrap(a, 42))) for a in attributes)
    method_lines = sum(max(1, len(wrap(m, 42))) for m in methods)
    attr_h = 18 + attr_lines * 29 if attributes else 0
    method_h = 18 + method_lines * 29 if methods else 0
    h = max(min_height, title_h + attr_h + method_h + 28)
    draw.rounded_rectangle((x, y, x + w, y + h), radius=15, fill=WHITE, outline=color, width=4)
    draw.rounded_rectangle((x, y, x + w, y + title_h), radius=15, fill=color, outline=color, width=2)
    draw.rectangle((x, y + title_h - 15, x + w, y + title_h), fill=color)
    ty = y + 11
    if stereotype:
        sw = draw.textbbox((0, 0), stereotype, font=stereo_font)[2]
        draw.text((x + (w - sw) / 2, ty), stereotype, fill=WHITE, font=stereo_font)
        ty += 30
    tw = draw.textbbox((0, 0), title, font=title_font)[2]
    draw.text((x + (w - tw) / 2, ty), title, fill=WHITE, font=title_font)
    cy = y + title_h
    if attributes:
        draw.line((x, cy, x + w, cy), fill=color, width=3)
        cy += 11
        for item in attributes:
            for piece in wrap(item, 42, break_long_words=False):
                draw.text((x + 15, cy), piece, fill=INK, font=body_font)
                cy += 29
        cy += 7
    if methods:
        draw.line((x, cy, x + w, cy), fill=color, width=3)
        cy += 11
        for item in methods:
            for piece in wrap(item, 42, break_long_words=False):
                draw.text((x + 15, cy), piece, fill=INK, font=body_font)
                cy += 29
    return (x, y, x + w, y + h)


def arrow(draw, start, end, color=LINE, width=5, label="", dashed=False, both=False):
    x1, y1 = start
    x2, y2 = end
    if dashed:
        segments = 16
        for i in range(segments):
            if i % 2 == 0:
                a = i / segments
                b = (i + 1) / segments
                draw.line((x1 + (x2 - x1) * a, y1 + (y2 - y1) * a,
                           x1 + (x2 - x1) * b, y1 + (y2 - y1) * b), fill=color, width=width)
    else:
        draw.line((x1, y1, x2, y2), fill=color, width=width)
    angle = atan2(y2 - y1, x2 - x1)
    size = 18
    p1 = (x2 - size * cos(angle - pi / 6), y2 - size * sin(angle - pi / 6))
    p2 = (x2 - size * cos(angle + pi / 6), y2 - size * sin(angle + pi / 6))
    draw.polygon((end, p1, p2), fill=color)
    if both:
        back = angle + pi
        q1 = (x1 - size * cos(back - pi / 6), y1 - size * sin(back - pi / 6))
        q2 = (x1 - size * cos(back + pi / 6), y1 - size * sin(back + pi / 6))
        draw.polygon((start, q1, q2), fill=color)
    if label:
        f = font(20, True)
        tx = (x1 + x2) / 2
        ty = (y1 + y2) / 2 - 34
        bbox = draw.textbbox((0, 0), label, font=f)
        pad = 8
        draw.rounded_rectangle((tx - (bbox[2] / 2) - pad, ty - pad,
                                tx + (bbox[2] / 2) + pad, ty + bbox[3] + pad),
                               radius=8, fill=WHITE)
        draw.text((tx - bbox[2] / 2, ty), label, fill=color, font=f)


def inheritance(draw, child_top, parent_bottom, color=LINE):
    x1, y1 = child_top
    x2, y2 = parent_bottom
    draw.line((x1, y1, x2, y2 + 18), fill=color, width=5)
    draw.polygon(((x2, y2), (x2 - 16, y2 + 23), (x2 + 16, y2 + 23)),
                 fill=WHITE, outline=color)


def save(image, name):
    path = OUT / name
    image.save(path, optimize=True)
    print(path.relative_to(ROOT))


def architecture():
    image, draw = canvas("SmartCity360 layered architecture",
                         "One WAR on Payara Community with protected REST APIs and PostgreSQL persistence")
    rounded_box(draw, (115, 230, 2285, 400), "Presentation layer",
                ["HTML pages, compiled Tailwind CSS, plain JavaScript, role navigation, themes, charts and print styles",
                 "Browser sends JSON requests using same-origin /smartcity360/api routes"],
                fill=BLUE_LIGHT, outline=BLUE, align="center")
    rounded_box(draw, (115, 500, 2285, 705), "Web and access layer",
                ["Jakarta REST resources: Auth, Account, City, Zone, Complaint, Meter, Streetlight and Policy",
                 "ApiAccessFilter, server sessions, CSRF checks, role/city/ownership authorization and JSON validation"],
                fill=GREEN_LIGHT, outline=GREEN, align="center")
    rounded_box(draw, (115, 805, 1580, 1060), "Application and domain layer",
                ["Services coordinate transactions and persistence",
                 "Pattern packages: Decorator, Composite, Chain of Responsibility, Flyweight and Interpreter",
                 "JPA entities represent persistent city, account, complaint, device and policy records"],
                fill=GOLD_LIGHT, outline=GOLD, align="center")
    rounded_box(draw, (1685, 805, 2285, 1060), "Private key storage",
                ["AES-GCM meter key stored in the local Payara domain, outside source control and database"],
                fill=RED_LIGHT, outline=RED, align="center")
    rounded_box(draw, (115, 1160, 2285, 1330), "Persistence layer",
                ["Jakarta Persistence (JPA) through Payara's provider and PostgreSQL JDBC",
                 "PostgreSQL tables, constraints, indexes, version fields and append-only history records"],
                fill=BLUE_LIGHT, outline=BLUE, align="center")
    arrow(draw, (1200, 400), (1200, 500), label="HTTPS/JSON in production")
    arrow(draw, (1200, 705), (1200, 805), label="service calls")
    arrow(draw, (1200, 1060), (1200, 1160), label="JPA transactions")
    arrow(draw, (1685, 930), (1580, 930), label="key access", dashed=True)
    save(image, "architecture.png")


def use_cases():
    image, draw = canvas("SmartCity360 use-case overview",
                         "Role-specific actions are shown at a summary level; Java enforces every protected operation")
    actors = [
        ("Resident", 90, 245, BLUE),
        ("Local staff", 90, 610, GREEN),
        ("Supervisor", 90, 975, GOLD),
        ("City manager", 1950, 245, RED),
        ("System admin", 1950, 760, BLUE),
    ]
    for name, x, y, color in actors:
        draw.ellipse((x + 115, y, x + 165, y + 50), outline=color, width=5)
        draw.line((x + 140, y + 50, x + 140, y + 145), fill=color, width=5)
        draw.line((x + 80, y + 85, x + 200, y + 85), fill=color, width=5)
        draw.line((x + 140, y + 145, x + 88, y + 215), fill=color, width=5)
        draw.line((x + 140, y + 145, x + 192, y + 215), fill=color, width=5)
        tw = draw.textbbox((0, 0), name, font=font(26, True))[2]
        draw.text((x + 140 - tw / 2, y + 225), name, fill=color, font=font(26, True))
    cases = [
        ("Register, sign in and manage profile", 620, 225, 1780, 325, BLUE),
        ("Submit and track own complaints", 620, 370, 1780, 470, BLUE),
        ("Route, assign, update and resolve complaints", 620, 515, 1780, 615, GREEN),
        ("Explore zones, usage totals and power commands", 620, 660, 1780, 760, GOLD),
        ("Process protected energy-meter messages", 620, 805, 1780, 905, GOLD),
        ("Manage streetlights and shared specifications", 620, 950, 1780, 1050, RED),
        ("Define and evaluate policy DSL rules", 620, 1095, 1780, 1195, RED),
        ("Manage users and view scoped reports", 620, 1240, 1780, 1340, BLUE),
    ]
    for label, x1, y1, x2, y2, color in cases:
        draw.rounded_rectangle((x1, y1, x2, y2), radius=45, fill=WHITE, outline=color, width=4)
        tw = draw.textbbox((0, 0), label, font=font(25, True))[2]
        draw.text(((x1 + x2 - tw) / 2, y1 + 31), label, fill=INK, font=font(25, True))
    # Representative associations. Overlap is intentionally reduced for report readability.
    for sy, ey in [(355, 275), (355, 420), (720, 565), (1085, 565)]:
        draw.line((360, sy, 620, ey), fill=LINE, width=3)
    for ey in [710, 855, 1000, 1145]:
        draw.line((2225, 355, 1780, ey), fill=LINE, width=3)
    for ey in [275, 1290]:
        draw.line((2225, 870, 1780, ey), fill=LINE, width=3)
    draw.text((785, 175), "SYSTEM CAPABILITIES", fill=MUTED, font=font(24, True))
    save(image, "use-cases.png")


def data_model():
    image, draw = canvas("Simplified persistent data model",
                         "The diagram focuses on assignment-relevant relationships; constraints and indexes remain in database/*.sql")
    tables = {
        "city": (80, 240, 430, ["PK id", "name", "archived"]),
        "zone": (540, 210, 940, ["PK id", "FK city_id", "FK parent_id", "zone_type", "usage_kwh", "power_on"]),
        "app_user": (80, 590, 470, ["PK id", "FK city_id", "email", "role", "profile fields", "security_version"]),
        "complaint": (560, 565, 1010, ["PK id", "FK city_id / zone_id", "FK owner_id", "FK assigned_user_id", "severity / status", "version"]),
        "complaint_event": (1110, 575, 1550, ["PK id", "FK complaint_id", "FK actor_user_id", "event_type", "private/public text"]),
        "meter": (1080, 185, 1450, ["PK id", "FK city_id / zone_id", "credential_hash"]),
        "meter_reading": (1560, 185, 2000, ["PK id", "FK city_id / meter_id", "layer flags", "payload / hashes", "received_at"]),
        "lamp_specification": (80, 1010, 530, ["PK id", "model", "rated_watts", "colour", "UNIQUE configuration"]),
        "streetlight": (640, 1000, 1050, ["PK id", "FK city_id / street_id", "FK specification_id", "location / state", "version"]),
        "policy": (1240, 975, 1600, ["PK id", "FK city_id", "expression", "meaning / active", "version"]),
        "policy_evaluation": (1700, 945, 2290, ["PK id", "FK policy / city / zone", "rule snapshot", "observation snapshot", "matched / evaluated_at"]),
    }
    boxes = {}
    colors = [BLUE, GREEN, GOLD, RED]
    for idx, (name, (x, y, x2, fields)) in enumerate(tables.items()):
        h = 76 + len(fields) * 34
        boxes[name] = rounded_box(draw, (x, y, x2, y + h), name, fields,
                                  fill=WHITE, outline=colors[idx % len(colors)],
                                  title_size=25, body_size=19)
    def mid_right(name):
        x1, y1, x2, y2 = boxes[name]; return x2, (y1 + y2) / 2
    def mid_left(name):
        x1, y1, x2, y2 = boxes[name]; return x1, (y1 + y2) / 2
    def top(name):
        x1, y1, x2, y2 = boxes[name]; return (x1 + x2) / 2, y1
    def bottom(name):
        x1, y1, x2, y2 = boxes[name]; return (x1 + x2) / 2, y2
    arrow(draw, mid_right("city"), mid_left("zone"), label="1 to many")
    arrow(draw, mid_right("zone"), mid_left("meter"), label="building")
    arrow(draw, mid_right("meter"), mid_left("meter_reading"), label="1 to many")
    arrow(draw, mid_right("app_user"), mid_left("complaint"), label="owns / assigned")
    arrow(draw, mid_right("complaint"), mid_left("complaint_event"), label="history")
    arrow(draw, mid_right("lamp_specification"), mid_left("streetlight"), label="shared")
    arrow(draw, mid_right("policy"), mid_left("policy_evaluation"), label="snapshots")
    arrow(draw, bottom("city"), top("app_user"), label="staff scope")
    arrow(draw, bottom("zone"), top("complaint"), label="affected area")
    save(image, "data-model.png")


def decorator_uml():
    image, draw = canvas("Part A UML - Decorator",
                         "Optional authentication, compression and encryption wrap one common meter-stream component")
    meter = class_box(draw, 870, 190, 660, "MeterStream", "<<interface>>", (),
                      ("+ encode(data, credential): byte[]", "+ decode(data, credential): byte[]"), BLUE)
    plain = class_box(draw, 80, 575, 520, "PlainMeterStream", "<<component>>", (),
                      ("+ encode(...): byte[]", "+ decode(...): byte[]"), GREEN)
    base = class_box(draw, 750, 530, 900, "MeterStreamDecorator", "<<abstract decorator>>",
                     ("# wrapped: MeterStream",), (), GOLD)
    auth = class_box(draw, 90, 980, 620, "AuthenticationDecorator", "<<concrete decorator>>",
                     ("- expectedHash: byte[]",), ("- verify(credential)",), RED)
    comp = class_box(draw, 875, 980, 650, "CompressionDecorator", "<<concrete decorator>>", (),
                     ("+ encode(): GZIP", "+ decode(): bounded expand"), GREEN)
    enc = class_box(draw, 1710, 980, 610, "EncryptionDecorator", "<<concrete decorator>>",
                    ("- key: SecretKey",), ("+ encode(): AES-GCM", "+ decode(): verify tag"), BLUE)
    inheritance(draw, ((plain[0]+plain[2])/2, plain[1]), ((meter[0]+meter[2])/2-190, meter[3]))
    inheritance(draw, ((base[0]+base[2])/2, base[1]), ((meter[0]+meter[2])/2+190, meter[3]))
    inheritance(draw, ((auth[0]+auth[2])/2, auth[1]), (900, base[3]))
    inheritance(draw, ((comp[0]+comp[2])/2, comp[1]), (1200, base[3]))
    inheritance(draw, ((enc[0]+enc[2])/2, enc[1]), (1500, base[3]))
    arrow(draw, (base[2], (base[1]+base[3])/2), (meter[2], (meter[1]+meter[3])/2), label="wraps", dashed=True)
    save(image, "decorator-uml.png")


def composite_uml():
    image, draw = canvas("Part B UML - Composite",
                         "A client applies the same reporting and power operations to groups or individual buildings")
    component = class_box(draw, 820, 175, 760, "ZoneComponent", "<<abstract component>>",
                          ("- id: long", "- name: String", "- type: ZoneType"),
                          ("+ getUsageKwh(): BigDecimal", "+ setPower(on): void",
                           "+ getBuildingCount(): int", "+ getPowerState(): String"), BLUE)
    group = class_box(draw, 240, 700, 800, "ZoneGroup", "<<composite>>",
                      ("- children: List<ZoneComponent>",),
                      ("+ add(child): void", "+ getChildren(): List", "+ aggregate / delegate operations"), GREEN)
    leaf = class_box(draw, 1360, 700, 800, "Building", "<<leaf>>",
                     ("- usageKwh: BigDecimal", "- powerOn: boolean"),
                     ("+ getUsageKwh(): BigDecimal", "+ setPower(on): void", "+ getBuildingCount(): int"), GOLD)
    inheritance(draw, ((group[0]+group[2])/2, group[1]), (1040, component[3]))
    inheritance(draw, ((leaf[0]+leaf[2])/2, leaf[1]), (1360, component[3]))
    arrow(draw, (group[0], (group[1]+group[3])/2), (component[0], (component[1]+component[3])/2),
          label="contains 0..*", dashed=True)
    rounded_box(draw, (770, 1190, 1630, 1330), "Valid hierarchy",
                ["CITY -> DISTRICT -> STREET -> BUILDING"], fill=BLUE_LIGHT, outline=BLUE, align="center")
    save(image, "composite-uml.png")


def chain_uml():
    image, draw = canvas("Part C UML - Chain of Responsibility",
                         "Each handler accepts the supported severity or forwards to its successor")
    base = class_box(draw, 770, 180, 860, "ComplaintHandler", "<<abstract handler>>",
                     ("- next: ComplaintHandler",),
                     ("+ handle(severity): RoutingResult", "# authority(): Authority", "# canHandle(severity): boolean"), BLUE)
    local = class_box(draw, 80, 775, 650, "LocalStaffHandler", "<<concrete handler>>", (),
                      ("handles LOW",), GREEN)
    supervisor = class_box(draw, 875, 775, 650, "SupervisorHandler", "<<concrete handler>>", (),
                           ("handles LOW / MEDIUM",), GOLD)
    manager = class_box(draw, 1670, 775, 650, "CityManagerHandler", "<<concrete handler>>", (),
                        ("handles all severities",), RED)
    for child, px in [(local, 1010), (supervisor, 1200), (manager, 1390)]:
        inheritance(draw, ((child[0]+child[2])/2, child[1]), (px, base[3]))
    local_mid = (local[1] + local[3]) / 2
    supervisor_mid = (supervisor[1] + supervisor[3]) / 2
    manager_mid = (manager[1] + manager[3]) / 2
    arrow(draw, (local[2], local_mid), (supervisor[0], supervisor_mid), label="next")
    arrow(draw, (supervisor[2], supervisor_mid), (manager[0], manager_mid), label="next")
    rounded_box(draw, (500, 1240, 1900, 1360), "Routing result",
                ["LOW: Local staff | MEDIUM: Supervisor | HIGH: City manager | incomplete chain: UNHANDLED"],
                fill=BLUE_LIGHT, outline=BLUE, align="center")
    save(image, "chain-uml.png")


def flyweight_uml():
    image, draw = canvas("Part D UML - Flyweight",
                         "Immutable lamp configuration is intrinsic state; each light retains independent extrinsic state")
    factory = class_box(draw, 90, 210, 700, "LampSpecificationFactory", "<<flyweight factory>>",
                        ("- pool: Map<Key, LampSpecification>",),
                        ("+ get(model, watts, colour)", "+ size(): int"), BLUE)
    spec = class_box(draw, 890, 190, 680, "LampSpecification", "<<flyweight>>",
                     ("- model: String", "- ratedWatts: int", "- colour: LightColour"),
                     ("+ ratedLoadWatts(power, fault): int",), GREEN)
    light = class_box(draw, 1620, 185, 700, "StreetLight", "<<context>>",
                      ("- id / streetId / location", "- powerOn / faulty", "- specification: LampSpecification"),
                      ("+ setPower(on)", "+ setFaulty(faulty)", "+ getState(): String"), GOLD)
    arrow(draw, (factory[2], 380), (spec[0], 380), label="returns shared")
    arrow(draw, (light[0], 500), (spec[2], 500), label="references 1")
    rounded_box(draw, (110, 820, 1120, 1160), "Intrinsic state - shared",
                ["model", "rated watts", "light colour", "immutable behavior derived from configuration"],
                fill=GREEN_LIGHT, outline=GREEN, align="center")
    rounded_box(draw, (1280, 820, 2290, 1160), "Extrinsic state - unique per light",
                ["identifier", "street and location", "power state", "fault state and note", "database edit version"],
                fill=GOLD_LIGHT, outline=GOLD, align="center")
    rounded_box(draw, (510, 1230, 1890, 1360), "Scale demonstration",
                ["100,000 temporary StreetLight contexts reuse only 3 LampSpecification identities"],
                fill=BLUE_LIGHT, outline=BLUE, align="center")
    save(image, "flyweight-uml.png")


def interpreter_uml():
    image, draw = canvas("Part E UML - Interpreter",
                         "The parser constructs an expression tree that interprets a bounded observation context")
    expression = class_box(draw, 850, 165, 700, "Expression", "<<abstract expression>>", (),
                           ("+ interpret(context): boolean", "+ fields(): Set<String>", "+ describe(): String"), BLUE)
    comparison = class_box(draw, 55, 665, 530, "ComparisonExpression", "<<terminal expression>>",
                           ("- field / operator", "- threshold: BigDecimal"),
                           ("+ interpret(context)",), GREEN)
    and_box = class_box(draw, 655, 680, 480, "AndExpression", "<<nonterminal>>",
                        ("- left / right: Expression",), ("+ interpret(context)",), GOLD)
    or_box = class_box(draw, 1265, 680, 480, "OrExpression", "<<nonterminal>>",
                       ("- left / right: Expression",), ("+ interpret(context)",), GOLD)
    not_box = class_box(draw, 1860, 680, 480, "NotExpression", "<<nonterminal>>",
                        ("- child: Expression",), ("+ interpret(context)",), RED)
    for child, px in [(comparison, 980), (and_box, 1110), (or_box, 1290), (not_box, 1420)]:
        inheritance(draw, ((child[0]+child[2])/2, child[1]), (px, expression[3]))
    class_box(draw, 120, 1115, 740, "PolicyParser", "<<parser>>", (),
              ("+ parse(source): Parsed", "+ constructs an Expression tree"), BLUE)
    class_box(draw, 920, 1090, 650, "PolicyContext", "<<context>>",
              ("- values: Map<String, BigDecimal>",),
              ("+ value(field): BigDecimal", "+ require(fields): void"), GREEN)
    class_box(draw, 1680, 1115, 600, "PolicyService", "<<client>>", (),
              ("+ validate / save / evaluate", "+ uses parser and context"), RED)
    save(image, "interpreter-uml.png")


def complaint_sequence():
    image, draw = canvas("Integrated complaint journey",
                         "Chain routing is one step inside a broader authenticated and persistent workflow")
    participants = [
        ("Resident browser", 170), ("ComplaintResource", 620), ("ComplaintService", 1070),
        ("Handler chain", 1520), ("PostgreSQL", 1970)
    ]
    top = 235
    bottom = 1310
    for name, x in participants:
        draw.rounded_rectangle((x - 155, top - 55, x + 155, top + 25), radius=15,
                               fill=BLUE_LIGHT, outline=BLUE, width=3)
        tw = draw.textbbox((0, 0), name, font=font(21, True))[2]
        draw.text((x - tw/2, top - 36), name, fill=INK, font=font(21, True))
        draw.line((x, top + 25, x, bottom), fill=LINE, width=3)
    messages = [
        (170, 620, 320, "POST complaint + CSRF"),
        (620, 1070, 430, "validate role, city and JSON"),
        (1070, 1520, 545, "handle(severity)"),
        (1520, 1070, 660, "RoutingResult + steps"),
        (1070, 1970, 780, "save complaint and ordered events"),
        (1970, 1070, 895, "committed entity + version"),
        (1070, 620, 1010, "privacy-safe JSON response"),
        (620, 170, 1125, "201 Created + assignment"),
        (170, 620, 1240, "later: reply / reopen request"),
    ]
    for x1, x2, y, label in messages:
        arrow(draw, (x1, y), (x2, y), label=label, width=4)
    save(image, "complaint-sequence.png")


if __name__ == "__main__":
    architecture()
    use_cases()
    data_model()
    decorator_uml()
    composite_uml()
    chain_uml()
    flyweight_uml()
    interpreter_uml()
    complaint_sequence()
