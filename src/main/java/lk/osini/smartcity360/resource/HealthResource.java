package lk.osini.smartcity360.resource;

import jakarta.json.Json;
import jakarta.json.JsonObject;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;

@Path("/health")
public class HealthResource {

    // Confirms that the REST application responds; does not check the database.
    @GET
    @Produces(MediaType.APPLICATION_JSON)
    public JsonObject health() {
        return Json.createObjectBuilder()
                .add("application", "SmartCity360")
                .add("status", "UP")
                .build();
    }
}
