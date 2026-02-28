import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ErrorBoundary } from '@shared/ErrorBoundary';
import ProtectedRoute from './components/ProtectedRoute';

const LoginPage = lazy(() => import('./pages/LoginPage'));
const QueuePage = lazy(() => import('./pages/QueuePage'));
const HistoryPage = lazy(() => import('./pages/HistoryPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const RepairDetailPage = lazy(() => import('./pages/RepairDetailPage'));
const SchedulePage = lazy(() => import('./pages/SchedulePage'));
const InventoryPage = lazy(() => import('./pages/InventoryPage'));

function PageLoader() {
    return (
        <div className="protected-route-loading">
            <div className="protected-route-loading__spinner" />
            <span>Loading...</span>
        </div>
    );
}

function NotFoundPage() {
    return (
        <div className="not-found-page">
            <h1>404</h1>
            <p>Page not found</p>
            <a href="/queue" className="not-found-page__link">Go to Queue</a>
        </div>
    );
}

export default function App() {
    return (
        <div className="app app--tech dark">
            <ErrorBoundary>
                <Suspense fallback={<PageLoader />}>
                    <Routes>
                        <Route path="/" element={<Navigate to="/queue" replace />} />
                        <Route path="/login" element={<LoginPage />} />
                        <Route path="/queue" element={<ProtectedRoute><QueuePage /></ProtectedRoute>} />
                        <Route path="/history" element={<ProtectedRoute><HistoryPage /></ProtectedRoute>} />
                        <Route path="/schedule" element={<ProtectedRoute><SchedulePage /></ProtectedRoute>} />
                        <Route path="/inventory" element={<ProtectedRoute><InventoryPage /></ProtectedRoute>} />
                        <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
                        <Route path="/repair/:id" element={<ProtectedRoute><RepairDetailPage /></ProtectedRoute>} />
                        <Route path="*" element={<NotFoundPage />} />
                    </Routes>
                </Suspense>
            </ErrorBoundary>
        </div>
    );
}
