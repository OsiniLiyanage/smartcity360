package lk.osini.smartcity360.security;

import java.util.Set;

/** Explicit endpoint allowlist. Unknown resource methods are denied, including for admins. */
public final class AccessRules {
    private AccessRules() { }
    private static final Set<String> ALL = Set.of("CityResource.list", "AreaResource.tree", "ComplaintResource.list", "ComplaintResource.detail", "ComplaintResource.create",
            "AuthResource.logout", "AuthResource.profile", "AuthResource.password");
    private static final Set<String> STAFF = Set.of("ZoneResource.tree", "ZoneResource.usage", "MeterResource.list", "MeterResource.readings", "MeterResource.submit", "MeterResource.recover",
            "StreetlightResource.specifications", "StreetlightResource.list", "StreetlightResource.detail", "StreetlightResource.update",
            "PolicyResource.list", "PolicyResource.detail", "PolicyResource.evaluate", "PolicyResource.history",
            "ComplaintResource.status", "ComplaintResource.escalate");
    private static final Set<String> MANAGE = Set.of("ZoneResource.create", "MeterResource.register", "MeterResource.replace", "StreetlightResource.create");
    private static final Set<String> MANAGER = Set.of("ZoneResource.power", "PolicyResource.create", "PolicyResource.update", "PolicyResource.validate");
    private static final Set<String> ADMIN = Set.of("CityResource.create", "StreetlightResource.saveSpecification", "StreetlightResource.demonstrate",
            "AccountResource.list", "AccountResource.create", "AccountResource.update", "AccountResource.events");
    public static boolean isPublic(String operation) {
        return Set.of("HealthResource.health", "AuthResource.session", "AuthResource.login", "AuthResource.register").contains(operation);
    }
    public static boolean allowed(Role role, String operation) {
        if (role == null) return false;
        if (ALL.contains(operation)) return true;
        if (STAFF.contains(operation)) return role != Role.RESIDENT;
        if (MANAGE.contains(operation)) return role.authorityLevel() >= 2;
        if (MANAGER.contains(operation)) return role.authorityLevel() >= 3;
        return ADMIN.contains(operation) && role == Role.SYSTEM_ADMIN;
    }
}
