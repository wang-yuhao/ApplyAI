import React from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useNavigate } from 'react-router-dom';
import { Briefcase } from 'lucide-react';
import { authAPI } from '../services/api';
import { setAuthToken } from '../services/auth';

export default function Login() {
    console.log("GOOGLE CLIENT ID:", import.meta.env.VITE_GOOGLE_CLIENT_ID);

    const navigate = useNavigate();

    const handleSuccess = async (credentialResponse) => {
        try {
            const { data } = await authAPI.googleLogin(credentialResponse.credential);
            setAuthToken(data.access_token);
            setTimeout(() => {
                navigate('/', { replace: true });
            }, 100);
        } catch (error) {
            console.error('Login failed:', error);
            alert('Login failed. Please try again.');
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
                <div className="flex justify-center mb-6">
                    <div className="bg-blue-500 p-4 rounded-full">
                        <Briefcase size={48} className="text-white" />
                    </div>
                </div>

                <h1 className="text-3xl font-bold text-center text-gray-800 mb-2">
                    Job Application Pipeline
                </h1>
                <p className="text-center text-gray-600 mb-8">
                    AI-powered job application management
                </p>

                <div className="flex justify-center">
                    <GoogleLogin
                        onSuccess={handleSuccess}
                        onError={() => alert('Login failed')}
                        useOneTap
                    />
                </div>

                <div className="mt-8 text-center text-sm text-gray-500">
                    <p>Sign in with Google to get started</p>
                </div>
            </div>
        </div>
    );
}
