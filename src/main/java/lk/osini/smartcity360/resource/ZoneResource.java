package lk.osini.smartcity360.resource;

import jakarta.inject.Inject;
import jakarta.json.*;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import lk.osini.smartcity360.pattern.composite.ZoneComponent;
import lk.osini.smartcity360.pattern.composite.ZoneType;
import lk.osini.smartcity360.service.ZoneService;

@Path("/cities/{cityId}/zones")
@Produces(MediaType.APPLICATION_JSON)
public class ZoneResource {
    @Inject private ZoneService service;

    @GET
    public JsonObject tree(@PathParam("cityId") long cityId) { return json(service.tree(cityId)); }

    @POST @Consumes(MediaType.APPLICATION_JSON)
    public Response create(@PathParam("cityId") long cityId, JsonObject body) {
        String name = text(body, "name");
        ZoneType type;
        try { type = ZoneType.valueOf(text(body, "type")); }
        catch (IllegalArgumentException exception) { throw new BadRequestException("Choose a valid zone type."); }
        return Response.status(201).entity(json(service.create(cityId, optionalId(body, "parentId"), name, type))).build();
    }

    @PUT @Path("/{zoneId}/usage") @Consumes(MediaType.APPLICATION_JSON)
    public JsonObject usage(@PathParam("cityId") long cityId, @PathParam("zoneId") long zoneId, JsonObject body) {
        if (body == null || !(body.get("usageKwh") instanceof JsonNumber number)) {
            throw new BadRequestException("Provide a numeric usageKwh value.");
        }
        return json(service.usage(cityId, zoneId, number.bigDecimalValue()));
    }

    @PUT @Path("/power") @Consumes(MediaType.APPLICATION_JSON)
    public JsonObject power(@PathParam("cityId") long cityId, JsonObject body) {
        if (body == null || (body.get("powerOn") != JsonValue.TRUE && body.get("powerOn") != JsonValue.FALSE)) {
            throw new BadRequestException("Provide powerOn as true or false.");
        }
        return json(service.power(cityId, optionalId(body, "zoneId"), body.getBoolean("powerOn")));
    }

    private String text(JsonObject body, String field) {
        if (body == null || !(body.get(field) instanceof JsonString value)) {
            throw new BadRequestException("Provide " + field + " as text.");
        }
        return value.getString();
    }

    private Long optionalId(JsonObject body, String field) {
        if (!body.containsKey(field) || body.isNull(field)) return null;
        if (!(body.get(field) instanceof JsonNumber number)) throw new BadRequestException(field + " must be a positive integer.");
        try {
            long id = number.longValueExact();
            if (id <= 0) throw new ArithmeticException();
            return id;
        } catch (ArithmeticException exception) { throw new BadRequestException(field + " must be a positive integer."); }
    }

    private JsonObject json(ZoneComponent node) {
        JsonArrayBuilder children = Json.createArrayBuilder();
        for (ZoneComponent child : node.getChildren()) children.add(json(child));
        return Json.createObjectBuilder().add("id", node.getId()).add("name", node.getName())
                .add("type", node.getType().name()).add("usageKwh", node.getUsageKwh())
                .add("buildingCount", node.getBuildingCount()).add("poweredCount", node.getPoweredBuildingCount())
                .add("powerState", node.getPowerState()).add("children", children).build();
    }
}
