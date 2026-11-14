import { Link } from 'react-router-dom';
import RatingStars from './RatingStars';

const FALLBACK =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400"><rect width="600" height="400" fill="#f3ece7"/><text x="50%" y="50%" font-family="sans-serif" font-size="28" fill="#b9a99c" text-anchor="middle">No photo</text></svg>'
  );

export default function ListingCard({ listing }) {
  const image = listing.images?.[0] || FALLBACK;
  return (
    <Link to={`/listings/${listing.id}`} className="listing-card">
      <div className="listing-card-media">
        <img src={image} alt={listing.title} loading="lazy" onError={(e) => (e.currentTarget.src = FALLBACK)} />
        <span className="listing-type-tag">{listing.type}</span>
      </div>
      <div className="listing-card-body">
        <div className="listing-card-top">
          <h3 className="listing-card-title">{listing.title}</h3>
          <RatingStars rating={listing.avgRating} count={listing.reviewCount} />
        </div>
        <p className="listing-card-location">
          {listing.city}, {listing.country}
        </p>
        <p className="listing-card-meta">
          {listing.guests} guests · {listing.bedrooms} bed{listing.bedrooms > 1 ? 's' : ''} · {listing.baths} bath
          {listing.baths > 1 ? 's' : ''}
        </p>
        <p className="listing-card-price">
          <strong>₹{Number(listing.pricePerNight).toLocaleString('en-IN')}</strong> / night
        </p>
      </div>
    </Link>
  );
}
