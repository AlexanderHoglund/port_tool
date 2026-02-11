# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
npm run dev       # Start dev server (Turbopack) at localhost:3000
npm run build     # Production build — always run after changes to verify
npm run lint      # ESLint 9 with Next.js config
```

No test runner is configured. Verify changes with `npm run build`.

## Architecture Overview

**PIECE Tool** (Port Infrastructure for Electric & Clean Energy) — a Next.js 16 App Router application that models port electrification scenarios: equipment conversion (diesel → electric), shore power (OPS) infrastructure, charger sizing, grid infrastructure, and financial analysis (CAPEX/OPEX/payback).

### Tech Stack
- Next.js 16.1.6 (App Router, Turbopack), React 19, TypeScript 5 (strict)
- Tailwind CSS 4, Recharts for charts
- Supabase (PostgreSQL) for assumptions data and saved scenarios
- Path alias: `@/*` → `./*`

### Data Flow

1. **User inputs** port/terminal configuration on `/piece` dashboard
2. Dashboard calls `POST /api/piece/calculate` with `PieceCalculationRequest`
3. API route loads assumptions from 5 Supabase tables + applies custom overrides
4. `calculatePortPiece()` in `lib/piece-engine.ts` runs throughput-based calculations
5. Returns `PiecePortResult` with per-terminal and aggregated metrics

### Key Directories

- **`lib/piece-engine.ts`** — Core calculation engine (~1100 lines). Throughput-based: `kWh/TEU × annual_TEU`, not `hours × kW`. Equipment, OPS, chargers, grid, port services calculations.
- **`lib/types.ts`** — All TypeScript types: input configs, DB row types, calculation results (~750 lines).
- **`lib/load-assumptions.ts`** — Loads 5 PIECE tables from Supabase, merges with `piece_assumption_overrides`.
- **`lib/assumption-hash.ts`** — Fingerprinting system: hashes all overrides to detect stale results.
- **`app/piece/context/PieceContext.tsx`** — Global React context: port, terminals, results, stale detection, assumption fingerprint tracking.
- **`app/piece/page.tsx`** — Main dashboard: multi-terminal editor with collapsible sections.
- **`app/piece/assumptions/page.tsx`** — Editable assumptions table with override system.
- **`components/shipping/`** — All UI components for terminal configuration and results display.

### Supabase Tables

| Table | Purpose | Row Key |
|-------|---------|---------|
| `piece_equipment` | Equipment specs (CAPEX, OPEX, kWh/TEU, peak kW) | `equipment_key` |
| `piece_evse` | Charger specs (power, cost, sharing factor) | `evse_key` |
| `piece_fleet_ops` | Vessel segments & OPS parameters | `vessel_segment_key` |
| `piece_grid` | Substation, cable, voltage specs | `component_key` |
| `economic_assumptions` | Prices, emission factors, discount rates | `assumption_key` |
| `piece_assumption_overrides` | Custom overrides per profile/table/row/column | composite key |
| `piece_saved_ports` | Saved port scenarios (JSONB) | `id` |

### Assumption Override Pattern (Bidirectional Sync)

Dashboard and Assumptions tab share data through `piece_assumption_overrides`. Pattern used by `PortServicesSection`, `BaselineEquipmentTable`, `ScenarioEquipmentTable`:

1. Component fetches DB defaults + overrides on mount
2. Re-fetches when `currentAssumptionFingerprint` changes (assumption tab edited something)
3. On user edit (blur): upsert override if value differs from default, delete if matches default
4. Call `refreshAssumptionFingerprint()` after save to notify other components
5. Use string state for number inputs (save on blur) to avoid the "0 prefix" bug

### Terminal Types
- **Container** — TEU-based throughput, full equipment set
- **Cruise** — Passenger-based (limited equipment)
- **RoRo** — CEU-based (Terminal Tractor + Reach Stacker only)

### Equipment Categories
- **Grid-powered** (always electric): MHC, STS, RMG, RTG, ASC, Reefer
- **Battery-powered** (diesel or electric): AGV, TT, ECH, RS, SC

## Supabase Project

Project ID: `lcjyljfsrvxtcaxlzccg`. Use Supabase MCP tools for schema changes (`apply_migration`) and data queries (`execute_sql`).

## Reference Excel Model

The calculation logic in `lib/piece-engine.ts` is based on the Excel model at `../20260204_PIECE_tool_analysis.xlsx`. This file contains:

- **DOCUMENTATION sheet** — Entity definitions, formula explanations, and data flow descriptions
- **DB_EQUIPMENT** — Source of truth for all equipment specs (CAPEX, OPEX, kWh/TEU, peak kW, l/TEU, MPH, ratios, charger sharing factors)
- **DB_FLEET** — Vessel segment parameters (OPS power, berth hours, fuel consumption, tug/pilot requirements)
- **DB_GRID** — Grid infrastructure cost models (substations, cables, voltage levels)
- **DB_BUSINESS_CASE** — Economic assumptions (diesel price, electricity price, emission factors, maintenance saving)
- **MD_TERMINAL_B / MD_TERMINAL_1** — Calculation methodology sheets showing baseline and scenario terminal computations
- **MD_GRID_B / MD_GRID_1** — Grid infrastructure calculation methodology
- **MD_FLEET** — Fleet operations calculation methodology
- **STATIC_DATA** — Constants (engine efficiency 0.45, battery efficiency 0.95, diesel energy density 9.7 kWh/l, etc.)

Key formula: `l/TEU = kWh/TEU / diesel_energy_density / engine_efficiency` (i.e., `kWh/TEU / 9.7 / 0.45`).

**IMPORTANT**: This Excel file is the authoritative source for all calculation logic, formulas, and database values. You MUST read and reference it when:
- Planning or implementing any calculation changes in `piece-engine.ts`
- Adding or modifying Supabase table data or schema
- Verifying that computed results are correct
- Making decisions about formula methodology or data relationships
- Adding new equipment types, vessel segments, or grid components

Always extract the relevant data from the Excel file first before writing or modifying engine code. Do not assume values — verify against the spreadsheet.

## Design Playbook

All design and layout decisions should reference the MMMC Design Playbook at `../MMMC_Design-Playbook_Final.pdf` (278 pages). This PDF defines the visual identity, color palette, typography, component styles, and layout patterns used throughout the application. When making UI changes — colors, spacing, fonts, card styles, chart styling, or page layouts — consult this document first.

## Important Patterns

- **Berths use `vessel_calls` array** — each berth can have multiple vessel types with independent annual calls and avg hours. Old saved data is auto-migrated in `PieceContext.loadScenario()`.
- **Equipment specs come from DB** — the hardcoded `PIECE_EQUIPMENT` array in UI components provides structural metadata (key, name, category, terminal types) only; numeric values (CAPEX, OPEX, kWh/TEU, peak kW) are fetched from `piece_equipment` table with overrides.
- **Engine reads merged assumptions** — `load-assumptions.ts` fetches all tables and applies overrides before passing to the engine. The engine never queries Supabase directly.
- **Stale result detection** — When assumptions change (fingerprint mismatch), results are automatically cleared. When inputs change, results are marked stale (yellow banner).
