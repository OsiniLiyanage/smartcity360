# Profile and appearance configuration

Apply database migrations 010 and 011 before deploying this version. The database setup script discovers both automatically. Existing rows are preserved.

## Appearance

`assets/css/refinements.css` is the final screen appearance layer, loaded by `assets/js/theme.js` after the existing design styles. Its light and dark token sets override `themes.css`. Change those token sets to recolor the interface. The sidebar font selector offers Segoe UI, Trebuchet and Arial, using installed system fonts without a CDN. Its selection and the theme are remembered in browser storage.

Desktop navigation collapses to a 76-pixel icon rail over 450 milliseconds. At 800 pixels and below it becomes a drawer. Reduced-motion preferences disable the transition. The application mark and browser favicon use `assets/images/app-icon.svg`.

## Profiles and validation

Authenticated users can update their own username, phone and photograph through `PUT api/auth/profile-details`. Submit all three string fields; an empty value clears the optional field.

- Username: 3-30 ASCII letters, digits or underscores, beginning with a letter. Stored lowercase and unique regardless of case. Email remains the sign-in identifier.
- Phone: 7-15 digits, optionally preceded by `+`.
- Browser photograph input: JPEG, PNG or WebP, at most 5 MB. The browser crops and resizes it to a 192-pixel square JPEG.
- API photograph: a valid JPEG data URL, at most 100,000 characters and 512 by 512 pixels. The server decodes and checks the image, rather than trusting the declared MIME type.
- Passwords: 8-128 characters. Existing email, display-name, confirmation and complaint validation remains in place.

Validation runs in both browser controls and Java for the new stored fields. Duplicate usernames return HTTP 409; invalid input returns HTTP 400. Profile updates affect only the signed-in account. Password hashing and session invalidation are unchanged.

## Role navigation

Every role has Dashboard, Profile, Complaints and Reports. Staff additionally receive their relevant city operations. Administrators receive city setup, lighting configuration and account administration. Complaint submission is resident-only in both the page and Java authorization. Existing complaint privacy, city/tier boundaries and work-action permissions remain enforced by Java.

Navigation visibility does not replace server authorization or revoke otherwise authorized operational endpoints.

## Demonstration cities

`city.archived` hides older demonstration cities from the global city selector without deleting records. Staff assigned to an archived city can still access that city, preserving their saved work. Existing direct record access continues to use the established role rules. New cities default to visible. Archiving is currently a database maintenance operation, not a new UI feature.

Demo account credentials, local seed/reset scripts and database backups are deliberately excluded from version control. The shared local demonstration password is not a production default and is not installed by a migration.
