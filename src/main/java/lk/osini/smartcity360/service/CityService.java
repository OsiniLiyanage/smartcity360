package lk.osini.smartcity360.service;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import lk.osini.smartcity360.security.CurrentUser;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.transaction.Transactional;
import lk.osini.smartcity360.entity.City;

import java.util.List;

@ApplicationScoped
public class CityService {
    @Inject private CurrentUser current;
    @PersistenceContext(unitName = "SmartCity360PU")
    private EntityManager entityManager;

    public List<City> list() {
        if (current.get().getRole().isStaff()) {
            City city = entityManager.find(City.class, current.get().getCityId());
            return city == null ? List.of() : List.of(city);
        }
        return entityManager.createQuery("SELECT c FROM City c WHERE c.archived = false ORDER BY c.id", City.class)
                .getResultList();
    }

    @Transactional
    public City create(String name) {
        if (name == null || name.isBlank() || name.strip().length() > 100) {
            throw new IllegalArgumentException("City name must contain between 1 and 100 characters.");
        }
        City city = new City(name.strip());
        entityManager.persist(city);
        entityManager.flush();
        return city;
    }
}
