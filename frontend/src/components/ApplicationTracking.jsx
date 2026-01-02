import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Loader, Send, Eye, Calendar, CheckCircle, XCircle, Clock,
    TrendingUp, FileText, Target, Mail, ArrowRight, Filter,
    Search, Edit, Trash2, MessageSquare, Star, Download,
    RefreshCw, Plus, BarChart3, Award, Briefcase, DollarSign,
    MapPin, ExternalLink
} from 'lucide-react';
import { applicationsAPI } from '../services/api';

export default function ApplicationTracking() {
    const navigate = useNavigate();

    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('recent');
    const [viewMode, setViewMode] = useState('cards'); // 'cards' or 'table'

    useEffect(() => {
        loadApplications();
    }, []);

    const loadApplications = async () => {
        setLoading(true);
        try {
            const { data } = await applicationsAPI.getApplications();
            setApplications(data.applications || []);
        } catch (error) {
            console.error('Failed to load applications:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this application?')) return;

        try {
            await applicationsAPI.deleteApplication(id);
            setApplications(prev => prev.filter(app => app.id !== id));
            alert('✅ Application deleted');
        } catch (error) {
            console.error('Failed to delete application:', error);
            alert('Failed to delete application');
        }
    };

    const handleUpdateStatus = async (id, newStatus) => {
        try {
            await applicationsAPI.updateApplication(id, { status: newStatus });
            setApplications(prev =>
                prev.map(app => app.id === id ? { ...app, status: newStatus } : app)
            );
        } catch (error) {
            console.error('Failed to update status:', error);
        }
    };

    const getStatusIcon = (status) => {
        const icons = {
            saved: <FileText className="text-gray-500" size={20} />,
            applied: <Send className="text-blue-500" size={20} />,
            reviewing: <Eye className="text-yellow-500" size={20} />,
            interview: <Calendar className="text-purple-500" size={20} />,
            offer: <CheckCircle className="text-green-500" size={20} />,
            rejected: <XCircle className="text-red-500" size={20} />,
            accepted: <Award className="text-green-600" size={20} />,
        };
        return icons[status] || <Clock className="text-gray-500" size={20} />;
    };

    const getStatusColor = (status) => {
        const colors = {
            saved: 'bg-gray-100 text-gray-800 border-gray-300',
            applied: 'bg-blue-100 text-blue-800 border-blue-300',
            reviewing: 'bg-yellow-100 text-yellow-800 border-yellow-300',
            interview: 'bg-purple-100 text-purple-800 border-purple-300',
            offer: 'bg-green-100 text-green-800 border-green-300',
            rejected: 'bg-red-100 text-red-800 border-red-300',
            accepted: 'bg-green-100 text-green-900 border-green-300',
        };
        return colors[status] || 'bg-gray-100 text-gray-800 border-gray-300';
    };

    const getMatchColor = (score) => {
        if (score >= 80) return 'text-green-600 font-bold';
        if (score >= 60) return 'text-blue-600 font-semibold';
        if (score >= 40) return 'text-yellow-600';
        return 'text-gray-600';
    };

    const getFilteredAndSortedApps = () => {
        let filtered = applications;

        // Filter by status
        if (filterStatus !== 'all') {
            filtered = filtered.filter(app => app.status === filterStatus);
        }

        // Filter by search term
        if (searchTerm) {
            filtered = filtered.filter(app =>
                app.job_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                app.company_name.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Sort
        if (sortBy === 'recent') {
            filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        } else if (sortBy === 'match') {
            filtered.sort((a, b) => (b.match_score || 0) - (a.match_score || 0));
        } else if (sortBy === 'company') {
            filtered.sort((a, b) => a.company_name.localeCompare(b.company_name));
        } else if (sortBy === 'status') {
            filtered.sort((a, b) => a.status.localeCompare(b.status));
        }

        return filtered;
    };

    const getStats = () => {
        const stats = {
            total: applications.length,
            saved: applications.filter(a => a.status === 'saved').length,
            applied: applications.filter(a => a.status === 'applied').length,
            reviewing: applications.filter(a => a.status === 'reviewing').length,
            interview: applications.filter(a => a.status === 'interview').length,
            offers: applications.filter(a => a.status === 'offer').length,
            rejected: applications.filter(a => a.status === 'rejected').length,
            avgMatch: applications.length > 0
                ? Math.round(applications.reduce((sum, a) => sum + (a.match_score || 0), 0) / applications.length)
                : 0,
            thisWeek: applications.filter(a => {
                const created = new Date(a.created_at);
                const weekAgo = new Date();
                weekAgo.setDate(weekAgo.getDate() - 7);
                return created >= weekAgo;
            }).length
        };

        stats.responseRate = stats.applied > 0
            ? Math.round(((stats.interview + stats.offers) / stats.applied) * 100)
            : 0;

        return stats;
    };

    const displayedApps = getFilteredAndSortedApps();
    const stats = getStats();

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader className="animate-spin text-blue-500" size={48} />
            </div>
        );
    }

    if (applications.length === 0) {
        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
                        <BarChart3 className="text-blue-600" />
                        Application Tracking
                    </h1>
                    <p className="text-gray-600 mt-2">Manage and track all your job applications</p>
                </div>

                <div className="bg-white rounded-lg shadow p-12 text-center">
                    <FileText className="mx-auto text-gray-400 mb-4" size={64} />
                    <h2 className="text-2xl font-bold text-gray-800 mb-4">
                        No Applications Yet
                    </h2>
                    <p className="text-gray-600 mb-6 max-w-md mx-auto">
                        Start applying to jobs to track your application progress and stay organized.
                    </p>

                    <button
                        onClick={() => navigate('/search')}
                        className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 inline-flex items-center gap-2"
                    >
                        Search Jobs
                        <ArrowRight size={20} />
                    </button>
                </div>

                {/* Features Preview */}
                <div className="grid md:grid-cols-3 gap-6">
                    <div className="bg-white rounded-lg shadow p-6">
                        <TrendingUp className="text-blue-600 mb-3" size={32} />
                        <h3 className="font-semibold text-gray-800 mb-2">Track Progress</h3>
                        <p className="text-sm text-gray-600">
                            Monitor application status from submission to offer with visual timeline
                        </p>
                    </div>

                    <div className="bg-white rounded-lg shadow p-6">
                        <Target className="text-green-600 mb-3" size={32} />
                        <h3 className="font-semibold text-gray-800 mb-2">Match Analytics</h3>
                        <p className="text-sm text-gray-600">
                            See AI-calculated match rates and identify best opportunities
                        </p>
                    </div>

                    <div className="bg-white rounded-lg shadow p-6">
                        <BarChart3 className="text-purple-600 mb-3" size={32} />
                        <h3 className="font-semibold text-gray-800 mb-2">Performance Metrics</h3>
                        <p className="text-sm text-gray-600">
                            Track response rates, interview conversions, and success metrics
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
                        <BarChart3 className="text-blue-600" />
                        Application Tracking
                    </h1>
                    <p className="text-gray-600 mt-2">
                        Managing {applications.length} application{applications.length !== 1 ? 's' : ''}
                    </p>
                </div>

                <button
                    onClick={loadApplications}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-2"
                >
                    <RefreshCw size={18} />
                    Refresh
                </button>
            </div>

            {/* Stats Dashboard */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
                <div className="bg-white rounded-lg shadow p-4">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-600">Total</span>
                        <Briefcase className="text-gray-400" size={18} />
                    </div>
                    <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
                </div>

                <div className="bg-white rounded-lg shadow p-4">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-600">Saved</span>
                        <FileText className="text-gray-400" size={18} />
                    </div>
                    <p className="text-2xl font-bold text-gray-600">{stats.saved}</p>
                </div>

                <div className="bg-white rounded-lg shadow p-4">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-600">Applied</span>
                        <Send className="text-blue-400" size={18} />
                    </div>
                    <p className="text-2xl font-bold text-blue-600">{stats.applied}</p>
                </div>

                <div className="bg-white rounded-lg shadow p-4">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-600">Reviewing</span>
                        <Eye className="text-yellow-400" size={18} />
                    </div>
                    <p className="text-2xl font-bold text-yellow-600">{stats.reviewing}</p>
                </div>

                <div className="bg-white rounded-lg shadow p-4">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-600">Interview</span>
                        <Calendar className="text-purple-400" size={18} />
                    </div>
                    <p className="text-2xl font-bold text-purple-600">{stats.interview}</p>
                </div>

                <div className="bg-white rounded-lg shadow p-4">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-600">Offers</span>
                        <Award className="text-green-400" size={18} />
                    </div>
                    <p className="text-2xl font-bold text-green-600">{stats.offers}</p>
                </div>

                <div className="bg-white rounded-lg shadow p-4">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-600">Avg Match</span>
                        <Target className="text-blue-400" size={18} />
                    </div>
                    <p className={`text-2xl font-bold ${getMatchColor(stats.avgMatch)}`}>
                        {stats.avgMatch}%
                    </p>
                </div>

                <div className="bg-white rounded-lg shadow p-4">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-600">Response</span>
                        <TrendingUp className="text-green-400" size={18} />
                    </div>
                    <p className="text-2xl font-bold text-green-600">{stats.responseRate}%</p>
                </div>
            </div>

            {/* Filters and Controls */}
            <div className="bg-white rounded-lg shadow p-4">
                <div className="grid md:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            <Filter className="inline" size={14} /> Status
                        </label>
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="all">All Status ({applications.length})</option>
                            <option value="saved">Saved ({stats.saved})</option>
                            <option value="applied">Applied ({stats.applied})</option>
                            <option value="reviewing">Reviewing ({stats.reviewing})</option>
                            <option value="interview">Interview ({stats.interview})</option>
                            <option value="offer">Offer ({stats.offers})</option>
                            <option value="rejected">Rejected ({stats.rejected})</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            <Search className="inline" size={14} /> Search
                        </label>
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Company or position..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            <TrendingUp className="inline" size={14} /> Sort By
                        </label>
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="recent">Most Recent</option>
                            <option value="match">Highest Match</option>
                            <option value="company">Company Name</option>
                            <option value="status">Status</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            View
                        </label>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setViewMode('cards')}
                                className={`flex-1 px-3 py-2 rounded-lg border ${viewMode === 'cards'
                                    ? 'bg-blue-600 text-white border-blue-600'
                                    : 'bg-white text-gray-700 border-gray-300'
                                    }`}
                            >
                                Cards
                            </button>
                            <button
                                onClick={() => setViewMode('table')}
                                className={`flex-1 px-3 py-2 rounded-lg border ${viewMode === 'table'
                                    ? 'bg-blue-600 text-white border-blue-600'
                                    : 'bg-white text-gray-700 border-gray-300'
                                    }`}
                            >
                                Table
                            </button>
                        </div>
                    </div>
                </div>

                {(filterStatus !== 'all' || searchTerm) && (
                    <div className="mt-4 flex items-center justify-between border-t border-gray-200 pt-4">
                        <span className="text-sm text-gray-600">
                            Showing {displayedApps.length} of {applications.length} applications
                        </span>
                        <button
                            onClick={() => {
                                setFilterStatus('all');
                                setSearchTerm('');
                            }}
                            className="text-sm text-blue-600 hover:text-blue-800"
                        >
                            Clear Filters
                        </button>
                    </div>
                )}
            </div>

            {/* Applications List */}
            {viewMode === 'cards' ? (
                <div className="space-y-4">
                    {displayedApps.map(app => (
                        <div
                            key={app.id}
                            className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6"
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                    {/* Status and Match */}
                                    <div className="flex items-center gap-3 mb-3 flex-wrap">
                                        <span className={`px-3 py-1 rounded-full border text-sm font-medium flex items-center gap-2 ${getStatusColor(app.status)}`}>
                                            {getStatusIcon(app.status)}
                                            <span className="capitalize">{app.status}</span>
                                        </span>

                                        {app.match_score && (
                                            <span className={`flex items-center gap-1 ${getMatchColor(app.match_score)}`}>
                                                <Target size={16} />
                                                {app.match_score}% Match
                                            </span>
                                        )}

                                        {app.status === 'interview' && (
                                            <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-semibold animate-pulse">
                                                Action Needed
                                            </span>
                                        )}
                                    </div>

                                    {/* Job Title and Company */}
                                    <h3 className="text-xl font-bold text-gray-800 mb-1">
                                        {app.job_title}
                                    </h3>
                                    <p className="text-lg text-gray-600 mb-3">
                                        {app.company_name}
                                    </p>

                                    {/* Details */}
                                    <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                                        {app.location && (
                                            <div className="flex items-center gap-1">
                                                <MapPin size={14} />
                                                <span>{app.location}</span>
                                            </div>
                                        )}
                                        {app.salary_range && (
                                            <div className="flex items-center gap-1">
                                                <DollarSign size={14} />
                                                <span>{app.salary_range}</span>
                                            </div>
                                        )}
                                        {app.created_at && (
                                            <div className="flex items-center gap-1">
                                                <Calendar size={14} />
                                                <span>Added {new Date(app.created_at).toLocaleDateString()}</span>
                                            </div>
                                        )}
                                        {app.applied_date && (
                                            <div className="flex items-center gap-1">
                                                <Send size={14} />
                                                <span>Applied {new Date(app.applied_date).toLocaleDateString()}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex flex-col gap-2">
                                    <select
                                        value={app.status}
                                        onChange={(e) => handleUpdateStatus(app.id, e.target.value)}
                                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                    >
                                        <option value="saved">Saved</option>
                                        <option value="applied">Applied</option>
                                        <option value="reviewing">Reviewing</option>
                                        <option value="interview">Interview</option>
                                        <option value="offer">Offer</option>
                                        <option value="rejected">Rejected</option>
                                        <option value="accepted">Accepted</option>
                                    </select>

                                    <button
                                        onClick={() => navigate(`/interview/${app.id}`)}
                                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm flex items-center gap-1"
                                    >
                                        <MessageSquare size={16} />
                                        Interview Prep
                                    </button>

                                    <button
                                        onClick={() => navigate(`/applications/${app.id}`)}
                                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm flex items-center gap-1"
                                    >
                                        <Edit size={16} />
                                        Edit
                                    </button>

                                    {app.job_url && (
                                        <a
                                            href={app.job_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm flex items-center gap-1"
                                        >
                                            <ExternalLink size={16} />
                                            View
                                        </a>
                                    )}

                                    <button
                                        onClick={() => handleDelete(app.id)}
                                        className="px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 text-sm flex items-center gap-1"
                                    >
                                        <Trash2 size={16} />
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                // Table View
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Position
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Company
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Match
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Date
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {displayedApps.map(app => (
                                    <tr key={app.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-medium text-gray-900">
                                                {app.job_title}
                                            </div>
                                            {app.location && (
                                                <div className="text-sm text-gray-500">
                                                    {app.location}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-900">
                                            {app.company_name}
                                        </td>
                                        <td className="px-6 py-4">
                                            <select
                                                value={app.status}
                                                onChange={(e) => handleUpdateStatus(app.id, e.target.value)}
                                                className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(app.status)}`}
                                            >
                                                <option value="saved">Saved</option>
                                                <option value="applied">Applied</option>
                                                <option value="reviewing">Reviewing</option>
                                                <option value="interview">Interview</option>
                                                <option value="offer">Offer</option>
                                                <option value="rejected">Rejected</option>
                                            </select>
                                        </td>
                                        <td className="px-6 py-4">
                                            {app.match_score && (
                                                <span className={`text-sm font-semibold ${getMatchColor(app.match_score)}`}>
                                                    {app.match_score}%
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500">
                                            {new Date(app.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 text-right text-sm">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => navigate(`/interview/${app.id}`)}
                                                    className="text-purple-600 hover:text-purple-800"
                                                    title="Interview Prep"
                                                >
                                                    <MessageSquare size={18} />
                                                </button>
                                                <button
                                                    onClick={() => navigate(`/applications/${app.id}`)}
                                                    className="text-blue-600 hover:text-blue-800"
                                                    title="Edit"
                                                >
                                                    <Edit size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(app.id)}
                                                    className="text-red-600 hover:text-red-800"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* No Results */}
            {displayedApps.length === 0 && applications.length > 0 && (
                <div className="bg-white rounded-lg shadow p-12 text-center">
                    <Filter className="mx-auto text-gray-400 mb-4" size={48} />
                    <h2 className="text-xl font-bold text-gray-800 mb-2">
                        No Applications Match Your Filters
                    </h2>
                    <p className="text-gray-600 mb-4">
                        Try adjusting your filters or search term.
                    </p>
                    <button
                        onClick={() => {
                            setFilterStatus('all');
                            setSearchTerm('');
                        }}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        Clear Filters
                    </button>
                </div>
            )}
        </div>
    );
}