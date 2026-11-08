package lk.osini.smartcity360.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Cacheable(false)
@Table(name = "complaint_event")
public class ComplaintEvent {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "complaint_id", nullable = false) private Long complaintId;
    @Column(name = "event_type", nullable = false) private String eventType;
    @Column(nullable = false) private String actor;
    @Column(name = "actor_user_id") private Long actorUserId;
    @Column(name = "public_message", length = 1200) private String publicMessage;
    @Column(nullable = false, length = 1200) private String message;
    @Column(name = "occurred_at", nullable = false) private Instant occurredAt;

    protected ComplaintEvent() { }
    public ComplaintEvent(long complaintId, String eventType, String actor, String message) {
        this.complaintId = complaintId; this.eventType = eventType;
        this.actor = actor; this.message = message; occurredAt = Instant.now().truncatedTo(java.time.temporal.ChronoUnit.MILLIS);
    }
    public Long getId() { return id; }
    public void identity(Long actorUserId, String publicMessage) { this.actorUserId = actorUserId; this.publicMessage = publicMessage; }
    public Long getActorUserId() { return actorUserId; }
    public String getPublicMessage() { return publicMessage; }
    public String getEventType() { return eventType; }
    public String getActor() { return actor; }
    public String getMessage() { return message; }
    public Instant getOccurredAt() { return occurredAt; }
}
