# StayScape — Airbnb Clone (Full Stack)

A complete listings-and-booking platform built as the **Sapphire IQ Airbnb Clone capstone**. React frontend, Express REST API, SQLite persistence, JWT auth, and interactive maps.

> The project brief specifies `React + Node.js/Express + MongoDB/PostgreSQL + JWT + Maps API`. This implementation uses **SQLite via Node's built-in `node:sqlite`** so the whole project runs with **zero database setup**, and **Leaflet + OpenStreetMap** so maps work **without an API key**. The data model and APIs map 1:1 to the module requirements and are easy to port to Mongoose/Sequelize.

---

## Modules covered

| # | Module | What's implemented |
|---|--------|--------------------|
| 1 | **Backend foundation** | Full data model (`users`, `listings`, `bookings`, `reviews`), CRUD APIs, JWT auth + role middleware (`guest` / `host`) |
| 2 | **Frontend: listings & search** | Live React grid fed by the API, destination search, type/price/bedroom filters, sorting, pagination, loading skeletons + empty states |
| 3 | **Booking flow end-to-end** | Date picker, server-side overlap validation, availability check, price breakdown, confirmation screen, cancellation |
| 4 | **Maps, reviews & host dashboard** | Leaflet map on listing pages, review system with average-rating aggregation, host dashboard (listings CRUD, bookings, revenue/rating stats) |
| 5 | **Deployment & polish** | Build + single-service serving, env separation (`.env`), image lazy-loading/fallbacks, responsive design |

---

## Tech stack

- **Frontend:** React 18, Vite, React Router, Leaflet
- **Backend:** Node.js + Express, `node:sqlite`, `jsonwebtoken`, `bcryptjs`
- **Auth:** JWT bearer tokens, bcrypt password hashing, role-based access
- **Maps:** Leaflet + OpenStreetMap tiles (no key required)

---

## Project structure

```
airbnb-clone/
├── package.json            # root scripts (setup, seed, dev, build, start)
├── server/
│   ├── src/
│   │   ├── index.js        # Express app + static client serving
│   │   ├── config.js       # env-driven configuration
│   │   ├── db.js           # node:sqlite schema + connection
│   │   ├── seed.js         # demo users, listings, bookings, reviews
│   │   ├── utils.js        # serializers, date/validation helpers
│   │   ├── middleware/
│   │   │   └── auth.js     # authenticate / optionalAuth / requireRole
│   │   └── routes/
│   │       ├── auth.js     # register, login, me
│   │       ├── listings.js # CRUD, search/filter, bookings, reviews
│   │       ├── bookings.js # my trips, cancel
│   │       └── host.js     # host listings, bookings, stats
│   ├── .env.example
│   └── package.json
└── client/
    ├── src/
    │   ├── api.js          # typed-ish fetch wrapper
    │   ├── context/        # AuthContext (JWT session)
    │   ├── components/     # Navbar, cards, map, spinner, route guard
    │   ├── pages/          # Home, Listing detail, Login, Register,
    │   │                   # Host dashboard, Listing form, My trips, 404
    │   └── styles.css      # design system + responsive layout
    ├── index.html
    └── vite.config.js
```

---

## Getting started

**Prerequisite:** Node.js **22.5+** (24 recommended). The backend uses Node's built-in `node:sqlite` module, so no database server, Docker, or native build tools are needed.

```bash
cd airbnb-clone

# 1. install dependencies for server + client
npm run setup

# 2. seed the database with demo data
npm run seed

# 3. run API (http://localhost:4000) + web app (http://localhost:5173)
npm run dev
```

Open **http://localhost:5173**.

### Demo accounts

| Role  | Email             | Password      |
|-------|-------------------|---------------|
| Host  | `host@demo.com`   | `password123` |
| Host  | `marco@demo.com`  | `password123` |
| Guest | `guest@demo.com`  | `password123` |
| Guest | `lena@demo.com`   | `password123` |

The login page has one-click **“Use guest demo” / “Use host demo”** buttons.

---

## Production build

The Express server automatically serves the built React app from `client/dist`, so the whole platform can run as a single service:

```bash
npm run build      # builds the React app into client/dist
npm start          # starts Express on :4000 and serves the SPA + API
```

Open **http://localhost:4000**. Because the app and API share an origin, there are no CORS concerns in production.

---

## Environment variables

Copy `server/.env.example` to `server/.env` and adjust. All values have sensible dev defaults.

| Variable        | Default                              | Purpose                          |
|-----------------|--------------------------------------|----------------------------------|
| `PORT`          | `4000`                               | API/server port                  |
| `JWT_SECRET`    | dev fallback                         | **Set a strong secret in prod**  |
| `JWT_EXPIRES_IN`| `7d`                                 | Token lifetime                   |
| `DB_PATH`       | `server/data/airbnb.db`              | SQLite file location             |
| `CLIENT_ORIGIN` | `http://localhost:5173`              | CORS origin for the dev frontend |

---

## API reference

Base URL: `http://localhost:4000/api`

### Auth
| Method | Endpoint         | Body / notes |
|--------|------------------|--------------|
| POST   | `/auth/register` | `{ name, email, password, role }` (`role`: `guest` \| `host`) |
| POST   | `/auth/login`    | `{ email, password }` |
| GET    | `/auth/me`       | Bearer token required |

### Listings (public)
| Method | Endpoint | Notes |
|--------|----------|-------|
| GET    | `/listings` | Filters: `q, city, country, type, minPrice, maxPrice, guests, bedrooms, sort, page, limit` |
| GET    | `/listings/:id` | Includes reviews, average rating, host name |
| GET    | `/listings/:id/availability?check_in=&check_out=` | `{ available }` |
| GET    | `/listings/:id/reviews` | |

### Listings (host, auth)
| Method | Endpoint | Notes |
|--------|----------|-------|
| POST   | `/listings` | Create listing (host role) |
| PUT    | `/listings/:id` | Update own listing (partial) |
| DELETE | `/listings/:id` | Soft-delete (hide) own listing |

### Bookings (auth)
| Method | Endpoint | Notes |
|--------|----------|-------|
| POST   | `/listings/:id/bookings` | `{ check_in, check_out, guests }` — rejects overlaps with `409` |
| GET    | `/bookings/mine` | Guest’s trips + `reviewed` flag |
| PATCH  | `/bookings/:id/cancel` | Cancel own booking |

### Reviews (auth)
| Method | Endpoint | Notes |
|--------|----------|-------|
| POST   | `/listings/:id/reviews` | `{ booking_id, rating, comment }` — only for completed stays |

### Host dashboard (host, auth)
| Method | Endpoint | Notes |
|--------|----------|-------|
| GET    | `/host/listings` | Own listings + booking counts |
| GET    | `/host/bookings` | All bookings across own listings |
| GET    | `/host/stats` | Listings, bookings, revenue, average rating |

---

## Data model

- **users** — `id, name, email, password_hash, role (guest|host), avatar, created_at`
- **listings** — `id, host_id, title, description, type, city, country, address, lat, lng, price_per_night, guests, bedrooms, beds, baths, amenities(JSON), images(JSON), is_active`
- **bookings** — `id, listing_id, guest_id, check_in, check_out, guests, total_price, status (confirmed|cancelled|completed)`
- **reviews** — `id, listing_id, booking_id (unique), guest_id, rating (1–5), comment`

**Overlap rule:** a booking conflicts when `existing.check_in < new.check_out AND existing.check_out > new.check_in` (cancelled bookings excluded). The check runs on the server, so double-bookings are prevented even outside the UI.

---

## Notes & next steps

- **Swapping the database:** the SQL lives in `server/src/db.js`; replace `node:sqlite` calls with Mongoose/Sequelize if your course requires MongoDB/PostgreSQL.
- **Swap maps:** the map component (`client/src/components/MapView.jsx`) uses OpenStreetMap tiles; drop in Google Maps/Mapbox with an API key if preferred.
- **Session storage:** tokens are kept in `localStorage` for simplicity. For production, consider httpOnly cookies.
- **Images:** listings accept direct image URLs. Uploads (e.g. to S3/Firebase Storage) are a natural extension.
