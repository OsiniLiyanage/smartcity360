# Local sample data

## Complaints

Run `node scripts/seed-sample-complaints.mjs` to preview missing examples, then add `--apply` to save them. Requires the existing private `.local/simple-demo-accounts.json` configuration. Never commit that file.

The loader uses the existing administrator and resident accounts and five existing cities: Colombo, Kandy, Galle, Jaffna and Kurunegala. It creates four resident-owned cases per city: two assigned, one in progress and one resolved, spanning all three severity levels. Each has a public staff reply and genuine workflow history. Dates reflect when the loader ran, not invented historical dates. Areas remain city-wide.

It does not reset accounts, replace cities or edit existing complaints. Exact subjects within the resident's city queue prevent duplicate examples on a repeat run. If interrupted after a partial save, that case is retained and skipped on the next run; review it manually rather than overwriting subsequent user work. Do not run multiple loaders simultaneously.

Verified locally on 11 November 2026: 20 cases created, saved status and public reply read back as the owning resident. A second apply run created zero cases and preserved all 20. The database changes are immediately available to dashboards, queues and reports without deployment. Residents see their own cases; staff visibility follows existing city and authority-tier permissions. This is sample setup verification, not a full permissions regression.

## City operations

Preview with `node scripts/seed-city-operations.mjs`, then use `--apply`. Uses the same private account configuration and locally retained meter credentials. Existing matching light labels and policy names are skipped. Interrupted partial records are retained for manual review; do not run concurrent loaders.

Added across five active cities: 20 streetlights, 10 policies, 20 policy evaluation results and nine additional library readings. Lights include healthy, faulty and switched-off examples. Each library meter now has three readings. These are current-time observations with unchanged usage, not a fabricated historical energy trend. Policy observations include both outcomes. A repeat run preserved all existing examples.

The initial off-light update in Colombo rejected a null fault note; the loader now supplies an empty string. That already-created light was preserved as on, so Colombo has three on lights and one fault; the other cities have two on, one off and one fault. No repair history is invented: the current streetlight schema only stores its present fault note.

The five active city names had their `(demo)` suffix removed after a local database backup. Archived test records remain unchanged. No new sample record names contain that suffix.

Exact database audit after setup: all 12 application tables are populated (including older retained records): 39 cities, 69 zones, 13 accounts, 33 account events, 54 complaints, 235 complaint events, nine lamp specifications, 28 streetlights, eight meters, 34 readings, 19 policies and 39 evaluations. Only five cities are active in the workspace. These counts document this local checkpoint, not a guarantee for another installation.
