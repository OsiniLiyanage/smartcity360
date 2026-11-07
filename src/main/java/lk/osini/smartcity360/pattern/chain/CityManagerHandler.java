package lk.osini.smartcity360.pattern.chain;

public final class CityManagerHandler extends ComplaintHandler {
    public CityManagerHandler() { super(null); }
    @Override protected Authority authority() { return Authority.CITY_MANAGER; }
    @Override protected boolean canHandle(Severity severity) { return true; }
}
