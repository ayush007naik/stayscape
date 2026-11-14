import { useEffect, useState } from 'react';
import { api } from '../api';
import ListingCard from '../components/ListingCard';

const DEFAULT_FILTERS = {
  q: '',
  type: '',
  minPrice: '',
  maxPrice: '',
  guests: '',
  bedrooms: '',
  sort: 'newest',
  page: 1,
};

const TYPES = ['apartment', 'house', 'villa', 'cabin', 'loft', 'condo', 'cottage', 'room'];
const DESTINATIONS = ['Mumbai', 'Goa', 'Manali', 'Paris', 'Ubud', 'Florence'];

export default function HomePage() {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [draft, setDraft] = useState({ q: '', guests: '' });
  const [result, setResult] = useState({ data: [], total: 0, totalPages: 1, page: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError('');
    api
      .listListings(filters)
      .then((data) => {
        if (alive) setResult(data);
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
  }, [filters]);

  const update = (patch) => setFilters((prev) => ({ ...prev, ...patch, page: patch.page ?? 1 }));

  const submitSearch = (e) => {
    e.preventDefault();
    update({ q: draft.q, guests: draft.guests });
  };

  const pickDestination = (city) => {
    setDraft((d) => ({ ...d, q: city }));
    update({ q: city });
  };

  const reset = () => {
    setFilters(DEFAULT_FILTERS);
    setDraft({ q: '', guests: '' });
  };

  const changePage = (page) => setFilters((prev) => ({ ...prev, page }));

  return (
    <div className="home">
      <section className="hero">
        <div className="container hero-inner">
          <p className="hero-eyebrow">Find your next escape</p>
          <h1 className="hero-title">Stays that feel like somewhere else.</h1>
          <p className="hero-sub">
            Handpicked homes, cabins and villas across India and beyond. Search, compare and book in seconds.
          </p>

          <form className="hero-search" onSubmit={submitSearch}>
            <div className="hero-field">
              <label htmlFor="search-destination">Destination</label>
              <input
                id="search-destination"
                placeholder="Where to?"
                value={draft.q}
                onChange={(e) => setDraft((d) => ({ ...d, q: e.target.value }))}
              />
            </div>
            <div className="hero-field hero-field-sm">
              <label htmlFor="search-guests">Guests</label>
              <input
                id="search-guests"
                type="number"
                min="1"
                placeholder="Any"
                value={draft.guests}
                onChange={(e) => setDraft((d) => ({ ...d, guests: e.target.value }))}
              />
            </div>
            <button type="submit" className="btn btn-primary hero-search-btn">
              Search
            </button>
          </form>

          <div className="hero-chips">
            {DESTINATIONS.map((city) => (
              <button
                key={city}
                type="button"
                className={`chip ${filters.q === city ? 'chip-active' : ''}`}
                onClick={() => pickDestination(city)}
              >
                {city}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="container listings-section">
        <div className="listings-header">
          <div>
            <h2 className="section-title">Explore stays</h2>
            <p className="section-sub">
              {loading ? 'Finding great places…' : `${result.total} place${result.total === 1 ? '' : 's'} available`}
            </p>
          </div>

          <div className="filters">
            <select
              className="input input-inline"
              value={filters.type}
              onChange={(e) => update({ type: e.target.value })}
              aria-label="Property type"
            >
              <option value="">All types</option>
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {t[0].toUpperCase() + t.slice(1)}
                </option>
              ))}
            </select>
            <input
              className="input input-inline input-narrow"
              type="number"
              min="0"
              placeholder="Min ₹"
              value={filters.minPrice}
              onChange={(e) => update({ minPrice: e.target.value })}
              aria-label="Minimum price"
            />
            <input
              className="input input-inline input-narrow"
              type="number"
              min="0"
              placeholder="Max ₹"
              value={filters.maxPrice}
              onChange={(e) => update({ maxPrice: e.target.value })}
              aria-label="Maximum price"
            />
            <select
              className="input input-inline"
              value={filters.bedrooms}
              onChange={(e) => update({ bedrooms: e.target.value })}
              aria-label="Bedrooms"
            >
              <option value="">Any beds</option>
              <option value="1">1+ bedroom</option>
              <option value="2">2+ bedrooms</option>
              <option value="3">3+ bedrooms</option>
              <option value="4">4+ bedrooms</option>
            </select>
            <select
              className="input input-inline"
              value={filters.sort}
              onChange={(e) => update({ sort: e.target.value })}
              aria-label="Sort by"
            >
              <option value="newest">Newest</option>
              <option value="price_asc">Price: low to high</option>
              <option value="price_desc">Price: high to low</option>
              <option value="rating">Top rated</option>
            </select>
            <button type="button" className="btn btn-ghost" onClick={reset}>
              Reset
            </button>
          </div>
        </div>

        {loading && (
          <div className="listing-grid">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="listing-card skeleton-card">
                <div className="skeleton skeleton-media" />
                <div className="listing-card-body">
                  <div className="skeleton skeleton-line w-70" />
                  <div className="skeleton skeleton-line w-40" />
                  <div className="skeleton skeleton-line w-50" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="empty-state">
            <h3>Couldn’t load stays</h3>
            <p>{error}</p>
            <button type="button" className="btn btn-primary" onClick={() => setFilters({ ...filters })}>
              Try again
            </button>
          </div>
        )}

        {!loading && !error && result.data.length === 0 && (
          <div className="empty-state">
            <h3>No stays match your filters</h3>
            <p>Try widening your price range or searching a different destination.</p>
            <button type="button" className="btn btn-primary" onClick={reset}>
              Clear filters
            </button>
          </div>
        )}

        {!loading && !error && result.data.length > 0 && (
          <>
            <div className="listing-grid">
              {result.data.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>

            {result.totalPages > 1 && (
              <div className="pagination">
                <button
                  type="button"
                  className="btn btn-ghost"
                  disabled={result.page <= 1}
                  onClick={() => changePage(result.page - 1)}
                >
                  ← Previous
                </button>
                <span className="pagination-label">
                  Page {result.page} of {result.totalPages}
                </span>
                <button
                  type="button"
                  className="btn btn-ghost"
                  disabled={result.page >= result.totalPages}
                  onClick={() => changePage(result.page + 1)}
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
