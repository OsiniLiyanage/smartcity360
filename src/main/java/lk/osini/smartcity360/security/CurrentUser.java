package lk.osini.smartcity360.security;

import jakarta.enterprise.context.RequestScoped;
import jakarta.ws.rs.ForbiddenException;
import jakarta.ws.rs.NotAuthorizedException;
import lk.osini.smartcity360.entity.AppUser;

@RequestScoped
public class CurrentUser {
    private AppUser user;
    private long securityVersion;
    public void set(AppUser user) { this.user = user; securityVersion = user.getSecurityVersion(); }
    public long securityVersion() { return securityVersion; }
    public AppUser get() { if (user == null) throw new NotAuthorizedException("Sign in to continue."); return user; }
    public boolean resident() { return get().getRole() == Role.RESIDENT; }
    public boolean admin() { return get().getRole() == Role.SYSTEM_ADMIN; }
    public boolean canCity(long cityId) { return !get().getRole().isStaff() || Long.valueOf(cityId).equals(get().getCityId()); }
    public void requireCity(long cityId) { if (!canCity(cityId)) throw new ForbiddenException("This city is outside your assigned access."); }
}
