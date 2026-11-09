# Interface and theme configuration

SmartCity360 has two complete themes. Light mode uses light surfaces and dark text. Dark mode uses dark surfaces and light text. Lime is the shared action accent. The sidebar, dashboard cards, charts, forms, account pages and complaint controls use the same palette.

## Change the colors in one file

Edit `src/main/webapp/assets/css/themes.css`. It contains the light and dark values for all application color tokens. The main choices are:

| Token | Purpose |
|---|---|
| `--page` | Overall page background |
| `--surface`, `--surface-alt` | Panels, fields, sidebar and secondary surfaces |
| `--text`, `--muted` | Primary and supporting text |
| `--accent`, `--accent-hover`, `--accent-ink` | Primary buttons and selected navigation |
| `--accent-text`, `--accent-soft` | Readable accent text and subtle highlighted surfaces |
| `--line`, `--focus`, `--focus-halo` | Borders and keyboard/input focus |
| `--chart-track` | Unresolved segment of the status chart |
| `--danger`, `--warning`, `--success` and soft variants | Feedback states |
| `--image-shade`, `--image-line` | Image overlays and caption separators |

Keep `--accent-ink` readable against `--accent`. The current primary, muted, accent and error text pairs were measured above 4.5:1; this is a token check, not a complete WCAG certification. After recoloring, check both themes again, including text over imagery and focused/disabled fields.

`design.css` holds layout and component styles using those tokens. Tailwind remains responsible for existing spacing/grid utilities; the theme layer maps legacy color utilities to the application palette. Do not edit generated `app.css` directly. Run `npm run build:css` if changing Tailwind classes, then package/deploy the WAR. Theme-only palette changes do not need the Tailwind rebuild.

## Theme and navigation behavior

`theme.js` applies the theme before page content is drawn. It uses a saved browser choice or the operating system preference on a first visit. The switch saves `smartcity.theme` in local storage and synchronizes open tabs. If storage is unavailable, switching still works for the current page. No credentials are stored by this feature.

Every role gets Dashboard and Profile. The sidebar adds only permitted work sections. Desktop sidebar visibility is remembered separately. At widths of 800px or below it becomes a closed drawer, with a visible open button, backdrop, Escape handling, trapped keyboard focus and inactive background content while open. Main content has a skip link. Reduced-motion preferences remove animations.

The dashboard uses authorized complaint responses for counts, recent cases and the resolved percentage. Empty queues explicitly say there is no resolution rate. The numeric status list accompanies the ring chart. These are current-state metrics, not historical trend estimates. Selecting a city carries that context into the complaint links. Private records remain protected by Java, independently of the navigation.

## Image asset

`src/main/webapp/assets/images/city-evening.png` is a locally bundled original illustration used inside sign-in/signup and dashboard panels. No external image CDN is required. It is illustrative, not a photograph of a live city service or evidence of actual telemetry. It was created with the built-in image generation tool, then copied into the application.

Generation prompt: "Create a polished editorial architectural illustration for SmartCity360 municipal web application. Wide landscape 3:2 image. A believable contemporary tropical coastal city inspired by Colombo Sri Lanka, seen from a slightly elevated viewpoint: elegant mid-rise concrete buildings, a few taller towers in distance, leafy street trees, pedestrian pavement, warm street lamps, a bus and tiny people. Sophisticated hand-painted gouache and architectural visualization combination, tactile fine grain, refined shapes, restrained detail. Evening charcoal and deep olive atmosphere, pale ivory buildings, selective vibrant lime green #C6F432 in trees and reflections, warm white streetlights. Strong composition with foreground street curving toward skyline, depth and atmospheric sky. Premium urban magazine artwork, not cartoon game, no sci-fi, no holograms, no interface, no lettering, no logos, no watermarks. Actual image asset for a login visual and dashboard banner, NOT a screenshot or mockup."

The user's Kumo reference supplied visual inspiration only. No template purchase, copied source or new frontend framework was needed.

## Current product boundaries

The shared dashboards, themes and core complaint journey are implemented. Notifications, broader historical trend charts, printable operational reports and richer device maintenance workflows remain on the product roadmap. The assignment PDF, ZIP and video are still on hold.
