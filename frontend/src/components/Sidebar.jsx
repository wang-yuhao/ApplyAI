import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard,
    User,
    Search,
    FileStack,
    Target,
    MessageSquare,
    LogOut,
    Briefcase,
} from 'lucide-react';
import { removeAuthToken } from '../services/auth';

export default function Sidebar({ onNavigate }) {
    const navigate = useNavigate();

    const menuItems = [
        { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
        { path: '/profile', icon: User, label: 'Profile & Materials' },
        { path: '/search', icon: Search, label: 'Job Search' },
        { path: '/material-preparation', icon: FileStack, label: 'Application Materials' },
        { path: '/interview', icon: MessageSquare, label: 'Interview Practice' },
        { path: '/tracking', icon: Target, label: 'Application Tracking' },
    ];

    const handleLogout = () => {
        removeAuthToken();
        navigate('/login');
    };

    return (
        <div className="w-64 bg-white shadow-lg h-full flex flex-col">
            <div className="p-6 border-b">
                <div className="flex items-center space-x-3">
                    <div className="bg-blue-500 p-2 rounded-lg">
                        <Briefcase size={24} className="text-white" />
                    </div>
                    <div>
                        <h1 className="font-bold text-gray-800">APPAI</h1>
                        <p className="text-xs text-gray-500">AI Assistant</p>
                    </div>
                </div>
            </div>

            <nav className="flex-1 p-4 space-y-2">
                {menuItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        onClick={onNavigate}
                        className={({ isActive }) =>
                            `flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${isActive
                                ? 'bg-blue-500 text-white'
                                : 'text-gray-700 hover:bg-gray-100'
                            }`
                        }
                    >
                        <item.icon size={20} />
                        <span className="font-medium">{item.label}</span>
                    </NavLink>
                ))}
            </nav>

            <div className="p-4 border-t">
                <button
                    onClick={handleLogout}
                    className="flex items-center space-x-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-red-50 hover:text-red-600 transition-colors w-full"
                >
                    <LogOut size={20} />
                    <span className="font-medium">Logout</span>
                </button>
            </div>
        </div>
    );
}