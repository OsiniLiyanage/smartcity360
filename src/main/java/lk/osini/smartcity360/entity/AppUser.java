package lk.osini.smartcity360.entity;

import jakarta.persistence.*;
import lk.osini.smartcity360.security.Role;
import java.time.Instant;

@Entity @Table(name = "app_user") @Cacheable(false)
public class AppUser {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, length = 254) private String email;
    @Column(name = "display_name", nullable = false, length = 100) private String displayName;
    @Column(name = "password_hash", nullable = false, length = 200) private String passwordHash;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20) private Role role;
    @Column(name = "city_id") private Long cityId;
    private boolean enabled;
    @Column(length = 30) private String username;
    @Column(length = 16) private String phone;
    @Column(columnDefinition = "TEXT") private String avatar;
    public String getUsername() { return username; }
    public String getPhone() { return phone; }
    public String getAvatar() { return avatar; }
    public void details(String username, String phone, String avatar) {
        this.username = username; this.phone = phone; this.avatar = avatar;
    }
    @Column(name = "password_change_required") private boolean passwordChangeRequired;
    @Column(name = "security_version") private long securityVersion;
    @Version private long version;
    @Column(name = "created_at", nullable = false) private Instant createdAt;
    protected AppUser() { }
    public AppUser(String email, String name, String hash, Role role, Long cityId, boolean mustChange) {
        this.email = email; displayName = name; passwordHash = hash; this.role = role; this.cityId = cityId;
        enabled = true; passwordChangeRequired = mustChange; createdAt = Instant.now().truncatedTo(java.time.temporal.ChronoUnit.MILLIS);
    }
    public void profile(String name) { displayName = name; }
    public void password(String hash) { passwordHash = hash; passwordChangeRequired = false; securityVersion++; }
    public void permissions(Role role, Long cityId, boolean enabled) {
        this.role = role; this.cityId = cityId; this.enabled = enabled; securityVersion++;
    }
    public Long getId() { return id; }
    public String getEmail() { return email; }
    public String getDisplayName() { return displayName; }
    public String getPasswordHash() { return passwordHash; }
    public Role getRole() { return role; }
    public Long getCityId() { return cityId; }
    public boolean isEnabled() { return enabled; }
    public boolean isPasswordChangeRequired() { return passwordChangeRequired; }
    public long getSecurityVersion() { return securityVersion; }
    public long getVersion() { return version; }
    public Instant getCreatedAt() { return createdAt; }
}
