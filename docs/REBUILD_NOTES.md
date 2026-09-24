# Repository inspection and honest rebuild record

Inspected 25 September 2026, Asia/Kolkata. Target: https://github.com/SahilPtl/ScavengerHunt. Default branch: `main`. Previous tip: `13164647d79b1a61ae3c16f5f2ca04f0135f760e` (April 2025).

The previous `CampusQuest` was a TypeScript React/Express application with Leaflet, Passport sessions, team/chat/AR components and WebSockets. Its active `MemStorage` stored users, hunts and progress in JavaScript Maps; database-related dependencies did not make its actual game state persistent. WebSocket connections accepted a user ID from query parameters and checked existence rather than authenticating that identity. Progress messages carried client-provided checkpoint indexes. The seed admin password was plaintext, README was essentially empty, and development depended on Replit tooling. These are inspection findings, not claims that the old app was successfully run.

Reusable context: campus hunt idea, approximate campus-area coordinates, Leaflet concept, academic/library/sports themes. The new implementation is written from scratch in JavaScript, with newly authored clues and a new original SVG schematic. No old screenshots, generated icon, UI component library, credentials or personal contact details were copied into the new application.

Before removing old files, the original tip was pushed to `archive/pre-rebuild-2026-09-25`. The rebuild uses `rebuild/interview-ready`, normal dated commits, and a normal fast-forward delivery to main where allowed. No backdating or force-push is part of this workflow. A local PAT was checked through GitHub's `/user` and repository permissions; authenticated login and owner were `SahilPtl`. Repository-local author is `SahilPtl <SahilPtl@users.noreply.github.com>`.

## What to say honestly

“This is a September 2026 rebuild of my earlier campus-hunt prototype. The earlier version helped establish the interface and concept, but this version makes the persistence and multiplayer path concrete. I used AI assistance, inspected the generated code, and verified the critical rules with PostgreSQL/API tests and two browser sessions. I would not describe the rebuild as months of incremental development.”

The supplied resume establishes React/Node/PostgreSQL/Leaflet/REST/OpenAI as the project contract. The supplied campus Digital Engineering JD informed the guide's emphasis on fundamentals, HTTP/JSON, SQL, testing, Git, secure coding and deployment. Neither private reference PDF nor its personal contact information is stored in this repository.

## Campus sources

- [MNNIT official contact/location](https://www.mnnit.ac.in/index.php/contact-us) confirms MNNIT Allahabad in Prayagraj.
- [MNNIT library](https://mnnit.ac.in/index.php/institute/administration/bog/40-library) supports the library theme.
- [Student Activity Centre](https://sac.mnnit.ac.in/contact/) confirms the centre is on campus.

The six points are **illustrative**, informed by the old project's approximate campus area. Exact checkpoint coordinates were not independently surveyed or verified. The original schematic is not an official campus map and should not be used for real-world navigation. Online OSM tiles require their normal attribution and usage policy; no tiles are bundled or bulk-downloaded.
