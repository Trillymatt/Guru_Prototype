import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import QueuePage from './pages/QueuePage';
import HistoryPage from './pages/HistoryPage';
import ProfilePage from './pages/ProfilePage';
import RepairDetailPage from './pages/RepairDetailPage';
import SchedulePage from './pages/SchedulePage';
import ProtectedRoute from './components/ProtectedRoute';

export default function App() {
    return (
        <div className="app app--tech dark">
            <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route
                    path="/queue"
                    element={
                        <ProtectedRoute>
                            <QueuePage />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/history"
                    element={
                        <ProtectedRoute>
                            <HistoryPage />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/schedule"
                    element={
                        <ProtectedRoute>
                            <SchedulePage />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/profile"
                    element={
                        <ProtectedRoute>
                            <ProfilePage />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/repair/:id"
                    element={
                        <ProtectedRoute>
                            <RepairDetailPage />
                        </ProtectedRoute>
                    }
                />
                <Route path="*" element={<Navigate to="/queue" replace />} />
            </Routes>
        </div>
    );
}
