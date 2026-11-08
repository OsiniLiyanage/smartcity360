package lk.osini.smartcity360.resource;

import jakarta.inject.Inject;
import jakarta.json.*;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import lk.osini.smartcity360.pattern.composite.ZoneComponent;
import lk.osini.smartcity360.service.ZoneService;

/** Location choices for reporting an issue, without private consumption or power details. */
@Path("/cities/{cityId}/areas") @Produces(MediaType.APPLICATION_JSON)
public class AreaResource {
    @Inject private ZoneService zones;
    @GET public JsonObject tree(@PathParam("cityId") long cityId) { return area(zones.tree(cityId)); }
    private JsonObject area(ZoneComponent node) {
        var children=Json.createArrayBuilder();node.getChildren().forEach(child->children.add(area(child)));
        return Json.createObjectBuilder().add("id",node.getId()).add("name",node.getName()).add("type",node.getType().name()).add("children",children).build();
    }
}
