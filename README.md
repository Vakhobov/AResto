# AResto

Restaurant management and ordering system built as a University Final Year Project.

## Features

- Role-based workflows for Admin, Kitchen, and Menu Management
- Restaurant orders, tables, shifts, and payments
- Atomic order creation with PostgreSQL functions
- Real-time order updates with Supabase Realtime
- Dashboard analytics
- QR/table-based ordering
- 3D/AR food visualization

## Tech Stack

React · TypeScript · Vite · Supabase · PostgreSQL · Firebase · Tailwind CSS · shadcn/ui

## Architecture

- React frontend with component-based architecture
- Supabase for database, authentication, RLS, and realtime features
- PostgreSQL functions for transactional business logic
- Service layer for order, table, payment, and restaurant operations

## Database

The project uses PostgreSQL with entities for branches, tables, shifts, orders, order items, menu items, and related restaurant data.

## Screenshots

Screenshots are available in [`docs/screenshots`](./docs/screenshots).

## Installation

```bash
npm install
npm run dev
```

Create the required environment variables based on `.env.example` before running the project.