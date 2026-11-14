import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { config } from './config.js';

fs.mkdirSync(path.dirname(config.dbPath), { recursive: true });

export const db = new DatabaseSync(config.dbPath);

db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT    NOT NULL,
    email         TEXT    NOT NULL UNIQUE,
    password_hash TEXT    NOT NULL,
    role          TEXT    NOT NULL DEFAULT 'guest' CHECK (role IN ('guest','host')),
    avatar        TEXT,
    created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS listings (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    host_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title           TEXT    NOT NULL,
    description     TEXT    NOT NULL,
    type            TEXT    NOT NULL DEFAULT 'apartment',
    city            TEXT    NOT NULL,
    country         TEXT    NOT NULL,
    address         TEXT,
    lat             REAL,
    lng             REAL,
    price_per_night REAL    NOT NULL CHECK (price_per_night >= 0),
    guests          INTEGER NOT NULL DEFAULT 1,
    bedrooms        INTEGER NOT NULL DEFAULT 1,
    beds            INTEGER NOT NULL DEFAULT 1,
    baths           INTEGER NOT NULL DEFAULT 1,
    amenities       TEXT    NOT NULL DEFAULT '[]',
    images          TEXT    NOT NULL DEFAULT '[]',
    is_active       INTEGER NOT NULL DEFAULT 1,
    created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS bookings (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    listing_id  INTEGER NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    guest_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    check_in    TEXT    NOT NULL,
    check_out   TEXT    NOT NULL,
    guests      INTEGER NOT NULL DEFAULT 1,
    total_price REAL    NOT NULL,
    status      TEXT    NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed','cancelled','completed')),
    created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS reviews (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    listing_id INTEGER NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    booking_id INTEGER NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
    guest_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating     INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment    TEXT,
    created_at TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_listings_city   ON listings(city);
  CREATE INDEX IF NOT EXISTS idx_listings_host   ON listings(host_id);
  CREATE INDEX IF NOT EXISTS idx_bookings_listing ON bookings(listing_id);
  CREATE INDEX IF NOT EXISTS idx_bookings_guest   ON bookings(guest_id);
  CREATE INDEX IF NOT EXISTS idx_reviews_listing  ON reviews(listing_id);
`);

export function resetDatabase() {
  db.exec('DELETE FROM reviews; DELETE FROM bookings; DELETE FROM listings; DELETE FROM users;');
  db.exec("DELETE FROM sqlite_sequence WHERE name IN ('reviews','bookings','listings','users');");
}
