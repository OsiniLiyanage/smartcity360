package lk.osini.smartcity360.pattern.decorator;

public final class CredentialRejectedException extends SecurityException {
    public CredentialRejectedException() { super("Meter credential was not accepted."); }
}
