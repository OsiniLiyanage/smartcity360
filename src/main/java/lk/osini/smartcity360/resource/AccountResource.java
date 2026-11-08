package lk.osini.smartcity360.resource;

import jakarta.inject.Inject;
import jakarta.json.*;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.*;
import lk.osini.smartcity360.service.AccountService;
import static lk.osini.smartcity360.resource.AccountJson.*;

@Path("admin/accounts") @Produces(MediaType.APPLICATION_JSON)
public class AccountResource {
    @Inject private AccountService accounts;
    @GET public JsonObject list(@QueryParam("page") @DefaultValue("0") int page) {
        var result=accounts.list(page);var items=Json.createArrayBuilder();result.items().forEach(row->items.add(user(row)));
        return Json.createObjectBuilder().add("items",items).add("total",result.total()).add("page",page).add("pageSize",25).build();
    }
    @POST @Consumes(MediaType.APPLICATION_JSON) public Response create(JsonValue payload) {
        var data=body(payload);var issued=accounts.provision(text(data,"email"),text(data,"displayName"),role(data),city(data));
        return Response.status(201).entity(Json.createObjectBuilder().add("user",user(issued.user())).add("temporaryPassword",issued.temporaryPassword()).build()).build();
    }
    @PUT @Path("{id}") @Consumes(MediaType.APPLICATION_JSON) public JsonObject update(@PathParam("id") long id,JsonValue payload) {
        var data=body(payload);return user(accounts.update(id,number(data,"version"),role(data),city(data),enabled(data)));
    }
    @GET @Path("events") public JsonArray events() {
        var result=Json.createArrayBuilder();
        for(Object[] row:accounts.events()) {
            var item=Json.createObjectBuilder().add("id",((Number)row[0]).longValue()).add("targetId",((Number)row[2]).longValue())
                    .add("action",row[3].toString()).add("occurredAt",row[4].toString());
            if(row[1]==null)item.addNull("actorId");else item.add("actorId",((Number)row[1]).longValue());result.add(item);
        }
        return result.build();
    }
}
