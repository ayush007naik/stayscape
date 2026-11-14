import { Router } from 'express';
import { db } from '../db.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { asyncHandler, serializeBooking, serializeListing, todayString } from '../utils.js';

const router = Router();

router.use(authenticate, requireRole('host'));

router.get(
  '/listings',
  asyncHandler(async (req, res) => {
    const rows = db
      .prepare(
        `SELECT l.*,
           (SELECT ROUND(AVG(r.rating), 2) FROM reviews r WHERE r.listing_id = l.id) AS avg_rating,
           (SELECT COUNT(*) FROM reviews r WHERE r.listing_id = l.id)          AS review_count,
           (SELECT COUNT(*) FROM bookings b WHERE b.listing_id = l.id AND b.status != 'cancelled') AS booking_count
         FROM listings l
         WHERE l.host_id = ?
         ORDER BY l.is_active DESC, l.created_at DESC`
      )
      .all(req.user.id);

    res.json({
      data: rows.map((row) => ({ ...serializeListing(row), bookingCount: row.booking_count, hostName: req.user.name })),
    });
  })
);

router.get(
  '/bookings',
  asyncHandler(async (req, res) => {
    const rows = db
      .prepare(
        `SELECT b.*, l.title AS listing_title, l.city AS listing_city, l.country AS listing_country,
                l.images AS listing_images, l.price_per_night AS listing_price,
                u.name AS guest_name, u.email AS guest_email
         FROM bookings b
         JOIN listings l ON l.id = b.listing_id
         JOIN users u ON u.id = b.guest_id
         WHERE l.host_id = ?
         ORDER BY b.check_in DESC, b.id DESC`
      )
      .all(req.user.id);
    res.json({ data: rows.map(serializeBooking) });
  })
);

router.get(
  '/stats',
  asyncHandler(async (req, res) => {
    const today = todayString();

    const listings = db
      .prepare(
        `SELECT COUNT(*) AS total,
                SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) AS active
         FROM listings WHERE host_id = ?`
      )
      .get(req.user.id);

    const bookings = db
      .prepare(
        `SELECT
           COUNT(*) AS total,
           SUM(CASE WHEN b.status = 'confirmed' AND b.check_in > ? THEN 1 ELSE 0 END) AS upcoming,
           SUM(CASE WHEN b.status != 'cancelled' THEN b.total_price ELSE 0 END) AS revenue
         FROM bookings b JOIN listings l ON l.id = b.listing_id
         WHERE l.host_id = ?`
      )
      .get(today, req.user.id);

    const rating = db
      .prepare(
        `SELECT ROUND(AVG(r.rating), 2) AS avg_rating, COUNT(*) AS review_count
         FROM reviews r JOIN listings l ON l.id = r.listing_id
         WHERE l.host_id = ?`
      )
      .get(req.user.id);

    res.json({
      totalListings: listings.total ?? 0,
      activeListings: listings.active ?? 0,
      totalBookings: bookings.total ?? 0,
      upcomingBookings: bookings.upcoming ?? 0,
      revenue: Math.round((bookings.revenue ?? 0) * 100) / 100,
      avgRating: rating.avg_rating,
      reviewCount: rating.review_count ?? 0,
    });
  })
);

export default router;
