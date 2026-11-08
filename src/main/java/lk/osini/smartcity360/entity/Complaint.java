package lk.osini.smartcity360.entity;

import jakarta.persistence.*;
import lk.osini.smartcity360.pattern.chain.*;
import java.time.Instant;

@Entity
@Cacheable(false)
@Table(name = "complaint")
public class Complaint {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "city_id", nullable = false) private Long cityId;
    @Column(name = "zone_id") private Long zoneId;
    @Column(name = "owner_id") private Long ownerId;
    @Column(name = "assigned_user_id") private Long assignedUserId;
    @Column(name = "resident_name", nullable = false, length = 100) private String residentName;
    @Column(nullable = false, length = 160) private String subject;
    @Column(nullable = false, length = 2000) private String description;
    @Enumerated(EnumType.STRING) @Column(nullable = false) private Severity severity;
    @Enumerated(EnumType.STRING) @Column(name = "assigned_to") private Authority assignedTo;
    @Enumerated(EnumType.STRING) @Column(nullable = false) private ComplaintStatus status;
    @Column(name = "created_at", nullable = false) private Instant createdAt;
    @Column(name = "updated_at", nullable = false) private Instant updatedAt;
    @Version private long version;

    protected Complaint() { }
    public Complaint(long cityId, Long zoneId, String residentName, String subject, String description,
                     Severity severity, Authority assignedTo) {
        this.cityId = cityId; this.zoneId = zoneId; this.residentName = residentName;
        this.subject = subject; this.description = description;
        route(severity, assignedTo);
        createdAt = updatedAt;
    }
    public void route(Severity severity, Authority authority) {
        this.severity = severity; assignedTo = authority;
        assignedUserId = null;
        status = authority == null ? ComplaintStatus.UNASSIGNED : ComplaintStatus.ASSIGNED;
        updatedAt = Instant.now().truncatedTo(java.time.temporal.ChronoUnit.MILLIS);
    }
    public void changeStatus(ComplaintStatus status) { this.status = status; updatedAt = Instant.now().truncatedTo(java.time.temporal.ChronoUnit.MILLIS); }
    public Long getId() { return id; }
    public Long getOwnerId() { return ownerId; }
    public Long getAssignedUserId() { return assignedUserId; }
    public void assignUser(Long userId) {
        assignedUserId = userId;
        updatedAt = Instant.now().truncatedTo(java.time.temporal.ChronoUnit.MILLIS);
    }
    public void setOwnerId(Long ownerId) { this.ownerId = ownerId; }
    public Long getCityId() { return cityId; }
    public Long getZoneId() { return zoneId; }
    public String getResidentName() { return residentName; }
    public String getSubject() { return subject; }
    public String getDescription() { return description; }
    public Severity getSeverity() { return severity; }
    public Authority getAssignedTo() { return assignedTo; }
    public ComplaintStatus getStatus() { return status; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public long getVersion() { return version; }
}
