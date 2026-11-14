import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="container page">
      <div className="empty-state">
        <h1>404</h1>
        <h3>This page wandered off</h3>
        <p>The page you’re looking for doesn’t exist.</p>
        <Link to="/" className="btn btn-primary">
          Back to explore
        </Link>
      </div>
    </div>
  );
}
