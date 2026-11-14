export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export const httpError = (status, message) => new HttpError(status, message);

export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export function parseJsonArray(value, fallback = []) {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string') return fallback;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidDateString(value) {
  if (typeof value !== 'string' || !DATE_RE.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

export function todayString() {
  return new Date().toISOString().slice(0, 10);
}

export function nightsBetween(checkIn, checkOut) {
  const a = Date.parse(`${checkIn}T00:00:00Z`);
  const b = Date.parse(`${checkOut}T00:00:00Z`);
  return Math.round((b - a) / 86_400_000);
}

export function serializeUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    avatar: row.avatar,
    createdAt: row.created_at,
  };
}

export function serializeListing(row) {
  if (!row) return null;
  return {
    id: row.id,
    hostId: row.host_id,
    hostName: row.host_name ?? undefined,
    title: row.title,
    description: row.description,
    type: row.type,
    city: row.city,
    country: row.country,
    address: row.address,
    lat: row.lat,
    lng: row.lng,
    pricePerNight: row.price_per_night,
    guests: row.guests,
    bedrooms: row.bedrooms,
    beds: row.beds,
    baths: row.baths,
    amenities: parseJsonArray(row.amenities),
    images: parseJsonArray(row.images),
    isActive: Boolean(row.is_active),
    avgRating: row.avg_rating ?? null,
    reviewCount: row.review_count ?? 0,
    createdAt: row.created_at,
  };
}

export function serializeBooking(row) {
  if (!row) return null;
  return {
    id: row.id,
    listingId: row.listing_id,
    guestId: row.guest_id,
    checkIn: row.check_in,
    checkOut: row.check_out,
    guests: row.guests,
    totalPrice: row.total_price,
    status: row.status,
    reviewed: Boolean(row.review_id),
    createdAt: row.created_at,
    listing: row.listing_title
      ? {
          id: row.listing_id,
          title: row.listing_title,
          city: row.listing_city,
          country: row.listing_country,
          image: parseJsonArray(row.listing_images)[0] ?? null,
          pricePerNight: row.listing_price,
        }
      : undefined,
    guest: row.guest_name ? { id: row.guest_id, name: row.guest_name, email: row.guest_email } : undefined,
  };
}

export function serializeReview(row) {
  if (!row) return null;
  return {
    id: row.id,
    listingId: row.listing_id,
    bookingId: row.booking_id,
    guestId: row.guest_id,
    guestName: row.guest_name ?? undefined,
    rating: row.rating,
    comment: row.comment,
    createdAt: row.created_at,
  };
}
