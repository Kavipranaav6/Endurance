# StockSense — Enterprise Inventory Management System

StockSense is an enterprise-grade Inventory Management System (ERP) designed to provide absolute traceability, auditability, and real-time operational visibility across warehouse networks. Built around an append-only stock ledger model inspired by Odoo's internal `stock.move` and `stock.quant` architecture, StockSense eliminates in-place quantity mutations, treating inventory tracking as a double-entry balance system.

---

## 1. Architectural Principles

### 1.1 Append-Only Stock Ledger
Traditional inventory systems update quantity values directly in product tables, leading to race conditions, lost audit trails, and reconciliation discrepancies. StockSense enforces an immutable ledger model:
- Every inventory event—whether an inbound supplier receipt, customer shipment, bin-to-bin transfer, or physical count discrepancy—writes an immutable record to the `StockMove` ledger.
- Once marked with the status `done` or `cancelled`, a ledger record cannot be modified or deleted.

### 1.2 Derived Inventory Engine
On-hand stock and free-to-use quantities are never stored as static counters. Instead, they are computed deterministically from historical ledger movements:
- **Inbound Receipts (`IN`):** Increase stock at the destination location upon validation.
- **Outbound Shipments (`OUT`):** Decrease stock at the source location upon validation.
- **Internal Transfers (`INTERNAL`):** Move inventory between locations while conserving company-wide totals.
- **Count Adjustments (`ADJUSTMENT`):** Account for shrinkage or surplus by generating offsetting ledger entries.

### 1.3 Real-Time WebSocket Synchronization
All state transitions and ledger writes are broadcast over a centralized WebSocket server (`/ws`). Connected clients receive instant updates for key performance indicators, Kanban boards, and stock level warnings without manual page reloads.

### 1.4 Monorepo Architecture
StockSense is structured as an integrated Turborepo monorepo:
- `apps/web`: React 19 single-page application built with Vite and Tailwind CSS.
- `apps/api`: Fastify backend exposing end-to-end type-safe tRPC routers and WebSocket handlers.
- `packages/schemas`: Shared Zod validation schemas ensuring uniform data validation across client and server boundaries.

---

## 2. Core Functional Modules

### 2.1 Executive Dashboard
- **Key Performance Indicators:** Immediate visibility into total cataloged products, low/out-of-stock items, pending receipts, pending dispatches, and scheduled internal movements.
- **Operational Quick-Action Panels:** Dual summary widgets for pending receipts ("To Receive") and deliveries ("To Deliver").
- **Dynamic Filtering:** Real-time filtering by document type, warehouse, storage zone, and lifecycle status.

### 2.2 Inbound Receipts Management
- Multi-line vendor receipt generation with automated reference assignment (`<WarehouseCode>/IN/<0001>`).
- Operational lifecycle progression: `Draft` -> `Ready` -> `Done`.
- Automated ledger entry generation upon validation, instantly increasing derived inventory.
- Printable Goods Receipt Voucher (GRV) with designated quality inspection sign-off blocks.

### 2.3 Outbound Delivery Orders
- Customer fulfillment and shipment tracking with sequential reference assignment (`<WarehouseCode>/OUT/<0001>`).
- Operational lifecycle progression: `Draft` -> `Waiting` -> `Ready` -> `Done`.
- Row-level inventory availability validation with inline warnings preventing invalid dispatch of unallocated stock.
- Printable Delivery Note with carrier and customer acknowledgment blocks.

### 2.4 Internal Transfers & Count Adjustments
- **Internal Bin Transfers:** Relocate items across warehouse aisles and shelves (`<WarehouseCode>/INT/<0001>`) with strict company-wide stock conservation.
- **Inventory Count Adjustments:** Floor audit interface allowing stock counters to submit physical counts against recorded figures. The engine calculates the variance and automatically commits a compensatory `ADJUSTMENT` ledger record.

### 2.5 Audit Trail & Move History
- Comprehensive tabular audit log detailing reference codes, movement types, product specifications, source and destination routes, partner contacts, quantities, and timestamps.
- Structured Kanban board view grouped by movement status.
- Overdue tracking: Items with scheduled dates preceding the current date are visually highlighted in alert status.
- Movement Detail Inspector for examining immutable ledger verification metadata.

### 2.6 Master Data & Settings Console
- **Warehouse Configuration:** Management of physical distribution centers, address metadata, and short codes.
- **Internal Location Mapping:** Hierarchical configuration of storage aisles, racks, and bin identifiers linked to parent warehouses.
- **Product Catalog:** Management of SKUs, names, categories, units of measure, and minimum reorder rules.
- **Opening Balance Provisioning:** Support for establishing verified opening inventory ledger entries during product onboarding.
- **Low Stock Monitoring:** Active alert tracking detecting items falling below reorder thresholds, linked directly to navigation pill indicators.

---

## 3. Technology Stack

| Layer | Technologies |
|---|---|
| **Monorepo Orchestration** | Turborepo, pnpm Workspaces |
| **Frontend Framework** | React 19, TypeScript, Vite |
| **Styling & Design System** | Tailwind CSS (Enterprise ERP token system), Lucide Icons |
| **Backend Runtime** | Node.js, Fastify, tsx |
| **API & Data Communication** | tRPC v10, WebSockets (`@fastify/websocket`) |
| **Schema Validation** | Zod (Shared across client and server packages) |
| **Database & Persistence** | PostgreSQL, Prisma ORM, In-Memory Ledger Engine fallback |
| **Authentication & Security** | HTTP-only Cookie JWT (Access & Refresh), Password Hashing |

---

## 4. Directory Structure

```text
Endurance/
├── apps/
│   ├── api/
│   │   ├── prisma/
│   │   │   └── schema.prisma          # Database schema definitions
│   │   └── src/
│   │       ├── lib/
│   │       │   ├── ledger/            # Core ledger engine and derived stock calculations
│   │       │   └── prisma.ts          # Database client configuration
│   │       ├── routers/               # tRPC routers (auth, ledger, dashboard, settings, etc.)
│   │       ├── index.ts               # Fastify server entry point
│   │       └── trpc.ts                # tRPC context and procedure definitions
│   └── web/
│       └── src/
│           ├── components/            # Reusable ERP UI components and modals
│           ├── lib/                   # API clients, authentication store, WebSocket hooks
│           ├── pages/                 # Full-screen module views (Dashboard, Receipts, etc.)
│           ├── App.tsx                # Application shell and route orchestration
│           └── main.tsx               # Client entry point
├── packages/
│   └── schemas/
│       └── src/                       # Shared validation contracts and TypeScript types
├── docs/                              # Project architecture, guidelines, and decision logs
├── package.json                       # Monorepo root configuration
├── pnpm-workspace.yaml                # pnpm workspace definition
├── turbo.json                         # Turborepo task pipeline configuration
└── README.md                          # Project documentation
```

---

## 5. Getting Started

### 5.1 Prerequisites
- **Node.js:** Version 20.x or higher
- **Package Manager:** `pnpm` (version 10.x recommended)

### 5.2 Installation
Clone the repository and install workspace dependencies:
```bash
git clone https://github.com/Kavipranaav6/Endurance.git
cd Endurance
pnpm install
```

### 5.3 Building the Workspaces
Compile the shared validation schemas, API server, and web application:
```bash
pnpm -r build
```

### 5.4 Running the Application
Start the development environment across all packages simultaneously:
```bash
pnpm dev
```

By default, the services will be accessible at:
- **Web Application:** `http://localhost:3000`
- **API Server:** `http://localhost:4000`
- **WebSocket Endpoint:** `ws://localhost:4000/ws`

### 5.5 Quality Verification
Execute linting and static type checking across the monorepo:
```bash
# Static type checking
pnpm typecheck

# Code formatting and linting
pnpm lint
```
