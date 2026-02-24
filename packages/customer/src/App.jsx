import React from 'react';
import { Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import RepairQuiz from './pages/RepairQuiz';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import RepairDetailPage from './pages/RepairDetailPage';
import ProfilePage from './pages/ProfilePage';
import FAQPage from './pages/FAQPage';
import LegalPage from './pages/LegalPage';
import InvoicePage from './pages/InvoicePage';
import ProtectedRoute from './components/ProtectedRoute';

export default function App() {
    return (
        <div className="app">
            <Routes>
                <Route path="/" element={<LandingPage />} />
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
            </Routes>
        </div>
    );
}
