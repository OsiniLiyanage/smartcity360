package lk.osini.smartcity360.pattern.composite;

public enum ZoneType {
    CITY, DISTRICT, STREET, BUILDING;

    public boolean accepts(ZoneType child) {
        return ordinal() < BUILDING.ordinal() && child.ordinal() == ordinal() + 1;
    }
}
