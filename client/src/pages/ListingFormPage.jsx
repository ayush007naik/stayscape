import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import Spinner from '../components/Spinner';

const TYPES = ['apartment', 'house', 'villa', 'cabin', 'loft', 'condo', 'cottage', 'room'];
const AMENITY_OPTIONS = [
  'Wifi',
  'Kitchen',
  'Free parking',
  'Air conditioning',
  'Heating',
  'Pool',
  'Hot tub',
  'Gym',
  'Fireplace',
  'Garden',
  'Workspace',
  'Sea view',
  'Mountain view',
  'City view',
  'Desert view',
  'Jungle view',
  'Breakfast included',
];

const EMPTY = {
  title: '',
  description: '',
  type: 'apartment',
  city: '',
  country: '',
  address: '',
  lat: '',
  lng: '',
  pricePerNight: '',
  guests: 2,
  bedrooms: 1,
  beds: 1,
  baths: 1,
  amenities: ['Wifi', 'Kitchen'],
  imagesText: '',
};

export default function ListingFormPage({ mode = 'create' }) {
  const { id } = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(mode === 'edit');
  const [loadError, setLoadError] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (mode !== 'edit') return;
    let alive = true;
    setLoading(true);
    api
      .getListing(id)
      .then((listing) => {
        if (!alive) return;
        setForm({
          title: listing.title,
          description: listing.description,
          type: listing.type,
          city: listing.city,
          country: listing.country,
          address: listing.address || '',
          lat: listing.lat ?? '',
          lng: listing.lng ?? '',
          pricePerNight: listing.pricePerNight,
          guests: listing.guests,
          bedrooms: listing.bedrooms,
          beds: listing.beds,
          baths: listing.baths,
          amenities: listing.amenities || [],
          imagesText: (listing.images || []).join('\n'),
        });
      })
      .catch((err) => {
        if (alive) setLoadError(err.message);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [id, mode]);

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const toggleAmenity = (amenity) =>
    setForm((f) => ({
      ...f,
      amenities: f.amenities.includes(amenity)
        ? f.amenities.filter((a) => a !== amenity)
        : [...f.amenities, amenity],
    }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    const payload = {
      title: form.title,
      description: form.description,
      type: form.type,
      city: form.city,
      country: form.country,
      address: form.address,
      lat: form.lat === '' ? null : Number(form.lat),
      lng: form.lng === '' ? null : Number(form.lng),
      pricePerNight: Number(form.pricePerNight),
      guests: Number(form.guests),
      bedrooms: Number(form.bedrooms),
      beds: Number(form.beds),
      baths: Number(form.baths),
      amenities: form.amenities,
      images: form.imagesText
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
    };
    try {
      if (mode === 'edit') await api.updateListing(id, payload);
      else await api.createListing(payload);
      navigate('/host');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Spinner label="Loading listing…" />;

  if (loadError) {
    return (
      <div className="container page">
        <div className="empty-state">
          <h2>Couldn’t load listing</h2>
          <p>{loadError}</p>
          <button type="button" className="btn btn-primary" onClick={() => navigate('/host')}>
            Back to dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container page form-page">
      <div className="page-head">
        <div>
          <h1 className="page-title">{mode === 'edit' ? 'Edit listing' : 'Create a new listing'}</h1>
          <p className="page-sub">Give guests a clear, inviting picture of what to expect.</p>
        </div>
      </div>

      <form className="listing-form" onSubmit={submit}>
        <section className="form-section">
          <h2>Basics</h2>
          <label className="field">
            <span>Title</span>
            <input
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder="e.g. Sunlit loft near the beach"
              required
            />
          </label>
          <label className="field">
            <span>Description</span>
            <textarea
              rows={5}
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder="Describe the space, the neighbourhood and what makes it special."
              required
            />
          </label>
          <div className="field-row">
            <label className="field">
              <span>Property type</span>
              <select value={form.type} onChange={(e) => set('type', e.target.value)}>
                {TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t[0].toUpperCase() + t.slice(1)}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Price per night (₹)</span>
              <input
                type="number"
                min="1"
                value={form.pricePerNight}
                onChange={(e) => set('pricePerNight', e.target.value)}
                required
              />
            </label>
          </div>
        </section>

        <section className="form-section">
          <h2>Location</h2>
          <div className="field-row">
            <label className="field">
              <span>City</span>
              <input value={form.city} onChange={(e) => set('city', e.target.value)} required />
            </label>
            <label className="field">
              <span>Country</span>
              <input value={form.country} onChange={(e) => set('country', e.target.value)} required />
            </label>
          </div>
          <label className="field">
            <span>Address / area (optional)</span>
            <input value={form.address} onChange={(e) => set('address', e.target.value)} />
          </label>
          <div className="field-row">
            <label className="field">
              <span>Latitude (for map)</span>
              <input
                type="number"
                step="any"
                value={form.lat}
                onChange={(e) => set('lat', e.target.value)}
                placeholder="e.g. 19.076"
              />
            </label>
            <label className="field">
              <span>Longitude (for map)</span>
              <input
                type="number"
                step="any"
                value={form.lng}
                onChange={(e) => set('lng', e.target.value)}
                placeholder="e.g. 72.8777"
              />
            </label>
          </div>
        </section>

        <section className="form-section">
          <h2>Capacity</h2>
          <div className="field-row field-row-4">
            {[
              ['guests', 'Guests'],
              ['bedrooms', 'Bedrooms'],
              ['beds', 'Beds'],
              ['baths', 'Baths'],
            ].map(([key, label]) => (
              <label key={key} className="field">
                <span>{label}</span>
                <input
                  type="number"
                  min="1"
                  value={form[key]}
                  onChange={(e) => set(key, e.target.value)}
                  required
                />
              </label>
            ))}
          </div>
        </section>

        <section className="form-section">
          <h2>Amenities</h2>
          <div className="amenity-picker">
            {AMENITY_OPTIONS.map((amenity) => (
              <button
                key={amenity}
                type="button"
                className={`amenity-chip ${form.amenities.includes(amenity) ? 'is-on' : ''}`}
                onClick={() => toggleAmenity(amenity)}
              >
                {form.amenities.includes(amenity) ? '✓ ' : '+ '}
                {amenity}
              </button>
            ))}
          </div>
        </section>

        <section className="form-section">
          <h2>Photos</h2>
          <label className="field">
            <span>Image URLs (one per line)</span>
            <textarea
              rows={4}
              value={form.imagesText}
              onChange={(e) => set('imagesText', e.target.value)}
              placeholder={'https://example.com/photo-1.jpg\nhttps://example.com/photo-2.jpg'}
            />
          </label>
          <p className="field-hint">Tip: paste direct image links. The first image becomes the cover photo.</p>
        </section>

        {error && <p className="form-error">{error}</p>}

        <div className="form-actions">
          <button type="button" className="btn btn-ghost" onClick={() => navigate('/host')}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Saving…' : mode === 'edit' ? 'Save changes' : 'Publish listing'}
          </button>
        </div>
      </form>
    </div>
  );
}
