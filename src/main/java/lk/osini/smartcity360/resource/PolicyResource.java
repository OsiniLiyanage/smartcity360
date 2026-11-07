package lk.osini.smartcity360.resource;

import jakarta.inject.Inject;
import jakarta.json.*;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.*;
import lk.osini.smartcity360.entity.*;
import lk.osini.smartcity360.pattern.interpreter.*;
import lk.osini.smartcity360.service.PolicyService;
import java.math.BigDecimal;
import java.util.HashMap;

@Path("/") @Produces(MediaType.APPLICATION_JSON)
public class PolicyResource {
    @Inject private PolicyService service;

    @POST @Path("policy-language/validate") @Consumes(MediaType.APPLICATION_JSON)
    public JsonObject validate(JsonValue payload) {
        var parsed = service.parse(text(object(payload), "expression"));
        return structure(parsed).add("valid", true).build();
    }
    @GET @Path("cities/{cityId}/policies")
    public JsonObject list(@PathParam("cityId") long cityId, @QueryParam("page") @DefaultValue("0") int page,
                           @QueryParam("pageSize") @DefaultValue("25") int size) {
        var result = service.list(cityId, page, size); var items = Json.createArrayBuilder();
        result.items().forEach(row -> items.add(policy(row)));
        return Json.createObjectBuilder().add("items", items).add("total", result.total()).add("page", page).add("pageSize", size).build();
    }
    @GET @Path("cities/{cityId}/policies/{id}")
    public JsonObject detail(@PathParam("cityId") long cityId, @PathParam("id") long id) { return policy(service.detail(cityId, id)); }
    @POST @Path("cities/{cityId}/policies") @Consumes(MediaType.APPLICATION_JSON)
    public Response create(@PathParam("cityId") long cityId, JsonValue payload) {
        var body = object(payload);
        var row = service.create(cityId, text(body,"name"), text(body,"category"), text(body,"expression"), text(body,"trueMeaning"), flag(body,"active"));
        return Response.status(201).entity(policy(row)).build();
    }
    @PUT @Path("cities/{cityId}/policies/{id}") @Consumes(MediaType.APPLICATION_JSON)
    public JsonObject update(@PathParam("cityId") long cityId, @PathParam("id") long id, JsonValue payload) {
        var body = object(payload);
        return policy(service.update(cityId, id, integer(body,"version",0), text(body,"name"), text(body,"category"),
                text(body,"expression"), text(body,"trueMeaning"), flag(body,"active")));
    }
    @POST @Path("cities/{cityId}/policies/{id}/evaluations") @Consumes(MediaType.APPLICATION_JSON)
    public Response evaluate(@PathParam("cityId") long cityId, @PathParam("id") long id, JsonValue payload) {
        var body = object(payload); var observations = object(body.get("observations"));
        var values = new HashMap<String, BigDecimal>();
        for (var entry : observations.entrySet()) {
            if (!(entry.getValue() instanceof JsonNumber number)) throw new BadRequestException("Observation " + entry.getKey() + " must be a number.");
            values.put(entry.getKey(), number.bigDecimalValue());
        }
        PolicyContext context;
        try { context = new PolicyContext(values); }
        catch (IllegalArgumentException error) { throw new BadRequestException(error.getMessage()); }
        var result = service.evaluate(cityId, id, integer(body,"version",0), integer(body,"zoneId",1), context,
                body.containsKey("note") ? text(body,"note") : "");
        return Response.status(201).entity(evaluation(result)).build();
    }
    @GET @Path("cities/{cityId}/policies/{id}/evaluations")
    public JsonObject history(@PathParam("cityId") long cityId, @PathParam("id") long id,
                              @QueryParam("page") @DefaultValue("0") int page, @QueryParam("pageSize") @DefaultValue("25") int size) {
        var result = service.history(cityId, id, page, size); var items = Json.createArrayBuilder();
        result.items().forEach(row -> items.add(evaluation(row)));
        return Json.createObjectBuilder().add("items", items).add("total", result.total()).add("page", page).add("pageSize", size).build();
    }
    private JsonObject policy(Policy row) {
        return structure(service.parse(row.getExpression())).add("id", row.getId()).add("cityId", row.getCityId())
                .add("name", row.getName()).add("category", row.getCategory()).add("expression", row.getExpression())
                .add("trueMeaning", row.getTrueMeaning()).add("active", row.isActive()).add("version", row.getVersion())
                .add("updatedAt", row.getUpdatedAt().toString()).build();
    }
    private JsonObjectBuilder structure(PolicyParser.Parsed parsed) {
        var fields = Json.createArrayBuilder(); parsed.root().fields().stream().sorted().forEach(fields::add);
        return Json.createObjectBuilder().add("grouping", parsed.root().describe()).add("requiredFields", fields);
    }
    private JsonObject evaluation(PolicyEvaluation row) {
        var observations = Json.createObjectBuilder();
        if (row.getNoise() != null) observations.add("noise", row.getNoise());
        if (row.getHour() != null) observations.add("hour", row.getHour());
        if (row.getParkingMinutes() != null) observations.add("parkingMinutes", row.getParkingMinutes());
        return Json.createObjectBuilder().add("id",row.getId()).add("cityId",row.getCityId()).add("policyId",row.getPolicyId())
                .add("zoneId",row.getZoneId()).add("policyVersion",row.getPolicyVersion()).add("policyName",row.getPolicyName())
                .add("category",row.getCategory()).add("expression",row.getExpression()).add("trueMeaning",row.getTrueMeaning())
                .add("observations",observations).add("matched",row.isMatched()).add("outcome",row.getOutcome())
                .add("note",row.getNote()).add("evaluatedAt",row.getEvaluatedAt().toString()).build();
    }
    private JsonObject object(JsonValue value) {
        if (!(value instanceof JsonObject body)) throw new BadRequestException("Provide a JSON object."); return body;
    }
    private String text(JsonObject body, String field) {
        if (!(body.get(field) instanceof JsonString value)) throw new BadRequestException("Provide " + field + " as text."); return value.getString();
    }
    private boolean flag(JsonObject body, String field) {
        if (body.get(field) != JsonValue.TRUE && body.get(field) != JsonValue.FALSE) throw new BadRequestException("Provide " + field + " as true or false.");
        return body.getBoolean(field);
    }
    private long integer(JsonObject body, String field, long minimum) {
        if (!(body.get(field) instanceof JsonNumber value)) throw new BadRequestException("Provide " + field + " as an integer.");
        try { long result = value.longValueExact(); if (result >= minimum) return result; }
        catch (ArithmeticException ignored) { }
        throw new BadRequestException(field + " must be an integer of at least " + minimum + " within range.");
    }
}
