import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Search, MapPin, Briefcase, DollarSign, Clock, ExternalLink,
    TrendingUp, Filter, Loader, CheckSquare, Square, Globe,
    ChevronDown, ChevronUp, X, CheckCircle2, AlertCircle,
    Target, Award, RefreshCw, FileText, Zap, Plus, Sparkles
} from 'lucide-react';
import { jobsAPI, applicationsAPI, profileAPI } from '../services/api';

export default function JobSearch() {
    const navigate = useNavigate();

    // Search state
    const [keyword, setKeyword] = useState('');
    const [location, setLocation] = useState('');
    const [jobs, setJobs] = useState([]);
    const [filteredJobs, setFilteredJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searching, setSearching] = useState(false);
    const [searchPerformed, setSearchPerformed] = useState(false);
    const [displayCount, setDisplayCount] = useState(20);
    const [userProfile, setUserProfile] = useState(null);

    // Platform state
    const [availablePlatforms, setAvailablePlatforms] = useState([]);
    const [selectedPlatforms, setSelectedPlatforms] = useState([
        'linkedin', 'indeed', 'academic_positions', 'euraxess'
    ]);
    const [showPlatformSelector, setShowPlatformSelector] = useState(false);

    // Filter state
    const [showFilters, setShowFilters] = useState(false);
    const [employmentTypeFilter, setEmploymentTypeFilter] = useState('all');
    const [remoteFilter, setRemoteFilter] = useState('all');
    const [experienceLevelFilter, setExperienceLevelFilter] = useState('all');
    const [appliedFilter, setAppliedFilter] = useState('all');
    const [matchRateFilter, setMatchRateFilter] = useState(0);

    // Sort state
    const [sortBy, setSortBy] = useState('match_rate');

    // Applied jobs state
    const [appliedJobIds, setAppliedJobIds] = useState(new Set());

    // Progressive enrichment state
    const [enrichingJobs, setEnrichingJobs] = useState(new Set());
    const [enrichmentProgress, setEnrichmentProgress] = useState({ current: 0, total: 0 });
    const [autoEnrichEnabled, setAutoEnrichEnabled] = useState(true);

    useEffect(() => {
        initializePage();
    }, []);

    useEffect(() => {
        applyFiltersAndSort();
    }, [jobs, employmentTypeFilter, remoteFilter, experienceLevelFilter, appliedFilter, matchRateFilter, sortBy]);

    const initializePage = async () => {
        setLoading(true);
        try {
            await Promise.all([
                loadPlatforms(),
                loadAppliedJobs(),
                loadUserProfile()
            ]);

            // Auto-load last search keyword
            const lastKeyword = localStorage.getItem('lastJobSearchKeyword');
            if (lastKeyword) {
                setKeyword(lastKeyword);
                // Auto-search after a brief delay
                setTimeout(() => {
                    handleSearch(null, lastKeyword);
                }, 500);
            }
        } catch (error) {
            console.error('Initialization failed:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadPlatforms = async () => {
        try {
            const { data } = await jobsAPI.getPlatforms();
            setAvailablePlatforms(data.platforms || []);
        } catch (error) {
            console.error('Failed to load platforms:', error);
        }
    };

    const loadAppliedJobs = async () => {
        try {
            const { data } = await applicationsAPI.getApplications();
            const appliedIds = new Set(
                data.applications?.map(app => `${app.job_title}-${app.company_name}`) || []
            );
            setAppliedJobIds(appliedIds);
        } catch (error) {
            console.error('Failed to load applied jobs:', error);
        }
    };

    const loadUserProfile = async () => {
        try {
            const { data } = await profileAPI.getProfile();
            setUserProfile(data);

            // Pre-fill location if user has it in profile
            if (data.profile_data?.location && !location) {
                setLocation(data.profile_data.location);
            }
        } catch (error) {
            console.error('Failed to load user profile:', error);
        }
    };

    const handleSearch = async (e, searchKeyword = null) => {
        if (e) e.preventDefault();

        const searchTerm = searchKeyword || keyword;

        if (!searchTerm.trim()) {
            alert('Please enter a search keyword');
            return;
        }

        if (selectedPlatforms.length === 0) {
            alert('Please select at least one platform');
            return;
        }

        setSearching(true);
        setSearchPerformed(true);
        setJobs([]);
        setDisplayCount(20);
        setEnrichmentProgress({ current: 0, total: 0 });

        // Save search keyword
        localStorage.setItem('lastJobSearchKeyword', searchTerm);

        try {
            // Build search params with user profile context
            const searchParams = {
                keyword: searchTerm.trim(),
                location: location.trim() || (userProfile?.profile_data?.location || ''),
                platforms: selectedPlatforms.join(','),
                max_results: 100, // Fetch 100 jobs
                quick_mode: false,
            };

            // Add experience level from user profile
            if (userProfile?.profile_data?.years_of_experience) {
                const years = userProfile.profile_data.years_of_experience;
                if (years < 2) {
                    searchParams.experience_level = 'entry';
                } else if (years < 5) {
                    searchParams.experience_level = 'mid';
                } else {
                    searchParams.experience_level = 'senior';
                }
            }

            console.log('🔍 Searching with params:', searchParams);

            const { data } = await jobsAPI.searchJobs(searchParams);

            console.log('✅ Search results:', data.jobs?.length || 0, 'jobs');

            const jobsWithStatus = (data.jobs || []).map(job => ({
                ...job,
                is_applied: appliedJobIds.has(`${job.job_title}-${job.company_name}`)
            }));

            setJobs(jobsWithStatus);

            // PARALLEL AI ENRICHMENT (MUCH FASTER!)
            if (autoEnrichEnabled && jobsWithStatus.length > 0) {
                enrichTopResultsParallel(jobsWithStatus.slice(0, 15));
            }

            if (jobsWithStatus.length === 0) {
                alert('No jobs found. Try different keywords or platforms.');
            }

        } catch (error) {
            console.error('Search failed:', error);
            alert(error.response?.data?.detail || 'Search failed. Please try again.');
        } finally {
            setSearching(false);
        }
    };

    // PARALLEL ENRICHMENT - 10X FASTER!
    const enrichTopResultsParallel = async (topJobs) => {
        const totalToEnrich = Math.min(topJobs.length, 15);
        setEnrichmentProgress({ current: 0, total: totalToEnrich });

        console.log('⚡ Starting PARALLEL enrichment for', totalToEnrich, 'jobs');

        // Process in batches of 5 for parallel execution
        const batchSize = 5;
        for (let i = 0; i < totalToEnrich; i += batchSize) {
            const batch = topJobs.slice(i, i + batchSize);

            // PARALLEL PROCESSING - All jobs in batch at once!
            await Promise.all(
                batch.map(job => enrichSingleJob(job, false))
            );

            setEnrichmentProgress({ current: Math.min(i + batchSize, totalToEnrich), total: totalToEnrich });

            // Small delay between batches to avoid overwhelming the server
            if (i + batchSize < totalToEnrich) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }

        console.log('✅ Parallel enrichment complete!');

        setTimeout(() => {
            setEnrichmentProgress({ current: 0, total: 0 });
        }, 2000);
    };

    const enrichSingleJob = async (job, showNotification = true) => {
        const jobKey = `${job.job_title}-${job.company_name}`;

        if (enrichingJobs.has(jobKey)) {
            return;
        }

        setEnrichingJobs(prev => new Set([...prev, jobKey]));

        try {
            const { data } = await jobsAPI.enrichJob(job);
            const enrichedData = data.enriched_job || {};

            setJobs(prevJobs =>
                prevJobs.map(j =>
                    `${j.job_title}-${j.company_name}` === jobKey
                        ? {
                            ...j,
                            enriched: true,
                            match_score: enrichedData.match_score,
                            strengths: enrichedData.strengths,
                            gaps: enrichedData.gaps,
                            recommendation: enrichedData.recommendation,
                            ai_analysis: enrichedData.ai_analysis
                        }
                        : j
                )
            );

            if (showNotification) {
                console.log(`✅ Enriched: ${job.job_title} - Match: ${enrichedData.match_score}%`);
            }

        } catch (error) {
            console.error('Failed to enrich job:', error);
        } finally {
            setEnrichingJobs(prev => {
                const newSet = new Set(prev);
                newSet.delete(jobKey);
                return newSet;
            });
        }
    };

    const handleEnrichJob = (job) => {
        enrichSingleJob(job, true);
    };

    const togglePlatform = (platformKey) => {
        setSelectedPlatforms(prev =>
            prev.includes(platformKey)
                ? prev.filter(p => p !== platformKey)
                : [...prev, platformKey]
        );
    };

    const selectAllPlatforms = () => {
        setSelectedPlatforms(availablePlatforms.map(p => p.key));
    };

    const deselectAllPlatforms = () => {
        setSelectedPlatforms([]);
    };

    const selectByCategory = (category) => {
        const filtered = availablePlatforms
            .filter(p => p.category === category)
            .map(p => p.key);
        setSelectedPlatforms(filtered);
    };

    const applyFiltersAndSort = () => {
        let filtered = [...jobs];

        // Employment type filter
        if (employmentTypeFilter !== 'all') {
            filtered = filtered.filter(job =>
                job.employment_type?.toLowerCase() === employmentTypeFilter.toLowerCase()
            );
        }

        // Remote filter
        if (remoteFilter !== 'all') {
            filtered = filtered.filter(job => {
                if (remoteFilter === 'remote') return job.remote_option === true;
                if (remoteFilter === 'onsite') return job.remote_option === false;
                return true;
            });
        }

        // Experience level filter
        if (experienceLevelFilter !== 'all') {
            filtered = filtered.filter(job =>
                job.experience_level?.toLowerCase().includes(experienceLevelFilter.toLowerCase())
            );
        }

        // Applied filter
        if (appliedFilter !== 'all') {
            filtered = filtered.filter(job => {
                if (appliedFilter === 'applied') return job.is_applied === true;
                if (appliedFilter === 'not_applied') return job.is_applied !== true;
                return true;
            });
        }

        // Match rate filter
        if (matchRateFilter > 0) {
            filtered = filtered.filter(job => (job.match_score || 0) >= matchRateFilter);
        }

        // Sort
        if (sortBy === 'match_rate') {
            filtered.sort((a, b) => (b.match_score || 0) - (a.match_score || 0));
        } else if (sortBy === 'posted_date') {
            filtered.sort((a, b) => new Date(b.posted_date || 0) - new Date(a.posted_date || 0));
        } else if (sortBy === 'company') {
            filtered.sort((a, b) => a.company_name.localeCompare(b.company_name));
        }

        setFilteredJobs(filtered);
    };

    const handleQuickApply = async (job) => {
        try {
            await applicationsAPI.createApplication({
                job_title: job.job_title,
                company_name: job.company_name,
                job_url: job.job_url,
                job_description: job.description,
                location: job.location || job.company_location,
                salary_range: job.salary_range,
                employment_type: job.employment_type,
                status: 'saved',
                match_score: job.match_score || null
            });

            setAppliedJobIds(prev => new Set(prev).add(`${job.job_title}-${job.company_name}`));
            setJobs(prevJobs =>
                prevJobs.map(j =>
                    `${j.job_title}-${j.company_name}` === `${job.job_title}-${job.company_name}`
                        ? { ...j, is_applied: true }
                        : j
                )
            );

            alert('✅ Application created! Go to Applications to continue.');
        } catch (error) {
            console.error('Failed to create application:', error);
            alert('Failed to create application');
        }
    };

    const handlePrepareApplication = (job) => {
        navigate(`/material-preparation`, { state: { job } });
    };

    const handleLoadMore = () => {
        setDisplayCount(prev => prev + 20);
    };

    const getMatchRateColor = (rate) => {
        if (rate >= 80) return 'text-green-600 bg-green-50 border-green-200';
        if (rate >= 60) return 'text-blue-600 bg-blue-50 border-blue-200';
        if (rate >= 40) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
        return 'text-gray-600 bg-gray-50 border-gray-200';
    };

    const isEnriching = (job) => {
        return enrichingJobs.has(`${job.job_title}-${job.company_name}`);
    };

    const displayedJobs = filteredJobs.slice(0, displayCount);
    const hasMore = displayCount < filteredJobs.length;

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
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
                        <Search className="text-blue-600" />
                        AI-Powered Job Search
                    </h1>
                    <p className="text-gray-600 mt-2">
                        Find your next opportunity with intelligent matching
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                        <input
                            type="checkbox"
                            checked={autoEnrichEnabled}
                            onChange={(e) => setAutoEnrichEnabled(e.target.checked)}
                            className="rounded border-gray-300"
                        />
                        <Sparkles size={16} className="text-purple-600" />
                        Auto AI Analysis
                    </label>
                </div>
            </div>

            {/* Search Form */}
            <div className="bg-white rounded-lg shadow p-6 space-y-4">
                <form onSubmit={handleSearch} className="space-y-4">
                    <div className="grid md:grid-cols-3 gap-4">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Job Title or Keywords *
                            </label>
                            <input
                                type="text"
                                value={keyword}
                                onChange={(e) => setKeyword(e.target.value)}
                                placeholder="e.g. Software Engineer, Data Scientist"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Location
                            </label>
                            <input
                                type="text"
                                value={location}
                                onChange={(e) => setLocation(e.target.value)}
                                placeholder="e.g. Munich, Remote"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                    </div>

                    {/* Platform Selection */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="block text-sm font-medium text-gray-700">
                                Job Boards ({selectedPlatforms.length} selected)
                            </label>
                            <button
                                type="button"
                                onClick={() => setShowPlatformSelector(!showPlatformSelector)}
                                className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                            >
                                {showPlatformSelector ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                {showPlatformSelector ? 'Hide' : 'Show'} Options
                            </button>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            {availablePlatforms.map(platform => (
                                <button
                                    key={platform.key}
                                    type="button"
                                    onClick={() => togglePlatform(platform.key)}
                                    className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${selectedPlatforms.includes(platform.key)
                                            ? 'bg-blue-600 text-white border-blue-600'
                                            : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                                        }`}
                                >
                                    {selectedPlatforms.includes(platform.key) && (
                                        <CheckSquare className="inline mr-1" size={14} />
                                    )}
                                    {!selectedPlatforms.includes(platform.key) && (
                                        <Square className="inline mr-1" size={14} />
                                    )}
                                    {platform.name}
                                </button>
                            ))}
                        </div>

                        {showPlatformSelector && (
                            <div className="mt-2 flex gap-2">
                                <button
                                    type="button"
                                    onClick={selectAllPlatforms}
                                    className="text-xs text-blue-600 hover:text-blue-800"
                                >
                                    Select All
                                </button>
                                <button
                                    type="button"
                                    onClick={deselectAllPlatforms}
                                    className="text-xs text-gray-600 hover:text-gray-800"
                                >
                                    Deselect All
                                </button>
                            </div>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={searching}
                        className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center justify-center gap-2 text-lg font-medium"
                    >
                        {searching ? (
                            <>
                                <Loader className="animate-spin" size={20} />
                                Searching...
                            </>
                        ) : (
                            <>
                                <Search size={20} />
                                Search Jobs
                            </>
                        )}
                    </button>
                </form>
            </div>

            {/* Enrichment Progress - PARALLEL PROCESSING INDICATOR */}
            {enrichmentProgress.total > 0 && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <Sparkles className="text-purple-600 animate-pulse" size={20} />
                            <span className="text-sm font-medium text-purple-800">
                                ⚡ Parallel AI Analysis in Progress (Much Faster!)
                            </span>
                        </div>
                        <span className="text-sm text-purple-600">
                            {enrichmentProgress.current} / {enrichmentProgress.total}
                        </span>
                    </div>
                    <div className="w-full bg-purple-200 rounded-full h-2">
                        <div
                            className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${(enrichmentProgress.current / enrichmentProgress.total) * 100}%` }}
                        />
                    </div>
                </div>
            )}

            {/* Filters and Stats */}
            {searchPerformed && jobs.length > 0 && (
                <div className="bg-white rounded-lg shadow p-4">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                            >
                                <Filter size={18} />
                                Filters
                                {showFilters ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </button>

                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                <TrendingUp size={16} />
                                <span className="font-medium">
                                    Showing {displayedJobs.length} of {filteredJobs.length} jobs
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <label className="text-sm text-gray-600">Sort:</label>
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className="px-3 py-1 border border-gray-300 rounded-lg text-sm"
                            >
                                <option value="match_rate">Best Match</option>
                                <option value="posted_date">Most Recent</option>
                                <option value="company">Company Name</option>
                            </select>
                        </div>
                    </div>

                    {showFilters && (
                        <div className="grid md:grid-cols-5 gap-4 pt-4 border-t border-gray-200">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                    Employment Type
                                </label>
                                <select
                                    value={employmentTypeFilter}
                                    onChange={(e) => setEmploymentTypeFilter(e.target.value)}
                                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                >
                                    <option value="all">All Types</option>
                                    <option value="full-time">Full-time</option>
                                    <option value="part-time">Part-time</option>
                                    <option value="contract">Contract</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                    Remote Option
                                </label>
                                <select
                                    value={remoteFilter}
                                    onChange={(e) => setRemoteFilter(e.target.value)}
                                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                >
                                    <option value="all">All Options</option>
                                    <option value="remote">Remote</option>
                                    <option value="onsite">On-site</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                    Experience Level
                                </label>
                                <select
                                    value={experienceLevelFilter}
                                    onChange={(e) => setExperienceLevelFilter(e.target.value)}
                                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                >
                                    <option value="all">All Levels</option>
                                    <option value="entry">Entry Level</option>
                                    <option value="mid">Mid Level</option>
                                    <option value="senior">Senior Level</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                    Application Status
                                </label>
                                <select
                                    value={appliedFilter}
                                    onChange={(e) => setAppliedFilter(e.target.value)}
                                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                >
                                    <option value="all">All Jobs</option>
                                    <option value="not_applied">Not Applied</option>
                                    <option value="applied">Already Applied</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                    Minimum Match
                                </label>
                                <select
                                    value={matchRateFilter}
                                    onChange={(e) => setMatchRateFilter(Number(e.target.value))}
                                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                >
                                    <option value={0}>All Matches</option>
                                    <option value={40}>40%+ Match</option>
                                    <option value={60}>60%+ Match</option>
                                    <option value={80}>80%+ Match</option>
                                </select>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Job Results */}
            <div className="space-y-4">
                {displayedJobs.map((job, index) => {
                    const jobKey = `${job.job_title}-${job.company_name}`;
                    const enriching = isEnriching(job);
                    const matchScore = job.match_score || 0;

                    return (
                        <div
                            key={`${jobKey}-${index}`}
                            className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6"
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                    {/* Match Badge */}
                                    <div className="mb-3">
                                        {enriching ? (
                                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-purple-50 border-purple-200">
                                                <Loader className="animate-spin text-purple-600" size={16} />
                                                <span className="text-sm text-purple-600">Analyzing...</span>
                                            </div>
                                        ) : matchScore > 0 ? (
                                            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border ${getMatchRateColor(matchScore)}`}>
                                                <Target size={16} />
                                                <span className="font-bold text-lg">{matchScore}% Match</span>
                                                {matchScore >= 80 && <Award size={16} />}
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => handleEnrichJob(job)}
                                                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100"
                                            >
                                                <Zap size={16} />
                                                <span className="text-sm">Get AI Match</span>
                                            </button>
                                        )}

                                        {job.is_applied && (
                                            <span className="ml-2 inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-800 text-xs">
                                                <CheckCircle2 size={14} />
                                                Applied
                                            </span>
                                        )}
                                    </div>

                                    {/* Job Title and Company */}
                                    <h3 className="text-xl font-bold text-gray-800 mb-2">
                                        {job.job_title}
                                    </h3>
                                    <p className="text-lg text-gray-600 mb-3">
                                        {job.company_name}
                                    </p>

                                    {/* Job Details */}
                                    <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-4">
                                        {(job.location || job.company_location) && (
                                            <div className="flex items-center gap-1">
                                                <MapPin size={14} />
                                                <span>{job.location || job.company_location}</span>
                                            </div>
                                        )}
                                        {job.employment_type && (
                                            <div className="flex items-center gap-1">
                                                <Briefcase size={14} />
                                                <span className="capitalize">{job.employment_type}</span>
                                            </div>
                                        )}
                                        {job.salary_range && (
                                            <div className="flex items-center gap-1">
                                                <DollarSign size={14} />
                                                <span>{job.salary_range}</span>
                                            </div>
                                        )}
                                        {job.platform_name && (
                                            <div className="flex items-center gap-1">
                                                <Globe size={14} />
                                                <span>{job.platform_name}</span>
                                            </div>
                                        )}
                                        {job.posted_date && (
                                            <div className="flex items-center gap-1">
                                                <Clock size={14} />
                                                <span>{new Date(job.posted_date).toLocaleDateString()}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* AI Analysis */}
                                    {job.strengths && job.strengths.length > 0 && (
                                        <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-3">
                                            <p className="text-sm font-semibold text-green-800 mb-2 flex items-center gap-1">
                                                <CheckCircle2 size={16} />
                                                Your Strengths:
                                            </p>
                                            <ul className="text-sm text-green-700 space-y-1">
                                                {job.strengths.slice(0, 3).map((strength, i) => (
                                                    <li key={i}>• {strength}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {job.gaps && job.gaps.length > 0 && (
                                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-3">
                                            <p className="text-sm font-semibold text-yellow-800 mb-2 flex items-center gap-1">
                                                <AlertCircle size={16} />
                                                Areas to Address:
                                            </p>
                                            <ul className="text-sm text-yellow-700 space-y-1">
                                                {job.gaps.slice(0, 2).map((gap, i) => (
                                                    <li key={i}>• {gap}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {/* Description Preview */}
                                    {job.description && (
                                        <p className="text-gray-600 text-sm line-clamp-2">
                                            {job.description}
                                        </p>
                                    )}
                                </div>

                                {/* Action Buttons */}
                                <div className="flex flex-col gap-2">
                                    <button
                                        onClick={() => handlePrepareApplication(job)}
                                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm whitespace-nowrap flex items-center gap-2"
                                    >
                                        <FileText size={16} />
                                        Prepare Materials
                                    </button>

                                    {!job.is_applied && (
                                        <button
                                            onClick={() => handleQuickApply(job)}
                                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                                        >
                                            Quick Apply
                                        </button>
                                    )}

                                    {job.job_url && (
                                        <a
                                            href={job.job_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm text-center flex items-center gap-1"
                                        >
                                            <ExternalLink size={16} />
                                            View
                                        </a>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Load More Button */}
            {hasMore && (
                <div className="text-center">
                    <button
                        onClick={handleLoadMore}
                        className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 mx-auto"
                    >
                        <Plus size={20} />
                        Load More Jobs ({filteredJobs.length - displayCount} remaining)
                    </button>
                </div>
            )}

            {/* Empty States */}
            {!searchPerformed && (
                <div className="bg-white rounded-lg shadow p-12 text-center">
                    <Search className="mx-auto text-gray-400 mb-4" size={64} />
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">
                        Start Your Job Search
                    </h2>
                    <p className="text-gray-600 max-w-md mx-auto">
                        Enter keywords and select job boards to find opportunities with AI-powered match analysis.
                    </p>
                </div>
            )}

            {searchPerformed && jobs.length === 0 && !searching && (
                <div className="bg-white rounded-lg shadow p-12 text-center">
                    <AlertCircle className="mx-auto text-gray-400 mb-4" size={64} />
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">
                        No Jobs Found
                    </h2>
                    <p className="text-gray-600 mb-4">
                        Try different keywords or select more job boards.
                    </p>
                    <button
                        onClick={() => setSearchPerformed(false)}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        New Search
                    </button>
                </div>
            )}
        </div>
    );
}