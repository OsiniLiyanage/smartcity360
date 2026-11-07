package lk.osini.smartcity360.pattern.chain;

public final class SupervisorHandler extends ComplaintHandler {
    public SupervisorHandler(ComplaintHandler next) { super(next); }
    @Override protected Authority authority() { return Authority.SUPERVISOR; }
    @Override protected boolean canHandle(Severity severity) { return severity != Severity.HIGH; }
}
