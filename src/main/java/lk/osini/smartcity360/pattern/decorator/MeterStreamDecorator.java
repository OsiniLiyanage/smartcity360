package lk.osini.smartcity360.pattern.decorator;

import java.util.Objects;

public abstract class MeterStreamDecorator implements MeterStream {
    protected final MeterStream wrapped;
    protected MeterStreamDecorator(MeterStream wrapped) { this.wrapped = Objects.requireNonNull(wrapped); }
}
