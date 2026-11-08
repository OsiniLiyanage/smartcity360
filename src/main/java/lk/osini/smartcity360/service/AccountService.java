package lk.osini.smartcity360.service;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.*;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.*;
import lk.osini.smartcity360.entity.*;
import lk.osini.smartcity360.security.*;
import java.util.*;

@ApplicationScoped
public class AccountService {
    @PersistenceContext(unitName = "SmartCity360PU") private EntityManager em;
    @Inject private CurrentUser current;
    private final String dummyHash = PasswordHash.hash("Unusable dummy " + PasswordHash.randomToken());
    public record Page(List<AppUser> items, long total) { }
    public record Issued(AppUser user, String temporaryPassword) { }
    public AppUser find(long id) { return em.find(AppUser.class, id); }
    public AppUser authenticate(String email, String password) {
        String key = email == null ? "" : email.strip().toLowerCase(Locale.ROOT);
        var users = em.createQuery("SELECT u FROM AppUser u WHERE u.email=:email", AppUser.class).setParameter("email",key).setMaxResults(1).getResultList();
        AppUser user = users.isEmpty() ? null : users.getFirst();
        boolean valid = PasswordHash.verify(password, user == null ? dummyHash : user.getPasswordHash());
        if (!valid || user == null || !user.isEnabled()) throw new NotAuthorizedException("Email or password is incorrect.");
        return user;
    }
    @Transactional public AppUser register(String email, String name, String password) {
        return create(email, name, password, Role.RESIDENT, null, false, null);
    }
    @Transactional public Issued provision(String email, String name, Role role, Long cityId) {
        if (!current.admin()) throw new ForbiddenException();
        String password = PasswordHash.randomToken();
        return new Issued(create(email, name, password, role, cityId, true, current.get().getId()), password);
    }
    private AppUser create(String email, String name, String password, Role role, Long cityId, boolean mustChange, Long actor) {
        email = email(email); name = name(name); scope(role, cityId);
        String hash;
        try { hash = PasswordHash.hash(password); } catch (IllegalArgumentException error) { throw new BadRequestException(error.getMessage()); }
        // Serialize unique account creation and role administration without relying on a race-prone pre-check.
        em.createNativeQuery("SELECT 1 FROM pg_advisory_xact_lock(360007)").getResultList();
        if (em.createQuery("SELECT COUNT(u) FROM AppUser u WHERE u.email=:email",Long.class).setParameter("email",email).getSingleResult() > 0)
            throw new ClientErrorException("An account already uses this email address.",409);
        AppUser user = new AppUser(email,name,hash,role,cityId,mustChange); em.persist(user); em.flush();
        event(actor == null ? user.getId() : actor,user.getId(),actor == null ? "REGISTERED" : "ACCOUNT_CREATED"); return user;
    }
    @Transactional public AppUser profile(String name) {
        AppUser user = lockedCurrent(); user.profile(name(name)); em.flush(); event(user.getId(),user.getId(),"PROFILE_UPDATED"); return user;
    }
    @Transactional public void password(String oldPassword, String newPassword) {
        AppUser user = lockedCurrent();
        if (!PasswordHash.verify(oldPassword,user.getPasswordHash())) throw new BadRequestException("Current password is incorrect.");
        if (Objects.equals(oldPassword,newPassword)) throw new BadRequestException("Choose a different new password.");
        try { user.password(PasswordHash.hash(newPassword)); } catch (IllegalArgumentException error) { throw new BadRequestException(error.getMessage()); }
        em.flush(); event(user.getId(),user.getId(),"PASSWORD_CHANGED");
    }
    @Transactional public AppUser update(long id, long version, Role role, Long cityId, boolean enabled) {
        if (!current.admin()) throw new ForbiddenException();
        if (current.get().getId() == id) throw new BadRequestException("You cannot change your own role, access or active status here.");
        em.createNativeQuery("SELECT 1 FROM pg_advisory_xact_lock(360007)").getResultList();
        AppUser user = find(id); if (user == null) throw new NotFoundException("Account not found.");
        em.refresh(user,LockModeType.PESSIMISTIC_WRITE);
        if (version != user.getVersion()) throw new ClientErrorException("This account changed. Refresh before saving.",409);
        scope(role,cityId); user.permissions(role,cityId,enabled); em.flush(); event(current.get().getId(),id,"ACCESS_UPDATED"); return user;
    }
    public Page list(int page) {
        if (!current.admin()) throw new ForbiddenException();
        if (page < 0 || page > 100000) throw new BadRequestException("Choose a valid page.");
        return new Page(em.createQuery("SELECT u FROM AppUser u ORDER BY u.id",AppUser.class).setFirstResult(page*25).setMaxResults(25).getResultList(),
                em.createQuery("SELECT COUNT(u) FROM AppUser u",Long.class).getSingleResult());
    }
    public List<Object[]> events() {
        if (!current.admin()) throw new ForbiddenException();
        return em.createNativeQuery("SELECT id,actor_id,target_id,action,occurred_at FROM account_event ORDER BY id DESC LIMIT 100").getResultList();
    }
    private AppUser lockedCurrent() {
        AppUser user = find(current.get().getId()); em.refresh(user,LockModeType.PESSIMISTIC_WRITE);
        if (!user.isEnabled() || user.getSecurityVersion() != current.securityVersion()) throw new NotAuthorizedException("Sign in again.");
        return user;
    }
    private void scope(Role role, Long cityId) {
        if (role == null) throw new BadRequestException("Choose a role.");
        if (role.isStaff()) {
            if (cityId == null || em.find(City.class,cityId) == null) throw new BadRequestException("Choose an existing city for this staff account.");
        } else if (cityId != null) throw new BadRequestException("Resident and system-admin accounts do not have a staff city assignment.");
    }
    private String email(String email) {
        if (email == null) throw new BadRequestException("Provide an email address.");
        email = email.strip().toLowerCase(Locale.ROOT);
        if (email.length() > 254 || !email.matches("[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9-]+(?:\\.[A-Za-z0-9-]+)+"))
            throw new BadRequestException("Provide a valid email address.");
        return email;
    }
    private String name(String name) {
        if (name == null || name.isBlank() || name.strip().length() > 100) throw new BadRequestException("Display name must contain 1 to 100 characters."); return name.strip();
    }
    private void event(Long actor, long target, String action) {
        em.createNativeQuery("INSERT INTO account_event(actor_id,target_id,action) VALUES (?1,?2,?3)").setParameter(1,actor).setParameter(2,target).setParameter(3,action).executeUpdate();
    }
}
