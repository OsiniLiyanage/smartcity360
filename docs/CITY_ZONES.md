# City zones explorer

The city zones workspace uses a folder-style explorer to browse the
city/district/street/building hierarchy one level at a time.

## Layout

- A city selector picks the active city and fetches its complete area tree.
- A clickable breadcrumb trail shows the current location path. Click any
  ancestor to jump back.
- The table lists only the immediate children of the current location.
  Districts and streets open like folders; buildings open in a details dialog.
- A search field filters the current level by name; pagination shows 25 rows
  per page.
- "Area details" opens a dialog for the current location with its usage total,
  building count and power state.

## Roles

- SYSTEM_ADMIN: add cities and areas, simulated power controls.
- CITY_MANAGER: add areas, simulated power controls.
- SUPERVISOR: add areas.
- LOCAL_STAFF: browse and view details, record building usage.
- RESIDENT: redirected by `auth.js`; the API also rejects resident access.

## Dialogs

- **Add city**: SYSTEM_ADMIN only. Creates a new city, refreshes the selector
  and navigates into it.
- **Add area**: SUPERVISOR and above. Creates a district, street or building
  inside the current location. The form heading and label dynamically reflect
  the child type.
- **Area details**: shows the selected area's recorded usage, building count,
  power state and powered-building proportion. For a building, the usage input
  appears. For areas with buildings, city managers and system admins see
  simulated power on/off controls.

## Model

`city-explorer-model.js` is a pure-function tree module exported as a UMD
global (`CityExplorerModel`) and a CommonJS module for Node testing.

- `key(node)` returns `TYPE:ID`, unique within a tree.
- `path(root, target)` returns an ancestor trail or null.
- `listing(node, search, page)` filters and paginates children.

## API endpoints used

All under the existing `api/cities` resource:

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/cities` | List visible cities |
| POST | `/api/cities` | Create a city |
| GET | `/api/cities/{id}/zones` | Full area tree |
| POST | `/api/cities/{id}/zones` | Add an area |
| PUT | `/api/cities/{id}/zones/{zoneId}/usage` | Save building usage |
| PUT | `/api/cities/{id}/zones/power` | Simulated power toggle |

## Files

| File | Purpose |
|------|---------|
| `src/main/webapp/index.html` | Page markup with breadcrumbs, table and three dialogs |
| `src/main/webapp/assets/js/cities.js` | Explorer interaction, navigation, API calls and feedback |
| `src/main/webapp/assets/js/city-explorer-model.js` | Pure tree model (UMD/CJS) |
| `src/main/webapp/assets/css/city-explorer.css` | Explorer-specific layout |
| `scripts/verify-city-explorer.cjs` | Five Node model tests |

## Verification

Run the model tests:

```
node scripts/verify-city-explorer.cjs
```

Browser acceptance checklist (still to complete for this revision): city selection, breadcrumb navigation into
districts/streets, building detail dialog, search filtering, pagination, add
city/area forms and role-based control visibility. Check both themes and a
phone viewport; narrow screens scroll the table horizontally without widening
the page. Confirm focus returns after closing each dialog and usage updates
refresh the ancestor totals.
