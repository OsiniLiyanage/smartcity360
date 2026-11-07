package lk.osini.smartcity360.resource;

import jakarta.inject.Inject;
import jakarta.json.*;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.*;
import lk.osini.smartcity360.entity.*;
import lk.osini.smartcity360.service.MeterService;

@Path("/cities/{cityId}/meters")
@Produces(MediaType.APPLICATION_JSON)
public class MeterResource {
    @Inject private MeterService service;
    @GET public JsonArray list(@PathParam("cityId") long cityId) {
        JsonArrayBuilder values = Json.createArrayBuilder();
        for (Meter meter : service.list(cityId)) values.add(meter(meter));
        return values.build();
    }
    @POST @Consumes(MediaType.APPLICATION_JSON)
    public Response register(@PathParam("cityId") long cityId, JsonValue payload) {
        JsonObject body = object(payload);
        return Response.status(201).header("Cache-Control", "no-store")
                .entity(issued(service.register(cityId, id(body, "buildingId"), text(body, "name")))).build();
    }
    @POST @Path("/{meterId}/credential")
    public Response replace(@PathParam("cityId") long cityId, @PathParam("meterId") long meterId) {
        return Response.ok(issued(service.replaceCredential(cityId, meterId))).header("Cache-Control", "no-store").build();
    }
    @GET @Path("/{meterId}/readings")
    public JsonArray readings(@PathParam("cityId") long cityId, @PathParam("meterId") long meterId) {
        JsonArrayBuilder values = Json.createArrayBuilder();
        for (MeterReading reading : service.readings(cityId, meterId)) values.add(reading(reading));
        return values.build();
    }
    @POST @Path("/{meterId}/readings") @Consumes(MediaType.APPLICATION_JSON)
    public Response submit(@PathParam("cityId") long cityId, @PathParam("meterId") long meterId, JsonValue payload) {
        JsonObject body = object(payload);
        if (!(body.get("usageKwh") instanceof JsonNumber usage)) throw new BadRequestException("Provide numeric usageKwh.");
        return Response.status(201).entity(reading(service.submit(cityId, meterId, usage.bigDecimalValue(),
                flag(body, "authentication"), flag(body, "compression"), flag(body, "encryption"), credential(body))).build()).build();
    }
    @POST @Path("/{meterId}/readings/{readingId}/recover") @Consumes(MediaType.APPLICATION_JSON)
    public Response recover(@PathParam("cityId") long cityId, @PathParam("meterId") long meterId,
                           @PathParam("readingId") long readingId, JsonValue payload) {
        JsonObject body = object(payload);
        String recovered = service.recover(cityId, meterId, readingId, credential(body),
                body.containsKey("simulateTampering") && flag(body, "simulateTampering"));
        return Response.ok(Json.createObjectBuilder().add("verified", true).add("recovered", recovered).build())
                .header("Cache-Control", "no-store").build();
    }
    private JsonObject object(JsonValue value) {
        if (!(value instanceof JsonObject body)) throw new BadRequestException("Provide a JSON object.");
        return body;
    }
    private String text(JsonObject body, String field) {
        if (!(body.get(field) instanceof JsonString value)) throw new BadRequestException("Provide " + field + " as text.");
        return value.getString();
    }
    private String credential(JsonObject body) {
        if (!body.containsKey("credential") || body.isNull("credential")) return null;
        String value = text(body, "credential");
        if (value.length() > 200) throw new BadRequestException("Credential is too long.");
        return value;
    }
    private boolean flag(JsonObject body, String field) {
        if (body.get(field) != JsonValue.TRUE && body.get(field) != JsonValue.FALSE)
            throw new BadRequestException("Provide " + field + " as true or false.");
        return body.getBoolean(field);
    }
    private long id(JsonObject body, String field) {
        if (!(body.get(field) instanceof JsonNumber number)) throw new BadRequestException("Provide a positive " + field + ".");
        try { long id = number.longValueExact(); if (id < 1) throw new ArithmeticException(); return id; }
        catch (ArithmeticException exception) { throw new BadRequestException("Provide a positive integer " + field + "."); }
    }
    private JsonObject meter(Meter meter) {
        // Do not serialize the JPA entity or expose its credential hash.
        return Json.createObjectBuilder().add("id", meter.getId()).add("buildingId", meter.getZoneId()).add("name", meter.getName()).build();
    }
    private JsonObject issued(MeterService.Issued issued) {
        return Json.createObjectBuilder().add("meter", meter(issued.meter())).add("credential", issued.credential()).build();
    }
    private JsonObjectBuilder reading(MeterReading value) {
        return Json.createObjectBuilder().add("id", value.getId()).add("meterId", value.getMeterId())
                .add("usageKwh", value.getUsageKwh()).add("authentication", value.isAuthenticated())
                .add("compression", value.isCompressed()).add("encryption", value.isEncrypted())
                .add("originalBytes", value.getOriginalBytes()).add("encodedBytes", value.getEncodedBytes())
                .add("payloadBase64", value.getPayload()).add("receivedAt", value.getReceivedAt().toString());
    }
}
