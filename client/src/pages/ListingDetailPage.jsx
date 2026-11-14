import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import MapView from '../components/MapView';
import RatingStars from '../components/RatingStars';
import Spinner from '../components/Spinner';

const FALLBACK =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="900" height="600"><rect width="900" height="600" fill="#f3ece7"/><text x="50%" y="50%" font-family="sans-serif" font-size="34" fill="#b9a99c" text-anchor="middle">No photo</text></svg>'
  );

const money = (n) => `₹${Number(n).toLocaleString('en-IN')}`;
const fmtDate = (s) =>
  s ? new Date(`${s}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
const parse = (s) => new Date(`${s}T00:00:00`);
const todayISO = () => new Date().toISOString().slice(0, 10);
const tomorrowISO = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
};

export default function ListingDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeImage, setActiveImage] = useState(0);

  const [form, setForm] = useState({ checkIn: '', checkOut: '', guests: 1 });
  const [availability, setAvailability] = useState('idle');
  const [booking, setBooking] = useState({ submitting: false, error: '', success: null });

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError('');
    setActiveImage(0);
    api
      .getListing(id)
      .then((data) => {
        if (alive) {
          setListing(data);
          setForm((f) => ({ ...f, guests: Math.min(Math.max(1, f.guests), data.guests) }));
        }
      })
      .catch((err) => {
        if (alive) setError(err.message);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [id]);

  const nights = useMemo(() => {
    if (!form.checkIn || !form.checkOut) return 0;
    const diff = parse(form.checkOut) - parse(form.checkIn);
    return diff > 0 ? Math.round(diff / 86_400_000) : 0;
  }, [form.checkIn, form.checkOut]);

  const total = nights * (listing?.pricePerNight ?? 0);
  const isOwnListing = user && listing && user.id === listing.hostId;

  useEffect(() => {
    if (!listing || isOwnListing) return;
    if (!form.checkIn || !form.checkOut || form.checkOut <= form.checkIn) {
      setAvailability('idle');
      return;
    }
    let alive = true;
    setAvailability('checking');
    const timer = setTimeout(() => {
      api
        .checkAvailability(listing.id, form.checkIn, form.checkOut)
        .then((r) => {
          if (alive) setAvailability(r.available ? 'available' : 'unavailable');
        })
        .catch(() => {
          if (alive) setAvailability('idle');
        });
    }, 350);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.checkIn, form.checkOut, listing?.id]);

  const submitBooking = async (e) => {
    e.preventDefault();
    if (!user) {
      navigate('/login', { state: { from: `/listings/${id}` } });
      return;
    }
    setBooking({ submitting: true, error: '', success: null });
    try {
      const result = await api.createBooking(id, form);
      setBooking({ submitting: false, error: '', success: result });
      setAvailability('idle');
    } catch (err) {
      setBooking({ submitting: false, error: err.message, success: null });
    }
  };

  if (loading) return <Spinner label="Loading listing…" />;

  if (error) {
    return (
      <div className="container page">
        <div className="empty-state">
          <h2>Listing unavailable</h2>
          <p>{error}</p>
          <Link to="/" className="btn btn-primary">
            Back to explore
          </Link>
        </div>
      </div>
    );
  }

  if (!listing) return null;

  const images = listing.images?.length ? listing.images : [FALLBACK];
  const mainImage = images[Math.min(activeImage, images.length - 1)] || FALLBACK;
  const hasReviews = listing.reviews?.length > 0;

  return (
    <div className="container detail-page">
      <div className="detail-head">
        <div>
          <h1 className="detail-title">{listing.title}</h1>
          <div className="detail-subline">
            <RatingStars rating={listing.avgRating} count={listing.reviewCount} />
            <span className="dot">·</span>
            <span>
              {listing.city}, {listing.country}
            </span>
            <span className="dot">·</span>
            <span className="type-pill">{listing.type}</span>
          </div>
        </div>
      </div>

      <div className="gallery">
        <div className="gallery-main">
          <img
            src={mainImage}
            alt={listing.title}
            onError={(e) => {
              e.currentTarget.src = FALLBACK;
            }}
          />
        </div>
        {images.length > 1 && (
          <div className="gallery-thumbs">
            {images.map((src, index) => (
              <button
                key={`${src}-${index}`}
                type="button"
                className={`gallery-thumb ${index === activeImage ? 'is-active' : ''}`}
                onClick={() => setActiveImage(index)}
              >
                <img
                  src={src}
                  alt={`${listing.title} ${index + 1}`}
                  onError={(e) => {
                    e.currentTarget.src = FALLBACK;
                  }}
                />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="detail-layout">
        <div className="detail-main">
          <div className="detail-host-row">
            <div>
              <h2 className="detail-section-title">
                {listing.type[0].toUpperCase() + listing.type.slice(1)} hosted by {listing.hostName}
              </h2>
              <p className="detail-meta">
                {listing.guests} guests · {listing.bedrooms} bedroom{listing.bedrooms > 1 ? 's' : ''} · {listing.beds}{' '}
                bed{listing.beds > 1 ? 's' : ''} · {listing.baths} bath{listing.baths > 1 ? 's' : ''}
              </p>
            </div>
            <div className="host-avatar">{(listing.hostName || 'H').slice(0, 1).toUpperCase()}</div>
          </div>

          <hr className="divider" />

          <section>
            <h3 className="detail-section-title">About this place</h3>
            <p className="detail-description">{listing.description}</p>
          </section>

          {listing.amenities?.length > 0 && (
            <section>
              <h3 className="detail-section-title">What this place offers</h3>
              <ul className="amenities">
                {listing.amenities.map((a) => (
                  <li key={a}>
                    <span className="amenity-tick">✓</span>
                    {a}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section>
            <h3 className="detail-section-title">Where you’ll be</h3>
            {Number.isFinite(Number(listing.lat)) && Number.isFinite(Number(listing.lng)) ? (
              <>
                <MapView points={[{ lat: listing.lat, lng: listing.lng, title: listing.title }]} zoom={12} height={340} />
                <p className="detail-location">
                  {listing.address ? `${listing.address}, ` : ''}
                  {listing.city}, {listing.country}
                </p>
              </>
            ) : (
              <p className="detail-description">
                {listing.city}, {listing.country}
              </p>
            )}
          </section>

          <section className="reviews-section">
            <div className="reviews-header">
              <h3 className="detail-section-title">
                <span className="rating-star">★</span>{' '}
                {listing.avgRating ? `${Number(listing.avgRating).toFixed(1)} · ` : ''}
                {listing.reviewCount} review{listing.reviewCount === 1 ? '' : 's'}
              </h3>
            </div>
            {hasReviews ? (
              <ul className="review-list">
                {listing.reviews.map((review) => (
                  <li key={review.id} className="review-item">
                    <div className="review-item-head">
                      <span className="review-avatar">{(review.guestName || 'G').slice(0, 1).toUpperCase()}</span>
                      <div>
                        <p className="review-name">{review.guestName || 'Guest'}</p>
                        <p className="review-date">{fmtDate(review.createdAt?.slice(0, 10))}</p>
                      </div>
                      <span className="review-stars">{'★'.repeat(review.rating)}</span>
                    </div>
                    {review.comment && <p className="review-comment">{review.comment}</p>}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="detail-description">No reviews yet. Be the first to stay and share your experience.</p>
            )}
          </section>
        </div>

        <aside className="detail-side">
          <div className="booking-card">
            <div className="booking-price">
              <strong>{money(listing.pricePerNight)}</strong> <span>/ night</span>
            </div>

            {isOwnListing ? (
              <div className="booking-own">
                <p>You host this listing.</p>
                <div className="booking-own-actions">
                  <Link to={`/host/listings/${listing.id}/edit`} className="btn btn-primary">
                    Edit listing
                  </Link>
                  <Link to="/host" className="btn btn-ghost">
                    Host dashboard
                  </Link>
                </div>
              </div>
            ) : booking.success ? (
              <div className="booking-success">
                <h3>Booking confirmed 🎉</h3>
                <p>
                  {fmtDate(booking.success.checkIn)} → {fmtDate(booking.success.checkOut)}
                </p>
                <p>
                  {booking.success.guests} guest{booking.success.guests > 1 ? 's' : ''} · Total{' '}
                  <strong>{money(booking.success.totalPrice)}</strong>
                </p>
                <Link to="/trips" className="btn btn-primary">
                  View my trips
                </Link>
              </div>
            ) : (
              <form className="booking-form" onSubmit={submitBooking}>
                <div className="booking-dates">
                  <label>
                    <span>Check-in</span>
                    <input
                      type="date"
                      value={form.checkIn}
                      min={tomorrowISO()}
                      onChange={(e) => setForm((f) => ({ ...f, checkIn: e.target.value }))}
                      required
                    />
                  </label>
                  <label>
                    <span>Check-out</span>
                    <input
                      type="date"
                      value={form.checkOut}
                      min={form.checkIn || tomorrowISO()}
                      onChange={(e) => setForm((f) => ({ ...f, checkOut: e.target.value }))}
                      required
                    />
                  </label>
                </div>

                <label className="booking-guests">
                  <span>Guests</span>
                  <select
                    value={form.guests}
                    onChange={(e) => setForm((f) => ({ ...f, guests: Number(e.target.value) }))}
                  >
                    {Array.from({ length: listing.guests }).map((_, i) => (
                      <option key={i + 1} value={i + 1}>
                        {i + 1} guest{i > 0 ? 's' : ''}
                      </option>
                    ))}
                  </select>
                </label>

                {availability !== 'idle' && form.checkIn && form.checkOut && form.checkOut > form.checkIn && (
                  <p className={`availability availability-${availability}`}>
                    {availability === 'checking' && 'Checking availability…'}
                    {availability === 'available' && '✓ These dates are available'}
                    {availability === 'unavailable' && '✕ These dates are already booked'}
                  </p>
                )}

                {nights > 0 && (
                  <div className="price-breakdown">
                    <div className="price-row">
                      <span>
                        {money(listing.pricePerNight)} × {nights} night{nights > 1 ? 's' : ''}
                      </span>
                      <span>{money(total)}</span>
                    </div>
                    <div className="price-row price-total">
                      <span>Total</span>
                      <span>{money(total)}</span>
                    </div>
                  </div>
                )}

                {booking.error && <p className="form-error">{booking.error}</p>}

                {user ? (
                  <button type="submit" className="btn btn-primary btn-block" disabled={booking.submitting}>
                    {booking.submitting ? 'Booking…' : nights > 0 ? `Reserve · ${money(total)}` : 'Reserve'}
                  </button>
                ) : (
                  <Link to="/login" state={{ from: `/listings/${id}` }} className="btn btn-primary btn-block">
                    Log in to book
                  </Link>
                )}
                <p className="booking-note">You won’t be charged yet</p>
              </form>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
