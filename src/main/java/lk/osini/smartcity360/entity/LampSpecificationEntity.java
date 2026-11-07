package lk.osini.smartcity360.entity;

import jakarta.persistence.*;
import lk.osini.smartcity360.pattern.flyweight.LightColour;

@Entity @Table(name = "lamp_specification") @Cacheable(false)
public class LampSpecificationEntity {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, length = 100) private String model;
    @Column(name = "rated_watts", nullable = false) private int ratedWatts;
    @Enumerated(EnumType.STRING) @Column(nullable = false) private LightColour colour;
    protected LampSpecificationEntity() { }
    public Long getId() { return id; }
    public String getModel() { return model; }
    public int getRatedWatts() { return ratedWatts; }
    public LightColour getColour() { return colour; }
}
