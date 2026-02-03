# AHSP Estimator WBS

Production-ready web app for AHSP/AHS-based estimation and WBS BOQ for mining road projects (Konawe) aligned with Indonesian SNI / Permen PUPR AHSP standards.

## Features
- Project setup with OH%, Profit%, Contingency%, PPN%, fuel escalation.
- WBS tree (Level 1-5) with rollup quantities, search, and edit panel.
- AHSP engine per activity (materials, labor, equipment) with markup and line total.
- Price masters for Konawe with auto-fill in AHSP editor.
- Copy AHSP to multiple WBS items.
- Import WBS from CSV/Excel and export BOQ/AHSP to Excel + PDF summary.
- Audit logging for project, WBS, AHSP, and master changes.

## Tech Stack
- Frontend: React + TypeScript + Vite + Tailwind
- Backend: Node.js (Express) + TypeScript
- Database: MySQL
- Auth: JWT (Admin/Estimator/Viewer)
- Local dev: Docker Compose

## Local Development (Docker)
```bash
docker compose up --build
```
Services:
- Client: http://localhost:5173
- API: http://localhost:4000
- MySQL: localhost:3306

## Bootstrap Admin User
On first run, create the initial admin via:
```bash
curl -X POST http://localhost:4000/auth/bootstrap \
  -H "Content-Type: application/json" \
  -d '{"name":"Admin","email":"admin@ahsp.local","password":"password123","role":"Admin"}'
```
Then log in from the UI with `admin@ahsp.local / password123` and create other users using `/auth/register` (admin-only).

## API Endpoints
- `POST /auth/login`
- `POST /auth/register` (admin only)
- `POST /auth/bootstrap` (first admin only)
- `CRUD /projects`
- `CRUD /projects/:id/wbs` and `/wbs/:id`
- `GET/POST /wbs/:id/ahsp` and `POST /wbs/:id/ahsp/copy`
- `CRUD /masters/materials`, `/masters/labor`, `/masters/equipment`
- `POST /import/wbs`
- `GET /export/boq.xlsx`, `/export/ahsp.xlsx`, `/export/report.pdf`

## Environment Variables
`server/.env.example`:
- `PORT`
- `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_PORT`
- `JWT_SECRET`

## Seed Data
- Default project: **Konawe Mining Road - Paket A**
- WBS template list per specification
- Sample master price rows and AHSP example

## Exports
- BOQ summary Excel includes WBS code, quantity, unit rate, and totals.
- AHSP Excel creates one sheet per WBS item.
- PDF report prints BOQ summary with Indonesian number formatting.

## Sample Screenshots
> Add screenshots after running the app locally.

## Tests
```bash
cd server
npm run test
```

