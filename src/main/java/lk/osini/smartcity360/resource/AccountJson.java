package lk.osini.smartcity360.resource;

import jakarta.json.*;
import jakarta.ws.rs.BadRequestException;
import lk.osini.smartcity360.entity.AppUser;
import lk.osini.smartcity360.security.Role;

final class AccountJson {
    private AccountJson() { }
    static JsonObject user(AppUser user) {
        var json=Json.createObjectBuilder().add("id",user.getId()).add("email",user.getEmail()).add("displayName",user.getDisplayName())
                .add("role",user.getRole().name()).add("enabled",user.isEnabled()).add("passwordChangeRequired",user.isPasswordChangeRequired())
                .add("version",user.getVersion()).add("createdAt",user.getCreatedAt().toString());
        if(user.getCityId()==null) json.addNull("cityId"); else json.add("cityId",user.getCityId()); return json.build();
    }
    static JsonObject body(JsonValue value) { if(!(value instanceof JsonObject body))throw new BadRequestException("Provide a JSON object.");return body; }
    static String text(JsonObject body,String field) { if(!(body.get(field) instanceof JsonString value))throw new BadRequestException("Provide "+field+" as text.");return value.getString(); }
    static long number(JsonObject body,String field) {
        if(body.get(field) instanceof JsonNumber value) try {long result=value.longValueExact();if(result>=0)return result;}catch(ArithmeticException ignored){}
        throw new BadRequestException("Provide a non-negative integer for "+field+".");
    }
    static Long city(JsonObject body) { return !body.containsKey("cityId")||body.isNull("cityId")?null:number(body,"cityId"); }
    static Role role(JsonObject body) { try{return Role.valueOf(text(body,"role"));}catch(IllegalArgumentException error){throw new BadRequestException("Choose a valid role.");} }
    static boolean enabled(JsonObject body) {
        if(body.get("enabled")!=JsonValue.TRUE && body.get("enabled")!=JsonValue.FALSE)throw new BadRequestException("Provide enabled as true or false.");return body.getBoolean("enabled");
    }
}
