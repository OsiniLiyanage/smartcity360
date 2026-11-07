package lk.osini.smartcity360.pattern.chain;

public final class LocalStaffHandler extends ComplaintHandler {
    public LocalStaffHandler(ComplaintHandler next) { super(next); }
    @Override protected Authority authority() { return Authority.LOCAL_STAFF; }
    @Override protected boolean canHandle(Severity severity) { return severity == Severity.LOW; }
}
