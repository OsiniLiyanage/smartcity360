package lk.osini.smartcity360.security;

import jakarta.servlet.http.*;
import lk.osini.smartcity360.entity.AppUser;
import java.security.MessageDigest;
import java.nio.charset.StandardCharsets;

public final class SessionSupport {
    private SessionSupport() { }
    public static String csrf(HttpServletRequest request) {
        HttpSession session = request.getSession(true);
        synchronized (session) {
            if (session.getAttribute("csrf") == null) session.setAttribute("csrf",PasswordHash.randomToken());
            return (String) session.getAttribute("csrf");
        }
    }
    public static boolean validCsrf(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        String actual = request.getHeader("X-CSRF-Token");
        if (session == null || actual == null || actual.length() > 128 || !(session.getAttribute("csrf") instanceof String expected)) return false;
        return MessageDigest.isEqual(actual.getBytes(StandardCharsets.UTF_8),expected.getBytes(StandardCharsets.UTF_8));
    }
    public static void login(HttpServletRequest request, AppUser user) {
        logout(request); HttpSession session = request.getSession(true); session.setMaxInactiveInterval(1800);
        session.setAttribute("userId",user.getId()); session.setAttribute("securityVersion",user.getSecurityVersion());
        session.setAttribute("signedInAt",System.currentTimeMillis()); session.setAttribute("csrf",PasswordHash.randomToken());
    }
    public static void logout(HttpServletRequest request) { HttpSession session=request.getSession(false); if(session!=null) session.invalidate(); }
}
