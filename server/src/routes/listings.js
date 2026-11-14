import { Router } from 'express';
import { db } from '../db.js';
import { authenticate, optionalAuth, requireRole } from '../middleware/auth.js';
import {
  asyncHandler,
  httpError,
  isValidDateString,
  nightsBetween,
  serializeBooking,
  serializeListing,
  serializeReview,
  todayString,
} from '../utils.js';

const router = Router();

const LISTING_TYPES = ['apartment', 'house', 'villa', 'cabin', 'loft', 'condo', 'cottage', 'room'];

const LISTING_SELECT = `
  SELECT l.*, u.name AS host_name,
    (SELECT ROUND(AVG(r.rating), 2) FROM reviews r WHERE r.listing_id = l.id) AS avg_rating,
    (SELECT COUNT(*) FROM reviews r WHERE r.listing_id = l.id)          AS review_count
  FROM listings l
  JOIN users u ON u.id = l.host_id
`;

function getListingRow(id, { includeInactive = false } = {}) {
  const row = db.prepare(`${LISTING_SELECT} WHERE l.id = ?`).get(id);
  if (!row) throw httpError(404, 'Listing not found');
  if (!includeInactive && !row.is_active) throw httpError(404, 'Listing not found');
  return row;
}

function normalizeListingPayload(body, { partial = false } = {}) {
  const out = {};
  const errors = [];
  const has = (key) => body != null && Object.prototype.hasOwnProperty.call(body, key);

  const requireField = (key) => !partial && (body?.[key] === undefined || body?.[key] === null || body?.[key] === '');

  if (!partial && requireField('title')) errors.push('title is required');
  if (has('title')) {
    const title = String(body.title).trim();
    if (title.length < 3) errors.push('title must be at least 3 characters');
    out.title = title;
  }

  if (!partial && requireField('description')) errors.push('description is required');
  if (has('description')) {
    const description = String(body.description).trim();
    if (description.length < 10) errors.push('description must be at least 10 characters');
    out.description = description;
  }

  if (has('type')) {
    const type = String(body.type).trim().toLowerCase();
    if (!LISTING_TYPES.includes(type)) errors.push(`type must be one of: ${LISTING_TYPES.join(', ')}`);
    out.type = type;
  } else if (!partial) {
    out.type = 'apartment';
  }

  for (const key of ['city', 'country']) {
    if (!partial && requireField(key)) errors.push(`${key} is required`);
    if (has(key)) {
      const value = String(body[key]).trim();
      if (!value) errors.push(`${key} cannot be empty`);
      out[key] = value;
    }
  }

  if (has('address')) out.address = body.address == null ? null : String(body.address).trim();

  if (!partial && (body?.pricePerNight === undefined || body?.pricePerNight === null || body.pricePerNight === '')) {
    errors.push('pricePerNight is required');
  }
  if (has('pricePerNight')) {
    const price = Number(body.pricePerNight);
    if (!Number.isFinite(price) || price <= 0) errors.push('pricePerNight must be a positive number');
    out.pricePerNight = Math.round(price * 100) / 100;
  }

  for (const key of ['guests', 'bedrooms', 'beds', 'baths']) {
    if (has(key)) {
      const value = Number(body[key]);
      if (!Number.isInteger(value) || value < 1) errors.push(`${key} must be an integer >= 1`);
      out[key] = value;
    } else if (!partial) {
      out[key] = 1;
    }
  }

  if (has('lat')) {
    const lat = body.lat == null || body.lat === '' ? null : Number(body.lat);
    if (lat !== null && (!Number.isFinite(lat) || lat < -90 || lat > 90)) errors.push('lat must be between -90 and 90');
    out.lat = lat;
  }
  if (has('lng')) {
    const lng = body.lng == null || body.lng === '' ? null : Number(body.lng);
    if (lng !== null && (!Number.isFinite(lng) || lng < -180 || lng > 180)) {
      errors.push('lng must be between -180 and 180');
    }
    out.lng = lng;
  }

  if (has('amenities')) {
    if (!Array.isArray(body.amenities)) errors.push('amenities must be an array');
    else out.amenities = JSON.stringify(body.amenities.map((a) => String(a).trim()).filter(Boolean));
  }

  if (has('images')) {
    if (!Array.isArray(body.images)) errors.push('images must be an array');
    else out.images = JSON.stringify(body.images.map((i) => String(i).trim()).filter(Boolean));
  }

  if (has('isActive')) out.is_active = body.isActive ? 1 : 0;

  if (errors.length) throw httpError(400, errors.join('; '));
  return out;
}

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const {
      q,
      city,
      country,
      type,
      minPrice,
      maxPrice,
      guests,
      bedrooms,
      sort = 'newest',
      page = '1',
      limit = '12',
    } = req.query;

    const where = ['l.is_active = 1'];
    const params = [];

    if (q) {
      where.push('(l.title LIKE ? OR l.description LIKE ? OR l.city LIKE ? OR l.country LIKE ?)');
      const like = `%${String(q).trim()}%`;
      params.push(like, like, like, like);
    }
    if (city) {
      where.push('l.city LIKE ?');
      params.push(`%${String(city).trim()}%`);
    }
    if (country) {
      where.push('l.country LIKE ?');
      params.push(`%${String(country).trim()}%`);
    }
    if (type) {
      where.push('l.type = ?');
      params.push(String(type).trim().toLowerCase());
    }
    if (minPrice !== undefined && minPrice !== '') {
      where.push('l.price_per_night >= ?');
      params.push(Number(minPrice));
    }
    if (maxPrice !== undefined && maxPrice !== '') {
      where.push('l.price_per_night <= ?');
      params.push(Number(maxPrice));
    }
    if (guests !== undefined && guests !== '') {
      where.push('l.guests >= ?');
      params.push(Number(guests));
    }
    if (bedrooms !== undefined && bedrooms !== '') {
      where.push('l.bedrooms >= ?');
      params.push(Number(bedrooms));
    }

    const orderBy = {
      price_asc: 'l.price_per_night ASC',
      price_desc: 'l.price_per_night DESC',
      rating: 'avg_rating IS NULL ASC, avg_rating DESC',
      newest: 'l.created_at DESC, l.id DESC',
    }[sort] || 'l.created_at DESC, l.id DESC';

    const pageNum = Math.max(1, Number(page) || 1);
    const pageSize = Math.min(50, Math.max(1, Number(limit) || 12));
    const offset = (pageNum - 1) * pageSize;

    const whereSql = `WHERE ${where.join(' AND ')}`;
    const total = db.prepare(`SELECT COUNT(*) AS c FROM listings l ${whereSql}`).get(...params).c;

    const rows = db
      .prepare(`${LISTING_SELECT} ${whereSql} ORDER BY ${orderBy} LIMIT ? OFFSET ?`)
      .all(...params, pageSize, offset);

    res.json({
      data: rows.map(serializeListing),
      page: pageNum,
      limit: pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    });
  })
);

router.get(
  '/:id',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const row = getListingRow(Number(req.params.id));
    const reviews = db
      .prepare(
        `SELECT r.*, u.name AS guest_name
         FROM reviews r JOIN users u ON u.id = r.guest_id
         WHERE r.listing_id = ? ORDER BY r.created_at DESC`
      )
      .all(row.id);

    res.json({ ...serializeListing(row), reviews: reviews.map(serializeReview) });
  })
);

router.post(
  '/',
  authenticate,
  requireRole('host'),
  asyncHandler(async (req, res) => {
    const payload = normalizeListingPayload(req.body);
    const info = db
      .prepare(
        `INSERT INTO listings
          (host_id, title, description, type, city, country, address, lat, lng,
           price_per_night, guests, bedrooms, beds, baths, amenities, images, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`
      )
      .run(
        req.user.id,
        payload.title,
        payload.description,
        payload.type,
        payload.city,
        payload.country,
        payload.address ?? null,
        payload.lat ?? null,
        payload.lng ?? null,
        payload.pricePerNight,
        payload.guests,
        payload.bedrooms,
        payload.beds,
        payload.baths,
        payload.amenities ?? '[]',
        payload.images ?? '[]'
      );

    const row = getListingRow(Number(info.lastInsertRowid), { includeInactive: true });
    res.status(201).json(serializeListing(row));
  })
);

router.put(
  '/:id',
  authenticate,
  requireRole('host'),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const existing = getListingRow(id, { includeInactive: true });
    if (existing.host_id !== req.user.id) throw httpError(403, 'You can only edit your own listings');

    const payload = normalizeListingPayload(req.body, { partial: true });
    const columnMap = {
      title: 'title',
      description: 'description',
      type: 'type',
      city: 'city',
      country: 'country',
      address: 'address',
      lat: 'lat',
      lng: 'lng',
      pricePerNight: 'price_per_night',
      guests: 'guests',
      bedrooms: 'bedrooms',
      beds: 'beds',
      baths: 'baths',
      amenities: 'amenities',
      images: 'images',
      is_active: 'is_active',
    };

    const sets = [];
    const values = [];
    for (const [key, column] of Object.entries(columnMap)) {
      if (Object.prototype.hasOwnProperty.call(payload, key)) {
        sets.push(`${column} = ?`);
        values.push(payload[key]);
      }
    }
    if (!sets.length) throw httpError(400, 'No valid fields to update');

    db.prepare(`UPDATE listings SET ${sets.join(', ')} WHERE id = ?`).run(...values, id);
    res.json(serializeListing(getListingRow(id, { includeInactive: true })));
  })
);

router.delete(
  '/:id',
  authenticate,
  requireRole('host'),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const existing = getListingRow(id, { includeInactive: true });
    if (existing.host_id !== req.user.id) throw httpError(403, 'You can only delete your own listings');
    db.prepare('UPDATE listings SET is_active = 0 WHERE id = ?').run(id);
    res.json({ ok: true });
  })
);

router.get(
  '/:id/availability',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    getListingRow(id);
    const { check_in: checkIn, check_out: checkOut } = req.query;
    if (!isValidDateString(checkIn) || !isValidDateString(checkOut)) {
      throw httpError(400, 'check_in and check_out must be valid YYYY-MM-DD dates');
    }
    if (checkOut <= checkIn) throw httpError(400, 'check_out must be after check_in');

    const conflict = db
      .prepare(
        `SELECT id FROM bookings
         WHERE listing_id = ? AND status != 'cancelled'
           AND check_in < ? AND check_out > ?`
      )
      .get(id, checkOut, checkIn);

    res.json({ available: !conflict });
  })
);

router.post(
  '/:id/bookings',
  authenticate,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const listing = getListingRow(id);
    const { check_in: checkIn, check_out: checkOut } = req.body ?? {};
    const guests = Number(req.body?.guests ?? 1);

    if (listing.host_id === req.user.id) throw httpError(400, 'You cannot book your own listing');
    if (!isValidDateString(checkIn) || !isValidDateString(checkOut)) {
      throw httpError(400, 'check_in and check_out must be valid YYYY-MM-DD dates');
    }
    if (checkOut <= checkIn) throw httpError(400, 'check_out must be after check_in');
    if (checkIn <= todayString()) throw httpError(400, 'check_in must be in the future');
    if (!Number.isInteger(guests) || guests < 1 || guests > listing.guests) {
      throw httpError(400, `guests must be between 1 and ${listing.guests}`);
    }

    const conflict = db
      .prepare(
        `SELECT id FROM bookings
         WHERE listing_id = ? AND status != 'cancelled'
           AND check_in < ? AND check_out > ?`
      )
      .get(id, checkOut, checkIn);
    if (conflict) throw httpError(409, 'Those dates are already booked for this listing');

    const nights = nightsBetween(checkIn, checkOut);
    const totalPrice = Math.round(nights * listing.price_per_night * 100) / 100;

    const info = db
      .prepare(
        `INSERT INTO bookings (listing_id, guest_id, check_in, check_out, guests, total_price, status)
         VALUES (?, ?, ?, ?, ?, ?, 'confirmed')`
      )
      .run(id, req.user.id, checkIn, checkOut, guests, totalPrice);

    const row = db
      .prepare(
        `SELECT b.*, l.title AS listing_title, l.city AS listing_city, l.country AS listing_country,
                l.images AS listing_images,
                u.name AS guest_name, u.email AS guest_email
         FROM bookings b
         JOIN listings l ON l.id = b.listing_id
         JOIN users u ON u.id = b.guest_id
         WHERE b.id = ?`
      )
      .get(Number(info.lastInsertRowid));

    res.status(201).json(serializeBooking(row));
  })
);

router.get(
  '/:id/reviews',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    getListingRow(id);
    const rows = db
      .prepare(
        `SELECT r.*, u.name AS guest_name
         FROM reviews r JOIN users u ON u.id = r.guest_id
         WHERE r.listing_id = ? ORDER BY r.created_at DESC`
      )
      .all(id);
    res.json({ data: rows.map(serializeReview) });
  })
);

router.post(
  '/:id/reviews',
  authenticate,
  asyncHandler(async (req, res) => {
    const listingId = Number(req.params.id);
    getListingRow(listingId);

    const { booking_id: bookingId, rating, comment } = req.body ?? {};
    const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(Number(bookingId));
    if (!booking) throw httpError(404, 'Booking not found');
    if (booking.guest_id !== req.user.id) throw httpError(403, 'You can only review your own stays');
    if (booking.listing_id !== listingId) throw httpError(400, 'Booking does not match this listing');
    if (booking.status === 'cancelled') throw httpError(400, 'Cancelled bookings cannot be reviewed');
    if (booking.check_out > todayString()) throw httpError(400, 'You can review only after your stay is complete');

    const existing = db.prepare('SELECT id FROM reviews WHERE booking_id = ?').get(booking.id);
    if (existing) throw httpError(409, 'You already reviewed this stay');

    const numericRating = Number(rating);
    if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
      throw httpError(400, 'rating must be an integer between 1 and 5');
    }

    const info = db
      .prepare('INSERT INTO reviews (listing_id, booking_id, guest_id, rating, comment) VALUES (?, ?, ?, ?, ?)')
      .run(listingId, booking.id, req.user.id, numericRating, comment ? String(comment).trim() : null);

    db.prepare("UPDATE bookings SET status = 'completed' WHERE id = ?").run(booking.id);

    const row = db
      .prepare(
        `SELECT r.*, u.name AS guest_name
         FROM reviews r JOIN users u ON u.id = r.guest_id WHERE r.id = ?`
      )
      .get(Number(info.lastInsertRowid));

    res.status(201).json(serializeReview(row));
  })
);

export default router;
