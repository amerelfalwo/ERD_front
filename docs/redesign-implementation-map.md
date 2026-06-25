# ERB Modern SaaS Redesign — Implementation Map

This map connects the redesign artifacts (tokens + Stitch prompts) to the exact code locations to update. It is intended to keep implementation incremental and low-risk.

## Source of truth
- Design system tokens + component rules: [`ERB_Front/.stitch/DESIGN.md`](../.stitch/DESIGN.md)
- Stitch prompt set: [`ERB_Front/.stitch/designs/_INDEX.md`](../.stitch/designs/_INDEX.md)

## What already matches the target look
- **App shell**: [`ERB_Front/src/components/Layout.jsx`](../src/components/Layout.jsx)\n  - Sidebar chrome, active state, topbar search, user menu already use the right token set (`bg-surface-container-lowest`, `border-outline-variant`, `bg-accent`, `btn-tactile`).\n  - Future refinements: extract repeated button/input classes into shared UI primitives (optional).
- **Dashboard**: [`ERB_Front/src/views/DashboardView.jsx`](../src/views/DashboardView.jsx)\n  - KPI card style, page header pattern, chart container layout already closely matches `01-app-shell-dashboard.prompt.md`.
- **Lists & CRUD pages**: [`ERB_Front/src/views/ProductsView.jsx`](../src/views/ProductsView.jsx), [`ERB_Front/src/views/PartiesView.jsx`](../src/views/PartiesView.jsx), [`ERB_Front/src/views/InvoicesView.jsx`](../src/views/InvoicesView.jsx), [`ERB_Front/src/views/SettingsView.jsx`](../src/views/SettingsView.jsx)\n  - Mostly aligned: consistent radii, borders, shadows, muted typography, empty states.

## Changes implemented as part of this redesign
- **Auth consistency fix**: [`ERB_Front/src/views/RegisterView.jsx`](../src/views/RegisterView.jsx)\n  - Updated Register to match Login’s token-based palette and component styling.\n  - Removed hardcoded `slate/indigo` colors and replaced with design-token roles (`bg-background`, `bg-surface-container-lowest`, `border-outline-variant`, `bg-accent`).\n  - Matched the dotted background texture and footer credit pattern used in `LoginView`.

## Next incremental upgrades (optional, but recommended)
These are “quality multipliers” that reduce duplicated Tailwind strings and improve consistency.\n\n1. **Introduce UI primitives** (new files):\n   - `src/components/ui/Button.jsx` (variants: primary/secondary/ghost/destructive)\n   - `src/components/ui/Input.jsx` and `Select.jsx`\n   - `src/components/ui/Card.jsx`\n\n2. **Standardize page headers**:\n   - Create `src/components/PageHeader.jsx` used by Dashboard/Products/Parties/Invoices/Settings.\n\n3. **Standardize table/list patterns**:\n   - Create `src/components/DataTableShell.jsx` for header + body + empty/loading slots.\n\n4. **Auth layout consolidation**:\n   - Create `src/components/auth/AuthLayout.jsx` to share the dotted background + card chrome between Login/Register.\n\n## Stitch prompts → code targets
- `01-app-shell-dashboard.prompt.md`\n  - Shell: `src/components/Layout.jsx`\n  - Dashboard: `src/views/DashboardView.jsx`\n- `02-products-list.prompt.md`\n  - `src/views/ProductsView.jsx`\n- `03-invoices-create-history.prompt.md`\n  - `src/views/InvoicesView.jsx`, `src/components/EditInvoiceModal.jsx`, `src/components/InvoicePrintTemplate.jsx`\n- `04-parties-list-detail.prompt.md`\n  - `src/views/PartiesView.jsx`, `src/views/PartyDashboard.jsx`\n- `05-settings.prompt.md`\n  - `src/views/SettingsView.jsx`\n- `06-auth-login-register.prompt.md`\n  - `src/views/LoginView.jsx`, `src/views/RegisterView.jsx`\n+
