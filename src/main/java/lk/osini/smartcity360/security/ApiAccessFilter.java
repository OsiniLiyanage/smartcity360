package lk.osini.smartcity360.security;

import jakarta.annotation.Priority;
import jakarta.inject.Inject;
import jakarta.servlet.http.*;
import jakarta.ws.rs.*;
import jakarta.ws.rs.container.*;
import jakarta.ws.rs.core.*;
import jakarta.ws.rs.ext.Provider;
import lk.osini.smartcity360.entity.AppUser;
import lk.osini.smartcity360.service.AccountService;

@Provider @Priority(Priorities.AUTHENTICATION)
public class ApiAccessFilter implements ContainerRequestFilter, ContainerResponseFilter {
    @Context private HttpServletRequest request;
    @Context private ResourceInfo resource;
    @Inject private AccountService accounts;
    @Inject private CurrentUser current;
    @Override public void filter(ContainerRequestContext context) {
        String operation=resource.getResourceClass().getSimpleName()+"."+resource.getResourceMethod().getName();
        HttpSession session=request.getSession(false);
        AppUser user=null;
        if(session!=null && session.getAttribute("userId") instanceof Long id) {
            user=accounts.find(id);
            boolean valid=user!=null && user.isEnabled() && Long.valueOf(user.getSecurityVersion()).equals(session.getAttribute("securityVersion"))
                    && session.getAttribute("signedInAt") instanceof Long time && System.currentTimeMillis()-time < 8*60*60*1000L;
            if(!valid) { SessionSupport.logout(request); user=null; }
        }
        if(user!=null) current.set(user);
        if(!AccessRules.isPublic(operation)) {
            if(user==null) throw new NotAuthorizedException("Sign in to continue.");
            if(user.isPasswordChangeRequired() && !operation.equals("AuthResource.password") && !operation.equals("AuthResource.logout") && !operation.equals("AuthResource.profile"))
                throw new ForbiddenException("Change your temporary password in Account before continuing.");
            if(!AccessRules.allowed(user.getRole(),operation)) throw new ForbiddenException("Your role cannot perform this action.");
            String city=context.getUriInfo().getPathParameters().getFirst("cityId");
            if(city!=null) { try { current.requireCity(Long.parseLong(city)); } catch(NumberFormatException error) { throw new BadRequestException("Invalid city."); } }
        }
        if(!context.getMethod().equals("GET") && !context.getMethod().equals("HEAD") && !SessionSupport.validCsrf(request))
            throw new ForbiddenException("Your session security token is missing or expired. Refresh and try again.");
    }
    @Override public void filter(ContainerRequestContext request, ContainerResponseContext response) {
        response.getHeaders().putSingle("Cache-Control","no-store");
        response.getHeaders().putSingle("X-Content-Type-Options","nosniff");
    }
}
