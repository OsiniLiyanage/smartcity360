package lk.osini.smartcity360.resource;

import jakarta.inject.Inject;
import jakarta.json.Json;
import jakarta.json.JsonArrayBuilder;
import jakarta.json.JsonObject;
import jakarta.json.JsonValue;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import lk.osini.smartcity360.entity.City;
import lk.osini.smartcity360.service.CityService;

@Path("/cities")
@Produces(MediaType.APPLICATION_JSON)
public class CityResource {
    @Inject
    private CityService cityService;

    @GET
    public JsonValue list() {
        JsonArrayBuilder cities = Json.createArrayBuilder();
        for (City city : cityService.list()) {
            cities.add(toJson(city));
        }
        return cities.build();
    }

    @POST
    @Consumes(MediaType.APPLICATION_JSON)
    public Response create(JsonObject input) {
        if (input == null || !input.containsKey("name")
                || input.get("name").getValueType() != JsonValue.ValueType.STRING) {
            return invalid("Provide a city name as text.");
        }
        try {
            City city = cityService.create(input.getString("name"));
            return Response.status(Response.Status.CREATED).entity(toJson(city)).build();
        } catch (IllegalArgumentException exception) {
            return invalid(exception.getMessage());
        }
    }

    private JsonObject toJson(City city) {
        return Json.createObjectBuilder().add("id", city.getId()).add("name", city.getName()).build();
    }

    private Response invalid(String message) {
        return Response.status(Response.Status.BAD_REQUEST)
                .entity(Json.createObjectBuilder().add("error", message).build()).build();
    }
}
