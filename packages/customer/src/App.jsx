import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ErrorBoundary } from '@shared/ErrorBoundary';
import { usePageTracking } from './hooks/usePageTracking';
import ProtectedRoute from './components/ProtectedRoute';
import VanLoader from './components/VanLoader';

const LandingPage = lazy(() => import('./pages/LandingPage'));
const AdsLandingPage = lazy(() => import('./pages/AdsLandingPage'));
const HowItWorksPage = lazy(() => import('./pages/HowItWorksPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const RepairQuiz = lazy(() => import('./pages/RepairQuiz'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const RepairDetailPage = lazy(() => import('./pages/RepairDetailPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const FAQPage = lazy(() => import('./pages/FAQPage'));
const LegalPage = lazy(() => import('./pages/LegalPage'));
const InvoicePage = lazy(() => import('./pages/InvoicePage'));

function PageLoader() {
    return (
        <VanLoader text="Loading page..." />
    );
}

function NotFoundPage() {
    return (
        <div className="not-found-page">
            <h1>404</h1>
            <p>Page not found</p>
            <a href="/" className="not-found-page__link">Go Home</a>
        </div>
    );
}

export default function App() {
    usePageTracking();

    return (
        <div className="app">
            <ErrorBoundary>
                <Suspense fallback={<PageLoader />}>
                    <Routes>
                        <Route path="/" element={<LandingPage />} />
                        <Route path="/ads" element={<AdsLandingPage />} />
                        <Route path="/how-it-works" element={<HowItWorksPage />} />
                        <Route path="/about" element={<AboutPage />} />
                        <Route path="/features" element={<Navigate to="/how-it-works" replace />} />
                        <Route path="/login" element={<LoginPage />} />
                        <Route path="/repair" element={<RepairQuiz />} />
                        <Route path="/faq" element={<FAQPage />} />
                        <Route path="/legal" element={<LegalPage />} />
                        <Route path="/dashboard" element={
                            <ProtectedRoute>
                                <DashboardPage />
                            </ProtectedRoute>
                        } />
                        <Route path="/repair/:id" element={
                            <ProtectedRoute>
                                <RepairDetailPage />
                            </ProtectedRoute>
                        } />
                        <Route path="/profile" element={
                            <ProtectedRoute>
                                <ProfilePage />
                            </ProtectedRoute>
                        } />
                        <Route path="/invoice/:id" element={
                            <ProtectedRoute>
                                <InvoicePage />
                            </ProtectedRoute>
                        } />
                        <Route path="*" element={<NotFoundPage />} />
                    </Routes>
                </Suspense>
            </ErrorBoundary>
        </div>
    );
}
