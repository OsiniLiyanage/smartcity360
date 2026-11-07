package lk.osini.smartcity360.entity;

import jakarta.persistence.*;
import java.time.Instant;
import java.time.temporal.ChronoUnit;

@Entity @Table(name = "policy") @Cacheable(false)
public class Policy {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "city_id", nullable = false) private Long cityId;
    @Column(nullable = false, length = 80) private String name;
    @Column(nullable = false, length = 12) private String category;
    @Column(nullable = false, length = 1000) private String expression;
    @Column(name = "true_meaning", nullable = false, length = 12) private String trueMeaning;
    @Column(nullable = false) private boolean active;
    @Version private long version;
    @Column(name = "updated_at", nullable = false) private Instant updatedAt;
    protected Policy() { }
    public Policy(long cityId, String name, String category, String expression, String meaning, boolean active) {
        this.cityId = cityId; update(name, category, expression, meaning, active);
    }
    public void update(String name, String category, String expression, String meaning, boolean active) {
        this.name = name; this.category = category; this.expression = expression; trueMeaning = meaning; this.active = active;
        updatedAt = Instant.now().truncatedTo(ChronoUnit.MILLIS);
    }
    public Long getId() { return id; }
    public Long getCityId() { return cityId; }
    public String getName() { return name; }
    public String getCategory() { return category; }
    public String getExpression() { return expression; }
    public String getTrueMeaning() { return trueMeaning; }
    public boolean isActive() { return active; }
    public long getVersion() { return version; }
    public Instant getUpdatedAt() { return updatedAt; }
}
