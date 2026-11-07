package lk.osini.smartcity360.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import lk.osini.smartcity360.pattern.interpreter.PolicyContext;

/** Immutable evidence retains the evaluated rule even after that policy is edited. */
@Entity @Table(name = "policy_evaluation") @Cacheable(false)
public class PolicyEvaluation {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "city_id", nullable = false) private Long cityId;
    @Column(name = "policy_id", nullable = false) private Long policyId;
    @Column(name = "zone_id", nullable = false) private Long zoneId;
    @Column(name = "policy_version", nullable = false) private long policyVersion;
    @Column(name = "policy_name", nullable = false, length = 80) private String policyName;
    @Column(nullable = false, length = 12) private String category;
    @Column(nullable = false, length = 1000) private String expression;
    @Column(name = "true_meaning", nullable = false, length = 12) private String trueMeaning;
    @Column(precision = 6, scale = 3) private BigDecimal noise;
    private Integer hour;
    @Column(name = "parking_minutes") private Integer parkingMinutes;
    @Column(nullable = false) private boolean matched;
    @Column(nullable = false, length = 500) private String note;
    @Column(name = "evaluated_at", nullable = false) private Instant evaluatedAt;
    protected PolicyEvaluation() { }
    public PolicyEvaluation(Policy policy, long zoneId, PolicyContext context, boolean matched, String note) {
        cityId = policy.getCityId(); policyId = policy.getId(); this.zoneId = zoneId; policyVersion = policy.getVersion();
        policyName = policy.getName(); category = policy.getCategory(); expression = policy.getExpression(); trueMeaning = policy.getTrueMeaning();
        var values = context.values(); noise = values.get("noise");
        hour = values.containsKey("hour") ? values.get("hour").intValueExact() : null;
        parkingMinutes = values.containsKey("parkingMinutes") ? values.get("parkingMinutes").intValueExact() : null;
        this.matched = matched; this.note = note; evaluatedAt = Instant.now().truncatedTo(ChronoUnit.MILLIS);
    }
    public Long getId() { return id; }
    public Long getCityId() { return cityId; }
    public Long getPolicyId() { return policyId; }
    public Long getZoneId() { return zoneId; }
    public long getPolicyVersion() { return policyVersion; }
    public String getPolicyName() { return policyName; }
    public String getCategory() { return category; }
    public String getExpression() { return expression; }
    public String getTrueMeaning() { return trueMeaning; }
    public BigDecimal getNoise() { return noise; }
    public Integer getHour() { return hour; }
    public Integer getParkingMinutes() { return parkingMinutes; }
    public boolean isMatched() { return matched; }
    public String getNote() { return note; }
    public Instant getEvaluatedAt() { return evaluatedAt; }
    public String getOutcome() { return trueMeaning.equals("VIOLATION") ? (matched ? "VIOLATION" : "NO_VIOLATION") : (matched ? "PERMITTED" : "NOT_PERMITTED"); }
}
