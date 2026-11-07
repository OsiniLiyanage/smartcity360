package lk.osini.smartcity360.resource;

import jakarta.inject.Inject;
import jakarta.json.*;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.*;
import lk.osini.smartcity360.entity.LampSpecificationEntity;
import lk.osini.smartcity360.pattern.flyweight.LightColour;
import lk.osini.smartcity360.service.*;

@Path("/") @Produces(MediaType.APPLICATION_JSON)
public class StreetlightResource {
    @Inject private StreetlightService service;
    @Inject private FlyweightDemonstration demo;

    @GET @Path("lamp-specifications")
    public JsonArray specifications() {
        var result = Json.createArrayBuilder();
        for (var spec : service.specifications()) result.add(specification(spec));
        return result.build();
    }
    @POST @Path("lamp-specifications") @Consumes(MediaType.APPLICATION_JSON)
    public JsonObject saveSpecification(JsonValue payload) {
        JsonObject body = object(payload);
        LightColour colour;
        try { colour = LightColour.valueOf(text(body, "colour")); }
        catch (IllegalArgumentException exception) { throw new BadRequestException("Choose a valid light colour."); }
        long watts = integer(body, "ratedWatts");
        if (watts < 1 || watts > 1000) throw new BadRequestException("Rated watts must be 1 to 1000.");
        return specification(service.saveSpecification(text(body, "model"), (int) watts, colour));
    }
    @GET @Path("lamp-specifications/demo")
    public JsonObject demonstrate(@QueryParam("count") @DefaultValue("10000") int count) {
        var result = demo.run(count);
        return Json.createObjectBuilder().add("lights", result.lights())
                .add("sharedSpecifications", result.sharedSpecifications()).add("unsharedSpecifications", result.unsharedSpecifications())
                .add("avoidedSpecificationObjects", result.avoidedSpecificationObjects()).add("independentState", result.independentState())
                .add("elapsedMilliseconds", result.elapsedMilliseconds()).add("databaseRecordsCreated", 0).build();
    }
    @GET @Path("cities/{cityId}/streetlights")
    public JsonObject list(@PathParam("cityId") long cityId, @QueryParam("page") @DefaultValue("0") int page,
                           @QueryParam("pageSize") @DefaultValue("25") int pageSize) {
        var result = service.list(cityId, page, pageSize);
        var items = Json.createArrayBuilder();
        for (var item : result.items()) items.add(light(item));
        return Json.createObjectBuilder().add("items", items).add("page", page).add("pageSize", pageSize)
                .add("total", result.total()).add("on", result.on()).add("faulty", result.faulty())
                .add("ratedLoadWatts", result.ratedLoadWatts()).add("distinctSpecifications", result.distinctSpecifications())
                .add("pageSpecificationObjects", result.pageSpecificationObjects()).build();
    }
    @GET @Path("cities/{cityId}/streetlights/{id}")
    public JsonObject detail(@PathParam("cityId") long cityId, @PathParam("id") long id) { return light(service.detail(cityId, id)); }
    @POST @Path("cities/{cityId}/streetlights") @Consumes(MediaType.APPLICATION_JSON)
    public Response create(@PathParam("cityId") long cityId, JsonValue payload) {
        JsonObject body = object(payload);
        return Response.status(201).entity(light(service.create(cityId, positive(body, "streetId"), positive(body, "specificationId"),
                text(body, "label"), text(body, "location")))).build();
    }
    @PUT @Path("cities/{cityId}/streetlights/{id}") @Consumes(MediaType.APPLICATION_JSON)
    public JsonObject update(@PathParam("cityId") long cityId, @PathParam("id") long id, JsonValue payload) {
        JsonObject body = object(payload);
        long version = integer(body, "version");
        if (version < 0) throw new BadRequestException("Version must be non-negative.");
        return light(service.update(cityId, id, version, positive(body, "specificationId"), text(body, "label"), text(body, "location"),
                flag(body, "powerOn"), flag(body, "faulty"), body.containsKey("faultNote") ? text(body, "faultNote") : ""));
    }
    private JsonObject specification(LampSpecificationEntity spec) {
        return Json.createObjectBuilder().add("id", spec.getId()).add("model", spec.getModel())
                .add("ratedWatts", spec.getRatedWatts()).add("colour", spec.getColour().name()).build();
    }
    private JsonObject light(StreetlightService.View view) {
        var row = view.row(); var light = view.light(); var spec = light.getSpecification();
        return Json.createObjectBuilder().add("id", row.getId()).add("streetId", row.getStreetId())
                .add("label", row.getLabel()).add("location", light.getLocation()).add("specificationId", row.getSpecificationId())
                .add("model", spec.getModel()).add("ratedWatts", spec.getRatedWatts()).add("colour", spec.getColour().name())
                .add("powerOn", light.isPowerOn()).add("faulty", light.isFaulty()).add("faultNote", row.getFaultNote())
                .add("state", light.getState()).add("ratedLoadWatts", light.getRatedLoadWatts()).add("version", row.getVersion()).build();
    }
    private JsonObject object(JsonValue payload) {
        if (!(payload instanceof JsonObject body)) throw new BadRequestException("Provide a JSON object.");
        return body;
    }
    private String text(JsonObject body, String field) {
        if (!(body.get(field) instanceof JsonString value)) throw new BadRequestException("Provide " + field + " as text.");
        return value.getString();
    }
    private boolean flag(JsonObject body, String field) {
        if (body.get(field) != JsonValue.TRUE && body.get(field) != JsonValue.FALSE)
            throw new BadRequestException("Provide " + field + " as true or false.");
        return body.getBoolean(field);
    }
    private long integer(JsonObject body, String field) {
        if (!(body.get(field) instanceof JsonNumber number)) throw new BadRequestException("Provide " + field + " as an integer.");
        try { return number.longValueExact(); }
        catch (ArithmeticException exception) { throw new BadRequestException(field + " must be an integer within range."); }
    }
    private long positive(JsonObject body, String field) {
        long id = integer(body, field);
        if (id < 1) throw new BadRequestException(field + " must be positive.");
        return id;
    }
}
