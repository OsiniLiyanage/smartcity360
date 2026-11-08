package lk.osini.smartcity360.security;

public enum Role {
    RESIDENT, LOCAL_STAFF, SUPERVISOR, CITY_MANAGER, SYSTEM_ADMIN;
    public boolean isStaff() { return this == LOCAL_STAFF || this == SUPERVISOR || this == CITY_MANAGER; }
    public int authorityLevel() { return switch (this) {
        case RESIDENT -> 0; case LOCAL_STAFF -> 1; case SUPERVISOR -> 2; case CITY_MANAGER -> 3; case SYSTEM_ADMIN -> 4;
    }; }
}
