import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import Spinner from '../components/Spinner';

const money = (n) => `₹${Number(n).toLocaleString('en-IN')}`;
const fmtDate = (s) =>
  s ? new Date(`${s}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
const todayISO = () => new Date().toISOString().slice(0, 10);

function statusOf(booking) {
  if (booking.status === 'cancelled') return { key: 'cancelled', label: 'Cancelled' };
  if (booking.checkOut <= todayISO()) return { key: 'past', label: 'Completed' };
  return { key: 'upcoming', label: 'Upcoming' };
}

export default function MyTripsPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [reviewingId, setReviewingId] = useState(null);
  const [reviewDraft, setReviewDraft] = useState({ rating: 5, comment: '' });
  const [reviewError, setReviewError] = useState('');

  const load = () => {
    setLoading(true);
    api
      .myTrips()
      .then((data) => setBookings(data.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const upcoming = useMemo(
    () => bookings.filter((b) => statusOf(b).key === 'upcoming').length,
    [bookings]
  );

  const cancel = async (booking) => {
    if (!window.confirm('Cancel this booking? This cannot be undone.')) return;
    setBusyId(booking.id);
    try {
      const updated = await api.cancelBooking(booking.id);
      setBookings((list) => list.map((b) => (b.id === booking.id ? { ...b, ...updated } : b)));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const startReview = (booking) => {
    setReviewingId(booking.id);
    setReviewDraft({ rating: 5, comment: '' });
    setReviewError('');
  };

  const submitReview = async (booking) => {
    setReviewError('');
    try {
      await api.createReview(booking.listingId, {
        booking_id: booking.id,
        rating: Number(reviewDraft.rating),
        comment: reviewDraft.comment,
      });
      setBookings((list) =>
        list.map((b) => (b.id === booking.id ? { ...b, reviewed: true, status: 'completed' } : b))
      );
      setReviewingId(null);
    } catch (err) {
      setReviewError(err.message);
    }
  };

  if (loading) return <Spinner label="Loading your trips…" />;

  return (
    <div className="container page">
      <div className="page-head">
        <div>
          <h1 className="page-title">My trips</h1>
          <p className="page-sub">
            {bookings.length} booking{bookings.length === 1 ? '' : 's'} · {upcoming} upcoming
          </p>
        </div>
        <Link to="/" className="btn btn-primary">
          Find a stay
        </Link>
      </div>

      {error && <p className="form-error">{error}</p>}

      {bookings.length === 0 ? (
        <div className="empty-state">
          <h3>No trips yet</h3>
          <p>When you book a stay it will show up here.</p>
          <Link to="/" className="btn btn-primary">
            Explore stays
          </Link>
        </div>
      ) : (
        <ul className="trip-list">
          {bookings.map((booking) => {
            const status = statusOf(booking);
            const canCancel = status.key === 'upcoming' && booking.status !== 'cancelled';
            const canReview = status.key === 'past' && booking.status !== 'cancelled' && !booking.reviewed;
            return (
              <li key={booking.id} className="trip-card">
                <Link to={`/listings/${booking.listingId}`} className="trip-media">
                  {booking.listing?.image ? (
                    <img src={booking.listing.image} alt={booking.listing?.title} loading="lazy" />
                  ) : (
                    <span className="trip-media-fallback">◈</span>
                  )}
                </Link>
                <div className="trip-body">
                  <div className="trip-top">
                    <div>
                      <h3 className="trip-title">{booking.listing?.title || `Listing #${booking.listingId}`}</h3>
                      <p className="trip-location">
                        {booking.listing?.city}
                        {booking.listing?.country ? `, ${booking.listing.country}` : ''}
                      </p>
                    </div>
                    <span className={`status-badge status-${status.key}`}>{status.label}</span>
                  </div>

                  <div className="trip-meta">
                    <span>
                      {fmtDate(booking.checkIn)} → {fmtDate(booking.checkOut)}
                    </span>
                    <span>
                      {booking.guests} guest{booking.guests > 1 ? 's' : ''}
                    </span>
                    <span className="trip-total">{money(booking.totalPrice)}</span>
                  </div>

                  {(canCancel || canReview) && (
                    <div className="trip-actions">
                      {canCancel && (
                        <button
                          type="button"
                          className="btn btn-ghost btn-danger"
                          onClick={() => cancel(booking)}
                          disabled={busyId === booking.id}
                        >
                          {busyId === booking.id ? 'Cancelling…' : 'Cancel booking'}
                        </button>
                      )}
                      {canReview && reviewingId !== booking.id && (
                        <button type="button" className="btn btn-primary" onClick={() => startReview(booking)}>
                          Leave a review
                        </button>
                      )}
                    </div>
                  )}

                  {booking.reviewed && <p className="trip-reviewed">✓ You reviewed this stay</p>}

                  {reviewingId === booking.id && (
                    <div className="review-form">
                      <div className="review-form-head">
                        <span>Rate your stay</span>
                        <div className="star-picker">
                          {[1, 2, 3, 4, 5].map((n) => (
                            <button
                              key={n}
                              type="button"
                              className={n <= reviewDraft.rating ? 'star is-on' : 'star'}
                              onClick={() => setReviewDraft((d) => ({ ...d, rating: n }))}
                              aria-label={`${n} star`}
                            >
                              ★
                            </button>
                          ))}
                        </div>
                      </div>
                      <textarea
                        rows={3}
                        placeholder="Share what stood out about your stay…"
                        value={reviewDraft.comment}
                        onChange={(e) => setReviewDraft((d) => ({ ...d, comment: e.target.value }))}
                      />
                      {reviewError && <p className="form-error">{reviewError}</p>}
                      <div className="trip-actions">
                        <button type="button" className="btn btn-primary" onClick={() => submitReview(booking)}>
                          Submit review
                        </button>
                        <button type="button" className="btn btn-ghost" onClick={() => setReviewingId(null)}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
