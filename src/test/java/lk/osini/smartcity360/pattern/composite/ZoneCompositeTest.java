package lk.osini.smartcity360.pattern.composite;

import org.junit.jupiter.api.Test;
import java.math.BigDecimal;
import static org.junit.jupiter.api.Assertions.*;

class ZoneCompositeTest {
    private Building building(long id, String reading) { return new Building(id, "Building", new BigDecimal(reading), true); }

    @Test void districtCommandLeavesNeighbouringDistrictUntouchedAndPreservesRecordedUsage() {
        ZoneGroup city = new ZoneGroup(1, "City", ZoneType.CITY);
        ZoneGroup east = new ZoneGroup(2, "East", ZoneType.DISTRICT);
        ZoneGroup west = new ZoneGroup(3, "West", ZoneType.DISTRICT);
        ZoneGroup firstStreet = new ZoneGroup(4, "First", ZoneType.STREET);
        ZoneGroup secondStreet = new ZoneGroup(5, "Second", ZoneType.STREET);
        Building a = building(6, "12.125"), b = building(7, "7.875"), c = building(8, "5.000");
        city.add(east); city.add(west); east.add(firstStreet); west.add(secondStreet);
        firstStreet.add(a); firstStreet.add(b); secondStreet.add(c);
        assertEquals(0, city.getUsageKwh().compareTo(new BigDecimal("25.000")));
        ZoneComponent selected = east;
        selected.setPower(false);
        assertFalse(a.isPowerOn()); assertFalse(b.isPowerOn()); assertTrue(c.isPowerOn());
        assertEquals("MIXED", city.getPowerState());
        assertEquals(1, city.getPoweredBuildingCount());
        assertEquals(0, city.getUsageKwh().compareTo(new BigDecimal("25.000")));
        city.setPower(true);
        assertEquals("ON", city.getPowerState());
        assertEquals(3, city.getPoweredBuildingCount());
    }

    @Test void rejectsWrongLevelSelfLinkAndAncestorCycle() {
        ZoneGroup city = new ZoneGroup(1, "City", ZoneType.CITY);
        ZoneGroup district = new ZoneGroup(2, "District", ZoneType.DISTRICT);
        city.add(district);
        assertThrows(IllegalArgumentException.class, () -> city.add(city));
        assertThrows(IllegalArgumentException.class, () -> district.add(city));
        assertThrows(IllegalArgumentException.class, () -> city.add(building(3, "1")));
    }

    @Test void rejectsDuplicateOwnershipAndDuplicateIdentity() {
        ZoneGroup first = new ZoneGroup(1, "First", ZoneType.STREET);
        ZoneGroup second = new ZoneGroup(2, "Second", ZoneType.STREET);
        Building building = building(3, "2");
        first.add(building);
        assertThrows(IllegalArgumentException.class, () -> second.add(building));
        assertThrows(IllegalArgumentException.class, () -> first.add(building(3, "5")));
        assertEquals(1, first.getBuildingCount());
        assertEquals(0, second.getBuildingCount());
        assertThrows(UnsupportedOperationException.class, () -> first.getChildren().clear());
    }

    @Test void emptyGroupHasZeroTotalsAndNoPowerState() {
        ZoneComponent empty = new ZoneGroup(1, "Empty", ZoneType.DISTRICT);
        empty.setPower(false);
        assertEquals(BigDecimal.ZERO, empty.getUsageKwh());
        assertEquals(0, empty.getBuildingCount());
        assertEquals("EMPTY", empty.getPowerState());
    }

    @Test void leafSupportsTheSameCommandsAndRejectsNegativeUsage() {
        ZoneComponent leaf = building(1, "0.250");
        leaf.setPower(false);
        assertEquals("OFF", leaf.getPowerState());
        assertEquals(0, leaf.getUsageKwh().compareTo(new BigDecimal("0.250")));
        assertThrows(IllegalArgumentException.class, () -> building(2, "-1"));
    }
}
