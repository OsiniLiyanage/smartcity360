package lk.osini.smartcity360.config;

import jakarta.servlet.*;
import jakarta.servlet.annotation.WebListener;
import java.util.Set;

@WebListener
public class SessionConfiguration implements ServletContextListener {
    @Override public void contextInitialized(ServletContextEvent event) {
        var context=event.getServletContext();
        context.setSessionTrackingModes(Set.of(SessionTrackingMode.COOKIE)); context.setSessionTimeout(30);
        var cookie=context.getSessionCookieConfig(); cookie.setHttpOnly(true);
        // Loopback HTTP is used for local development. HTTPS deployments must set this property true.
        if (Boolean.getBoolean("smartcity360.secureCookies")) cookie.setSecure(true);
    }
}
