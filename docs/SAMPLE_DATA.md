# Local sample data

## Complaints

Run `node scripts/seed-sample-complaints.mjs` to preview missing examples, then add `--apply` to save them. Requires the existing private `.local/simple-demo-accounts.json` configuration. Never commit that file.

The loader uses the existing administrator and resident accounts and five existing cities: Colombo, Kandy, Galle, Jaffna and Kurunegala. It creates four resident-owned cases per city: two assigned, one in progress and one resolved, spanning all three severity levels. Each has a public staff reply and genuine workflow history. Dates reflect when the loader ran, not invented historical dates. Areas remain city-wide.

It does not reset accounts, replace cities or edit existing complaints. Exact subjects within the resident's city queue prevent duplicate examples on a repeat run. If interrupted after a partial save, that case is retained and skipped on the next run; review it manually rather than overwriting subsequent user work. Do not run multiple loaders simultaneously.

Verified locally on 11 November 2026: 20 cases created, saved status and public reply read back as the owning resident. A second apply run created zero cases and preserved all 20. The database changes are immediately available to dashboards, queues and reports without deployment. Residents see their own cases; staff visibility follows existing city and authority-tier permissions. This is sample setup verification, not a full permissions regression.

Library energy meters already have saved readings from the earlier sample setup. Streetlight and policy sample coverage are the next steps.
