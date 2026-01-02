import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Briefcase, TrendingUp, Clock, CheckCircle, Calendar,
    ArrowRight, Target, Award, FileText, Loader
} from 'lucide-react';
import { applicationsAPI, jobsAPI } from '../services/api';

export default function Dashboard() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [applications, setApplications] = useState([]);
    const [recentJobs, setRecentJobs] = useState([]);
    const [stats, setStats] = useState({
        total: 0,
        applied: 0,
        interviews: 0,
        offers: 0
    });

    useEffect(() => {
        loadDashboardData();
    }, []);

    const loadDashboardData = async () => {
        setLoading(true);
        try {
            // Load applications
            const { data: appsData } = await applicationsAPI.getApplications();
            const apps = appsData.applications || [];
            setApplications(apps);

            // Calculate stats
            const stats = {
                total: apps.length,
                applied: apps.filter(a => a && a.status === 'applied').length,
                interviews: apps.filter(a => a && a.status === 'interview').length,
                offers: apps.filter(a => a && a.status === 'offer').length
            };
            setStats(stats);

        } catch (error) {
            console.error('Failed to load dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    // ✅ FIX: Safely filter applications - check for undefined/null
    const recentApplications = applications
        .filter(app => app && app.job_title)  // ✅ FIXED: Check app exists before accessing properties
        .slice(0, 5);

    const upcomingInterviews = applications
        .filter(app => app && app.status === 'interview')  // ✅ FIXED: Check app exists
        .slice(0, 3);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader className="animate-spin text-blue-500" size={48} />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
                <p className="text-gray-600 mt-2">Track your job search progress</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Total Applications"
                    value={stats.total}
                    icon={Briefcase}
                    color="blue"
                />
                <StatCard
                    title="Applied"
                    value={stats.applied}
                    icon={CheckCircle}
                    color="green"
                />
                <StatCard
                    title="Interviews"
                    value={stats.interviews}
                    icon={Calendar}
                    color="purple"
                />
                <StatCard
                    title="Offers"
                    value={stats.offers}
                    icon={Award}
                    color="yellow"
                />
            </div>

            {/* Quick Actions */}
            <div className="grid md:grid-cols-3 gap-6">
                <QuickActionCard
                    title="Search Jobs"
                    description="Find new opportunities"
                    icon={Target}
                    color="blue"
                    onClick={() => navigate('/search')}
                />
                <QuickActionCard
                    title="View Applications"
                    description="Track your progress"
                    icon={FileText}
                    color="green"
                    onClick={() => navigate('/tracking')}
                />
                <QuickActionCard
                    title="Interview Prep"
                    description="Prepare for interviews"
                    icon={TrendingUp}
                    color="purple"
                    onClick={() => navigate('/interview')}
                />
            </div>

            {/* Recent Applications */}
            <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-gray-800">Recent Applications</h2>
                    <button
                        onClick={() => navigate('/tracking')}
                        className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1"
                    >
                        View All
                        <ArrowRight size={16} />
                    </button>
                </div>

                {recentApplications.length === 0 ? (
                    <div className="text-center py-8">
                        <Briefcase className="mx-auto text-gray-400 mb-2" size={48} />
                        <p className="text-gray-600">No applications yet</p>
                        <button
                            onClick={() => navigate('/search')}
                            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                            Start Searching
                        </button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {recentApplications.map((app) => (
                            <div
                                key={app.id}
                                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-blue-300 cursor-pointer"
                                onClick={() => navigate(`/applications/${app.id}`)}
                            >
                                <div className="flex-1">
                                    <h3 className="font-semibold text-gray-800">{app.job_title}</h3>
                                    <p className="text-sm text-gray-600">{app.company_name}</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    {app.match_score && (
                                        <span className="text-sm font-semibold text-green-600">
                                            {app.match_score}% Match
                                        </span>
                                    )}
                                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(app.status)}`}>
                                        {app.status}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Upcoming Interviews */}
            {upcomingInterviews.length > 0 && (
                <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-xl font-bold text-gray-800 mb-4">Upcoming Interviews</h2>
                    <div className="space-y-3">
                        {upcomingInterviews.map((app) => (
                            <div
                                key={app.id}
                                className="flex items-center justify-between p-4 bg-purple-50 border border-purple-200 rounded-lg"
                            >
                                <div>
                                    <h3 className="font-semibold text-gray-800">{app.job_title}</h3>
                                    <p className="text-sm text-gray-600">{app.company_name}</p>
                                </div>
                                <button
                                    onClick={() => navigate(`/interview/${app.id}`)}
                                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                                >
                                    Prepare
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function StatCard({ title, value, icon: Icon, color }) {
    const colors = {
        blue: 'bg-blue-50 text-blue-600',
        green: 'bg-green-50 text-green-600',
        purple: 'bg-purple-50 text-purple-600',
        yellow: 'bg-yellow-50 text-yellow-600'
    };

    return (
        <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm text-gray-600 mb-1">{title}</p>
                    <p className="text-3xl font-bold text-gray-800">{value}</p>
                </div>
                <div className={`p-3 rounded-lg ${colors[color]}`}>
                    <Icon size={24} />
                </div>
            </div>
        </div>
    );
}

function QuickActionCard({ title, description, icon: Icon, color, onClick }) {
    const colors = {
        blue: 'bg-blue-50 border-blue-200 hover:border-blue-400 text-blue-600',
        green: 'bg-green-50 border-green-200 hover:border-green-400 text-green-600',
        purple: 'bg-purple-50 border-purple-200 hover:border-purple-400 text-purple-600'
    };

    return (
        <button
            onClick={onClick}
            className={`p-6 border-2 rounded-lg transition-all text-left ${colors[color]}`}
        >
            <Icon size={32} className="mb-3" />
            <h3 className="font-bold text-gray-800 mb-1">{title}</h3>
            <p className="text-sm text-gray-600">{description}</p>
        </button>
    );
}

function getStatusColor(status) {
    const colors = {
        saved: 'bg-gray-100 text-gray-800',
        applied: 'bg-blue-100 text-blue-800',
        reviewing: 'bg-yellow-100 text-yellow-800',
        interview: 'bg-purple-100 text-purple-800',
        offer: 'bg-green-100 text-green-800',
        rejected: 'bg-red-100 text-red-800'
    };
    return colors[status] || colors.saved;
}