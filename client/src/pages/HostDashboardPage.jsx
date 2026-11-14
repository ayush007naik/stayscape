import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/Spinner';
import RatingStars from '../components/RatingStars';

const money = (n) => `₹${Number(n).toLocaleString('en-IN')}`;
const fmtDate = (s) =>
  s ? new Date(`${s}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

function statusOf(booking) {
  if (booking.status === 'cancelled') return { key: 'cancelled', label: 'Cancelled' };
  if (booking.checkOut <= new Date().toISOString().slice(0, 10)) return { key: 'past', label: 'Completed' };
  return { key: 'upcoming', label: 'Upcoming' };
}

export default function HostDashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [listings, setListings] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);

  const load = () => {
    setLoading(true);
    setError('');
    Promise.all([api.hostStats(), api.hostListings(), api.hostBookings()])
      .then(([statsData, listingsData, bookingsData]) => {
        setStats(statsData);
        setListings(listingsData.data);
        setBookings(bookingsData.data);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const removeListing = async (listing) => {
    if (!window.confirm(`Delete “${listing.title}”? Guests will no longer see it.`)) return;
    setBusyId(listing.id);
    try {
      await api.deleteListing(listing.id);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <Spinner label="Loading your dashboard…" />;

  return (
    <div className="container page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Host dashboard</h1>
          <p className="page-sub">Welcome back, {user?.name}. Here’s how your stays are doing.</p>
        </div>
        <Link to="/host/new" className="btn btn-primary">
          + New listing
        </Link>
      </div>

      {error && <p className="form-error">{error}</p>}

      <div className="stat-grid">
        <div className="stat-card">
          <span className="stat-label">Listings</span>
          <span className="stat-value">{stats?.totalListings ?? 0}</span>
          <span className="stat-hint">{stats?.activeListings ?? 0} active</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Bookings</span>
          <span className="stat-value">{stats?.totalBookings ?? 0}</span>
          <span className="stat-hint">{stats?.upcomingBookings ?? 0} upcoming</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Revenue</span>
          <span className="stat-value">{money(stats?.revenue ?? 0)}</span>
          <span className="stat-hint">from confirmed stays</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Rating</span>
          <span className="stat-value">
            {stats?.avgRating ? (
              <>
                <span className="rating-star">★</span> {Number(stats.avgRating).toFixed(1)}
              </>
            ) : (
              '—'
            )}
          </span>
          <span className="stat-hint">{stats?.reviewCount ?? 0} reviews</span>
        </div>
      </div>

      <section className="dash-section">
        <div className="dash-section-head">
          <h2 className="section-title">Your listings</h2>
          <Link to="/host/new" className="btn btn-ghost">
            Add listing
          </Link>
        </div>

        {listings.length === 0 ? (
          <div className="empty-state">
            <h3>No listings yet</h3>
            <p>Create your first listing and start welcoming guests.</p>
            <Link to="/host/new" className="btn btn-primary">
              Create a listing
            </Link>
          </div>
        ) : (
          <div className="host-listing-grid">
            {listings.map((listing) => (
              <article key={listing.id} className={`host-listing-card ${listing.isActive ? '' : 'is-inactive'}`}>
                <div className="host-listing-media">
                  {listing.images?.[0] ? (
                    <img src={listing.images[0]} alt={listing.title} loading="lazy" />
                  ) : (
                    <span className="trip-media-fallback">◈</span>
                  )}
                  <span className={`status-badge ${listing.isActive ? 'status-upcoming' : 'status-cancelled'}`}>
                    {listing.isActive ? 'Active' : 'Hidden'}
                  </span>
                </div>
                <div className="host-listing-body">
                  <h3>{listing.title}</h3>
                  <p className="host-listing-loc">
                    {listing.city}, {listing.country}
                  </p>
                  <div className="host-listing-meta">
                    <RatingStars rating={listing.avgRating} count={listing.reviewCount} />
                    <span>{listing.bookingCount} bookings</span>
                  </div>
                  <div className="host-listing-foot">
                    <span className="host-listing-price">{money(listing.pricePerNight)} / night</span>
                    <div className="host-listing-actions">
                      <Link to={`/listings/${listing.id}`} className="btn btn-ghost btn-sm">
                        View
                      </Link>
                      <Link to={`/host/listings/${listing.id}/edit`} className="btn btn-ghost btn-sm">
                        Edit
                      </Link>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm btn-danger"
                        onClick={() => removeListing(listing)}
                        disabled={busyId === listing.id}
                      >
                        {busyId === listing.id ? 'Deleting…' : 'Delete'}
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="dash-section">
        <div className="dash-section-head">
          <h2 className="section-title">Bookings</h2>
          <span className="page-sub">{bookings.length} total</span>
        </div>

        {bookings.length === 0 ? (
          <div className="empty-state">
            <h3>No bookings yet</h3>
            <p>Once guests book your places, their stays will appear here.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Guest</th>
                  <th>Listing</th>
                  <th>Dates</th>
                  <th>Guests</th>
                  <th>Total</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((booking) => {
                  const status = statusOf(booking);
                  return (
                    <tr key={booking.id}>
                      <td>
                        <strong>{booking.guest?.name || 'Guest'}</strong>
                        <div className="cell-sub">{booking.guest?.email}</div>
                      </td>
                      <td>
                        {booking.listing?.title}
                        <div className="cell-sub">
                          {booking.listing?.city}, {booking.listing?.country}
                        </div>
                      </td>
                      <td>
                        {fmtDate(booking.checkIn)}
                        <div className="cell-sub">to {fmtDate(booking.checkOut)}</div>
                      </td>
                      <td>{booking.guests}</td>
                      <td>{money(booking.totalPrice)}</td>
                      <td>
                        <span className={`status-badge status-${status.key}`}>{status.label}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
