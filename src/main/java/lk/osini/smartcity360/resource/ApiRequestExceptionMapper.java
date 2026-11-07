package lk.osini.smartcity360.resource;

import jakarta.json.Json;
import jakarta.ws.rs.WebApplicationException;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.ext.ExceptionMapper;
import jakarta.ws.rs.ext.Provider;

@Provider
public class ApiRequestExceptionMapper implements ExceptionMapper<WebApplicationException> {
    @Override public Response toResponse(WebApplicationException exception) {
        int status = exception.getResponse().getStatus();
        String message = status < 500 ? exception.getMessage() : "The request could not be completed.";
        if (message == null) message = "The request could not be completed.";
        return Response.fromResponse(exception.getResponse()).type(MediaType.APPLICATION_JSON)
                .entity(Json.createObjectBuilder().add("error", message).build()).build();
    }
}
