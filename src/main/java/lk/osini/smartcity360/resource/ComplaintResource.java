package lk.osini.smartcity360.resource;

import jakarta.inject.Inject;
import jakarta.json.*;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.*;
import lk.osini.smartcity360.entity.*;
import lk.osini.smartcity360.pattern.chain.Severity;
import lk.osini.smartcity360.service.ComplaintService;

@Path("/cities/{cityId}/complaints")
@Produces(MediaType.APPLICATION_JSON)
public class ComplaintResource {
    @Inject private ComplaintService service;

    @GET
    public JsonArray list(@PathParam("cityId") long cityId) {
        JsonArrayBuilder result = Json.createArrayBuilder();
        for (Complaint complaint : service.list(cityId)) result.add(summary(complaint));
        return result.build();
    }

    @GET @Path("/{id}")
    public JsonObject detail(@PathParam("cityId") long cityId, @PathParam("id") long id) {
        return json(service.detail(cityId, id));
    }

    @POST @Consumes(MediaType.APPLICATION_JSON)
    public Response create(@PathParam("cityId") long cityId, JsonValue payload) {
        JsonObject body = object(payload);
        return Response.status(201).entity(json(service.create(cityId, optionalId(body, "zoneId"),
                text(body, "residentName"), text(body, "subject"), text(body, "description"),
                choice(body, "severity", Severity.class)))).build();
    }

    @PUT @Path("/{id}/status") @Consumes(MediaType.APPLICATION_JSON)
    public JsonObject status(@PathParam("cityId") long cityId, @PathParam("id") long id, JsonValue payload) {
        JsonObject body = object(payload);
        return json(service.status(cityId, id, version(body),
                choice(body, "status", ComplaintStatus.class), text(body, "note")));
    }

    @PUT @Path("/{id}/escalate") @Consumes(MediaType.APPLICATION_JSON)
    public JsonObject escalate(@PathParam("cityId") long cityId, @PathParam("id") long id, JsonValue payload) {
        JsonObject body = object(payload);
        return json(service.escalate(cityId, id, version(body),
                choice(body, "severity", Severity.class), text(body, "note")));
    }

    private JsonObject object(JsonValue payload) {
        if (!(payload instanceof JsonObject body)) throw new BadRequestException("Provide a JSON object.");
        return body;
    }
    private String text(JsonObject body, String field) {
        if (body == null || !(body.get(field) instanceof JsonString value))
            throw new BadRequestException("Provide " + field + " as text.");
        return value.getString();
    }
    private <E extends Enum<E>> E choice(JsonObject body, String field, Class<E> type) {
        try { return Enum.valueOf(type, text(body, field)); }
        catch (IllegalArgumentException exception) { throw new BadRequestException("Choose a valid " + field + "."); }
    }
    private Long optionalId(JsonObject body, String field) {
        if (body == null) throw new BadRequestException("Provide a complaint.");
        if (!body.containsKey(field) || body.isNull(field)) return null;
        long id = integer(body, field);
        if (id < 1) throw new BadRequestException(field + " must be a positive integer.");
        return id;
    }
    private long version(JsonObject body) {
        long version = integer(body, "version");
        if (version < 0) throw new BadRequestException("Version must be non-negative.");
        return version;
    }
    private long integer(JsonObject body, String field) {
        if (body == null || !(body.get(field) instanceof JsonNumber number))
            throw new BadRequestException("Provide " + field + " as an integer.");
        try { return number.longValueExact(); }
        catch (ArithmeticException exception) { throw new BadRequestException(field + " must be an integer within range."); }
    }
    private JsonObjectBuilder summary(Complaint item) {
        JsonObjectBuilder result = Json.createObjectBuilder().add("id", item.getId())
                .add("cityId", item.getCityId()).add("residentName", item.getResidentName())
                .add("subject", item.getSubject()).add("severity", item.getSeverity().name())
                .add("status", item.getStatus().name()).add("version", item.getVersion())
                .add("createdAt", item.getCreatedAt().toString()).add("updatedAt", item.getUpdatedAt().toString());
        if (item.getZoneId() == null) result.addNull("zoneId"); else result.add("zoneId", item.getZoneId());
        if (item.getAssignedTo() == null) result.addNull("assignedTo"); else result.add("assignedTo", item.getAssignedTo().name());
        return result;
    }
    private JsonObject json(ComplaintService.Detail detail) {
        JsonArrayBuilder events = Json.createArrayBuilder();
        for (ComplaintEvent event : detail.history()) {
            events.add(Json.createObjectBuilder().add("id", event.getId()).add("type", event.getEventType())
                    .add("actor", event.getActor()).add("message", event.getMessage())
                    .add("occurredAt", event.getOccurredAt().toString()));
        }
        return summary(detail.complaint()).add("description", detail.complaint().getDescription())
                .add("zoneName", detail.zoneName()).add("history", events).build();
    }
}
