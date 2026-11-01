# Skillnest Campus Collab

Build a premium, modern and fully responsive web application called PeerNest.

Project title: Student Skill and Collaboration Management System Using Data Structures in C++.

Purpose: PeerNest helps college students find other students based on technical skills and collaboration requirements, such as project partners, hackathon teammates, study partners and placement preparation.

Design requirements:

1. Modern, professional SaaS-style interface.

2. Clean dashboard with a consistent design system.

3. Responsive desktop and mobile layouts.

4. Professional typography, spacing, animations and cards.

5. Attractive but not overly complicated design.

Create these pages:

1. Landing page with project introduction, features and navigation.

2. Student registration and login interface.

3. Student dashboard with profile information and recommended students.

4. Student directory with skill-based search and filters.

5. Student profile page displaying skills and availability.

6. Create Collaboration Requirement page.

7. Collaboration Requests page with pending, accepted and rejected requests.

8. DSA Architecture page explaining the actual data structures used.

Important technical constraints:

- Use React, TypeScript, HTML and CSS.

- Keep components modular and reusable.

- Do not implement the core DSA algorithms in JavaScript or TypeScript.

- The actual student indexing, matching and request-priority algorithms will be implemented separately in C++ and exposed through a Node.js API.

- Prepare clean API integration interfaces for connecting the frontend to that backend later.

- Do not fabricate successful backend operations or present mock data as persistent data.

- Do not unnecessarily generate a second backend or change the architecture.

- Keep the project easy to maintain and export to GitHub.

First build the complete frontend structure and visual experience. Do not attempt to claim the DSA implementation is complete.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://skillnest-campus-collab.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/ce6851f0-d0d3-4f7c-ad30-67ad5fc47532).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Run locally in VS Code on Windows (MSYS2 UCRT64)

Prerequisites (already at `C:\msys64\ucrt64\bin`): GCC, CMake, Ninja, GDB; plus Node.js 20+ for Windows.
The workspace `.vscode/settings.json` prepends that folder to the integrated terminal `PATH` (workspace only, not your global settings).

1. Open the project folder in VS Code.
2. **Terminal → Run Task → "Engine: test (ctest)"** — configures with Ninja, builds, and runs the C++ tests.
3. **Run Task → "Engine: run demo"** — prints skill search, recommendations and urgent-vs-normal ordering.
4. In a terminal: `cd server; npm install` (first time only), then **Run Task → "Server: test"** and **"Server: dev"**.
   The API listens on `http://localhost:4000/api` (`/api/health` should say `engine: ok`).
5. Copy `.env.frontend.example` to `.env.local` in the project root, then run `npm install` and `npm run dev` for the frontend.
   `VITE_PEERNEST_API_URL` must end in `/api`.

Without `VITE_PEERNEST_API_URL`, the web app shows a clearly labelled sample preview and saves nothing.
The published Lovable site has no backend until you deploy the API and set that variable.
