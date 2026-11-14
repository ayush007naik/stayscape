import { Router } from 'express';
import { db } from '../db.js';
import { authenticate } from '../middleware/auth.js';
import { asyncHandler, httpError, serializeBooking } from '../utils.js';

const router = Router();

const BOOKING_SELECT = `
  SELECT b.*, l.title AS listing_title, l.city AS listing_city, l.country AS listing_country,
         l.images AS listing_images, l.price_per_night AS listing_price,
         u.name AS guest_name, u.email AS guest_email, r.id AS review_id
  FROM bookings b
  JOIN listings l ON l.id = b.listing_id
  JOIN users u ON u.id = b.guest_id
  LEFT JOIN reviews r ON r.booking_id = b.id
`;

router.get(
  '/mine',
  authenticate,
  asyncHandler(async (req, res) => {
    const rows = db
      .prepare(`${BOOKING_SELECT} WHERE b.guest_id = ? ORDER BY b.check_in DESC, b.id DESC`)
      .all(req.user.id);
    res.json({ data: rows.map(serializeBooking) });
  })
);

router.patch(
  '/:id/cancel',
  authenticate,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(id);
    if (!booking) throw httpError(404, 'Booking not found');
    if (booking.guest_id !== req.user.id) throw httpError(403, 'You can only cancel your own bookings');
    if (booking.status === 'cancelled') throw httpError(400, 'Booking is already cancelled');

    db.prepare("UPDATE bookings SET status = 'cancelled' WHERE id = ?").run(id);
    const row = db.prepare(`${BOOKING_SELECT} WHERE b.id = ?`).get(id);
    res.json(serializeBooking(row));
  })
);

export default router;
