import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import HomePage from './pages/HomePage';
import ListingDetailPage from './pages/ListingDetailPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import HostDashboardPage from './pages/HostDashboardPage';
import ListingFormPage from './pages/ListingFormPage';
import MyTripsPage from './pages/MyTripsPage';
import NotFoundPage from './pages/NotFoundPage';

export default function App() {
  return (
    <>
      <Navbar />
      <main>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/listings/:id" element={<ListingDetailPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/host"
            element={
              <ProtectedRoute role="host">
                <HostDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/host/new"
            element={
              <ProtectedRoute role="host">
                <ListingFormPage mode="create" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/host/listings/:id/edit"
            element={
              <ProtectedRoute role="host">
                <ListingFormPage mode="edit" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/trips"
            element={
              <ProtectedRoute>
                <MyTripsPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
    </>
  );
}
