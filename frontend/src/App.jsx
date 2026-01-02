import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Profile from './components/Profile';
import JobSearch from './components/JobSearch';
import JobDetail from './components/JobDetail';
import Interview from './components/Interview';
import ApplicationTracking from './components/ApplicationTracking';
import MaterialPreparation from './components/MaterialPreparation';
import Login from './components/Login';
import { isAuthenticated } from './services/auth';


const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

function PrivateRoute({ children }) {
    return isAuthenticated() ? children : <Navigate to="/login" />;
}

function App() {
    return (
        <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
            <BrowserRouter>
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route
                        path="/"
                        element={
                            <PrivateRoute>
                                <Layout />
                            </PrivateRoute>
                        }
                    >
                        <Route index element={<Dashboard />} />
                        <Route path="profile" element={<Profile />} />
                        <Route path="search" element={<JobSearch />} />
                        <Route path="job/:jobId" element={<JobDetail />} />
                        <Route path="material-preparation" element={<MaterialPreparation />} />
                        <Route path="interview/:applicationId" element={<Interview />} />
                        <Route path="tracking/:applicationId" element={<ApplicationTracking />} />
                    </Route>
                </Routes>
            </BrowserRouter>
        </GoogleOAuthProvider>
    );
}

export default App;
