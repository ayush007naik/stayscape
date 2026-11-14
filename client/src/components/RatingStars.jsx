export default function RatingStars({ rating, count, showCount = true }) {
  if (rating == null) {
    return <span className="rating rating-empty">New</span>;
  }
  return (
    <span className="rating" title={`${rating} out of 5`}>
      <span className="rating-star" aria-hidden="true">
        ★
      </span>
      <span className="rating-value">{Number(rating).toFixed(1)}</span>
      {showCount && count != null && <span className="rating-count">({count})</span>}
    </span>
  );
}
