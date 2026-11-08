package lk.osini.smartcity360.resource;

import jakarta.inject.Inject;
import jakarta.json.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.*;
import lk.osini.smartcity360.entity.AppUser;
import lk.osini.smartcity360.security.*;
import lk.osini.smartcity360.service.AccountService;
import static lk.osini.smartcity360.resource.AccountJson.*;

@Path("auth") @Produces(MediaType.APPLICATION_JSON)
public class AuthResource {
    @Inject private AccountService accounts;
    @Inject private CurrentUser current;
    @Inject private LoginLimiter limiter;
    @Context private HttpServletRequest request;
    @GET @Path("session") public JsonObject session() {
        var result=Json.createObjectBuilder().add("csrfToken",SessionSupport.csrf(request));
        if(request.getSession().getAttribute("userId") instanceof Long id) result.add("user",user(accounts.find(id))); else result.addNull("user");
        return result.build();
    }
    @POST @Path("login") @Consumes(MediaType.APPLICATION_JSON) public JsonObject login(JsonValue payload) {
        limiter.attempt("login:"+request.getRemoteAddr(),20); var data=body(payload);
        String email=text(data,"email"),password=text(data,"password");
        if(email.length()>254 || password.length()>128)throw new BadRequestException("Email or password is too long.");
        AppUser user=accounts.authenticate(email,password); SessionSupport.login(request,user); return session();
    }
    @POST @Path("register") @Consumes(MediaType.APPLICATION_JSON) public Response register(JsonValue payload) {
        limiter.attempt("register:"+request.getRemoteAddr(),10); var data=body(payload);
        if(data.containsKey("role") || data.containsKey("cityId") || data.containsKey("enabled")) throw new BadRequestException("Public registration creates resident accounts only.");
        AppUser user=accounts.register(text(data,"email"),text(data,"displayName"),text(data,"password"));
        SessionSupport.login(request,user); return Response.status(201).entity(session()).build();
    }
    @POST @Path("logout") public JsonObject logout() { SessionSupport.logout(request); return Json.createObjectBuilder().add("signedOut",true).build(); }
    @PUT @Path("profile") @Consumes(MediaType.APPLICATION_JSON) public JsonObject profile(JsonValue payload) { return user(accounts.profile(text(body(payload),"displayName"))); }
    @PUT @Path("password") @Consumes(MediaType.APPLICATION_JSON) public JsonObject password(JsonValue payload) {
        limiter.attempt("password:"+current.get().getId(),10); var data=body(payload);
        accounts.password(text(data,"currentPassword"),text(data,"newPassword")); SessionSupport.logout(request);
        return Json.createObjectBuilder().add("signedOut",true).build();
    }
}
