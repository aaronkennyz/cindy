# Cindy — Codex Agent Rules

## Project Overview
Cindy is a business CRM dashboard for small businesses (starting with gyms). It helps owners manage customers, subscriptions, plans, and WhatsApp messaging. The backend is already built in Node.js with Supabase. Your job is the frontend only.

---

## Strict Boundaries

### What you MUST NOT touch
- Anything inside `/controllers/`
- Anything inside `/routes/`
- Anything inside `/config/`
- `server.js`
- `.env`
- `package.json` and `package-lock.json`
- The database schema

### What you ARE allowed to touch
- Everything inside `/frontend/`
- CSS, HTML, and vanilla JavaScript inside frontend files only
- You may create new files inside `/frontend/` if needed (e.g. `login.html`, `create-business.html`)

---

## API Connectivity Rules

- All API calls go to `http://localhost:3000/api` — never hardcode a different base URL
- Always use `fetch()` for API calls, no external HTTP libraries
- Always send `Content-Type: application/json` headers
- Always send the JWT token in the Authorization header like this:
  ```
  Authorization: Bearer <token>
  ```
- Store the JWT token in memory (a JS variable) — never localStorage or sessionStorage
- On 401 responses, redirect the user to login automatically
- Never expose or log the JWT token to the console
- Handle loading states — show a spinner or disabled button while requests are in flight
- Handle error responses gracefully — show a human readable message to the user, never show raw JSON errors

---

## File Structure
```
frontend/
├── index.html          (login + register)
├── create-business.html (one time business setup after first login)
├── dashboard.html      (main dashboard with stats and alerts)
├── customers.html      (customer list and management)
├── plans.html          (plan management)
├── messaging.html      (whatsapp messaging center)
└── assets/
    ├── style.css       (global styles)
    └── app.js          (shared utilities, auth state, API base)
```

---

## Design System

### Theme
- **Style:** Clean, modern, minimal. Think Notion meets Linear. Not flashy, not corporate, not Bootstrap generic.
- **Mode:** Dark-first. Deep dark backgrounds with subtle surface elevation.
- **Personality:** Professional but approachable. A gym owner should feel confident using this, not intimidated.

### Colors
```css
--bg-base: #0f0f0f;
--bg-surface: #1a1a1a;
--bg-elevated: #222222;
--border: #2e2e2e;
--accent: #6c63ff;
--accent-hover: #574fd6;
--accent-soft: rgba(108, 99, 255, 0.12);
--text-primary: #f0f0f0;
--text-secondary: #888888;
--text-muted: #555555;
--success: #22c55e;
--warning: #f59e0b;
--danger: #ef4444;
--white: #ffffff;
```

### Typography
- Font: `Inter` from Google Fonts — import it in every HTML file
- Base size: 14px
- Headings: 600 weight
- Labels: 500 weight, slightly muted
- Body: 400 weight

### Spacing
- Use 8px as the base unit. All spacing should be multiples of 8 (8, 16, 24, 32, 48)
- Cards have 24px padding
- Sections have 32px gaps

### Components

**Sidebar navigation:**
- Fixed left sidebar, 240px wide
- Dark background (#141414)
- Logo/brand at top
- Nav items with icon + label
- Active state uses accent color left border + soft accent background
- Bottom of sidebar shows owner name and logout button

**Cards:**
- Background: `--bg-surface`
- Border: 1px solid `--border`
- Border radius: 12px
- Subtle box shadow: `0 1px 3px rgba(0,0,0,0.4)`
- No harsh drop shadows

**Buttons:**
- Primary: accent background, white text, 8px radius, 12px 20px padding
- Secondary: transparent background, border, muted text
- Danger: red background for destructive actions
- Always show hover and focus states
- Disabled state reduces opacity to 0.5 and disables pointer events

**Tables:**
- No outer border on the table itself
- Row separator lines only (1px border-bottom on each row)
- Header row: muted text, uppercase, 11px, letter-spacing
- Hover state on rows: subtle background lift
- Actions (edit/delete) appear on row hover only

**Forms:**
- Inputs: dark background (#141414), border, 10px radius, 14px padding
- Focus state: accent color border
- Labels above inputs, never inside as placeholder only
- Error messages in red below the field
- Submit button full width on mobile, right aligned on desktop

**Alerts/Badges:**
- Status badges are pill shaped (border-radius: 999px)
- Active: green soft background, green text
- Expiring soon: amber soft background, amber text
- Expired/Inactive: red soft background, red text
- Informational toasts appear bottom-right, auto dismiss after 4 seconds

**WhatsApp button:**
- Green (#25D366), white text, WhatsApp icon from a CDN icon set
- Opens `https://wa.me/<phone>?text=<encoded message>` in a new tab

---

## Page Specific Requirements

### login/register (index.html)
- Centered card on full dark background
- Toggle between login and register in the same card — no separate pages
- Cindy logo or wordmark at top of card
- Minimal fields, lots of breathing room

### Create Business (create-business.html)
- Only shown once after registration
- Step-like feel — business type selection as visual cards with icons (gym, cafe, bakery, salon, other)
- Then business name input
- Clean and welcoming, not like a boring form

### Dashboard (dashboard.html)
- Top stat cards: Total Customers, Active Subscriptions, Revenue This Month, Expiring This Week
- Expiry alerts section below stats — table of customers expiring in 7 days with a WhatsApp button next to each
- Recent activity or recent customers added at bottom

### Customers (customers.html)
- Searchable, filterable table
- Add customer button opens a slide-in panel from the right (not a separate page, not an ugly modal)
- Each row shows name, phone, plan, status badge, expiry date, actions

### Plans (plans.html)
- Simple card grid of existing plans
- Each card shows plan name, price, duration
- Edit and delete on each card
- Add plan button at top right

### Messaging (messaging.html)
- Left: list of customers with checkboxes for bulk selection
- Right: message composer with pre-written templates dropdown
- WhatsApp send button that opens wa.me links for selected customers
- Message preview updates live as you type

---

## UX Rules
- Every destructive action (delete) needs a confirmation step — inline confirmation text, not a browser alert()
- Empty states should have a helpful illustration or icon + message, not just a blank table
- All tables need pagination or a "load more" if there are more than 20 rows
- Mobile responsive is required — sidebar collapses to a bottom nav on small screens
- No page reloads for CRUD operations — update the DOM directly after a successful API response
- Smooth transitions on panel open/close (200-300ms ease)

---

## What Bad UI Looks Like (avoid all of this)
- Bootstrap default components
- Bright white backgrounds
- Generic blue primary color (#007bff)
- Tables with heavy outer borders
- All-caps headings everywhere
- Modals that block the entire screen for simple actions
- Inconsistent spacing
- Comic Sans or system font fallback
- Gradient backgrounds that look like 2015
- Every element having a drop shadow
- Placeholder text as the only label for inputs
## Additional Rules for Frontend Developer

- Never modify any file outside /frontend/
- Never change the API base URL — it lives in frontend/assets/app.js only
- All API calls already have auth handled in app.js via Cindy.api() — always use this helper, never raw fetch()
- Never generate or hardcode IDs — all IDs come from API responses
- Do not add new npm packages — the backend dependencies are fixed
- When in doubt about what data an endpoint returns, ask before assuming
- Test every page after changes — broken auth redirect or blank screen means something broke in app.js