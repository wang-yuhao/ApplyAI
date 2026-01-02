import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Loader, BookOpen, Target, TrendingUp, MessageSquare, CheckCircle,
    ArrowRight, FileText, Users, Lightbulb, Award, Calendar,
    ChevronRight, Star, Brain, Zap, AlertCircle, ArrowLeft
} from 'lucide-react';
import { interviewAPI, applicationsAPI } from '../services/api';

export default function Interview() {
    const { applicationId } = useParams();
    const navigate = useNavigate();

    const [applications, setApplications] = useState([]);
    const [prep, setPrep] = useState(null);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [activeSection, setActiveSection] = useState('overview');
    const [selectedAppId, setSelectedAppId] = useState(null);

    useEffect(() => {
        loadApplications();
    }, []);

    useEffect(() => {
        const appId = applicationId || selectedAppId;
        if (appId) {
            loadInterviewPrep(appId);
        }
    }, [applicationId, selectedAppId]);

    const loadApplications = async () => {
        setLoading(true);
        try {
            const { data } = await applicationsAPI.getApplications();
            setApplications(data.applications || []);

            // Auto-select first application if no param
            if (!applicationId && data.applications && data.applications.length > 0) {
                setSelectedAppId(data.applications[0].id);
            }
        } catch (error) {
            console.error('Failed to load applications:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadInterviewPrep = async (appId) => {
        if (!appId) return;

        setLoading(true);
        try {
            const { data } = await interviewAPI.getInterviewPrep(appId);
            setPrep(data);
        } catch (error) {
            console.error('Interview prep not found, will generate on demand');
            setPrep(null);
        } finally {
            setLoading(false);
        }
    };

    const handleGeneratePrep = async () => {
        const appId = applicationId || selectedAppId;
        if (!appId) return;

        setGenerating(true);
        try {
            const { data } = await interviewAPI.getInterviewPrep(appId);
            setPrep(data);
            alert('✅ Interview preparation generated!');
        } catch (error) {
            console.error('Failed to generate prep:', error);
            alert('Failed to generate interview preparation');
        } finally {
            setGenerating(false);
        }
    };

    const currentApplication = applications.find(app =>
        app.id === (applicationId ? parseInt(applicationId) : selectedAppId)
    );

    if (loading && applications.length === 0) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader className="animate-spin text-blue-500" size={48} />
            </div>
        );
    }

    // No applications state
    if (applications.length === 0) {
        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
                        <Brain className="text-blue-600" />
                        Interview Preparation
                    </h1>
                    <p className="text-gray-600 mt-2">
                        AI-powered preparation to ace your interviews
                    </p>
                </div>

                <div className="bg-white rounded-lg shadow p-12 text-center">
                    <MessageSquare className="mx-auto text-gray-400 mb-4" size={64} />
                    <h2 className="text-2xl font-bold text-gray-800 mb-4">
                        No Applications Yet
                    </h2>
                    <p className="text-gray-600 mb-6 max-w-md mx-auto">
                        Apply to jobs to get personalized interview preparation with AI-generated questions and strategies.
                    </p>

                    <button
                        onClick={() => navigate('/search')}
                        className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 inline-flex items-center gap-2"
                    >
                        Search Jobs
                        <ArrowRight size={20} />
                    </button>
                </div>

                {/* General Tips */}
                <div className="grid md:grid-cols-3 gap-6">
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center gap-2 mb-3">
                            <BookOpen className="text-blue-600" size={24} />
                            <h3 className="font-semibold text-gray-800">Before Interview</h3>
                        </div>
                        <ul className="text-sm text-gray-700 space-y-2">
                            <li>• Research company thoroughly</li>
                            <li>• Review job description</li>
                            <li>• Prepare STAR stories</li>
                            <li>• Plan outfit and route</li>
                        </ul>
                    </div>

                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center gap-2 mb-3">
                            <MessageSquare className="text-green-600" size={24} />
                            <h3 className="font-semibold text-gray-800">During Interview</h3>
                        </div>
                        <ul className="text-sm text-gray-700 space-y-2">
                            <li>• Arrive 10-15 minutes early</li>
                            <li>• Make strong eye contact</li>
                            <li>• Listen carefully</li>
                            <li>• Be specific with examples</li>
                        </ul>
                    </div>

                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center gap-2 mb-3">
                            <TrendingUp className="text-purple-600" size={24} />
                            <h3 className="font-semibold text-gray-800">After Interview</h3>
                        </div>
                        <ul className="text-sm text-gray-700 space-y-2">
                            <li>• Send thank-you within 24h</li>
                            <li>• Follow up if no response</li>
                            <li>• Reflect on performance</li>
                            <li>• Stay positive</li>
                        </ul>
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
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-2"
                    >
                        <ArrowLeft size={20} />
                        Back
                    </button>
                    <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
                        <Brain className="text-blue-600" />
                        Interview Preparation
                    </h1>
                    <p className="text-gray-600 mt-2">
                        AI-powered preparation for {currentApplication?.job_title || 'your interview'}
                    </p>
                </div>

                {!prep && currentApplication && (
                    <button
                        onClick={handleGeneratePrep}
                        disabled={generating}
                        className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 flex items-center gap-2"
                    >
                        {generating ? (
                            <>
                                <Loader className="animate-spin" size={20} />
                                Generating...
                            </>
                        ) : (
                            <>
                                <Zap size={20} />
                                Generate AI Prep
                            </>
                        )}
                    </button>
                )}
            </div>

            {/* Application Selector */}
            <div className="bg-white rounded-lg shadow p-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Application:
                </label>
                <select
                    value={selectedAppId || ''}
                    onChange={(e) => setSelectedAppId(parseInt(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                    {applications.map(app => (
                        <option key={app.id} value={app.id}>
                            {app.job_title} at {app.company_name}
                            {app.match_score ? ` (${app.match_score}% match)` : ''}
                        </option>
                    ))}
                </select>
            </div>

            {/* Current Application Card */}
            {currentApplication && (
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 border border-blue-200">
                    <div className="flex items-start justify-between">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-800 mb-2">
                                {currentApplication.job_title}
                            </h2>
                            <p className="text-xl text-gray-600 mb-3">
                                {currentApplication.company_name}
                            </p>
                            <div className="flex items-center gap-4 text-sm text-gray-600">
                                {currentApplication.location && (
                                    <span>📍 {currentApplication.location}</span>
                                )}
                                {currentApplication.status && (
                                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                                        {currentApplication.status}
                                    </span>
                                )}
                                {currentApplication.match_score && (
                                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full font-semibold">
                                        {currentApplication.match_score}% Match
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Navigation Tabs */}
            <div className="bg-white rounded-lg shadow">
                <div className="flex border-b border-gray-200 overflow-x-auto">
                    {[
                        { key: 'overview', label: 'Overview', icon: Target },
                        { key: 'questions', label: 'Practice Questions', icon: MessageSquare },
                        { key: 'tips', label: 'Interview Tips', icon: Lightbulb },
                        { key: 'plan', label: 'Success Plan', icon: Calendar }
                    ].map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveSection(tab.key)}
                            className={`flex-1 px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeSection === tab.key
                                    ? 'border-blue-600 text-blue-600'
                                    : 'border-transparent text-gray-600 hover:text-gray-800'
                                }`}
                        >
                            <tab.icon className="inline mr-2" size={18} />
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="p-6">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader className="animate-spin text-blue-500" size={32} />
                        </div>
                    ) : !prep ? (
                        <div className="text-center py-12">
                            <AlertCircle className="mx-auto text-gray-400 mb-4" size={48} />
                            <h3 className="text-xl font-bold text-gray-800 mb-2">
                                No Preparation Yet
                            </h3>
                            <p className="text-gray-600 mb-6">
                                Generate AI-powered interview preparation for this position
                            </p>
                            <button
                                onClick={handleGeneratePrep}
                                disabled={generating}
                                className="px-8 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 inline-flex items-center gap-2"
                            >
                                {generating ? (
                                    <>
                                        <Loader className="animate-spin" size={20} />
                                        Generating...
                                    </>
                                ) : (
                                    <>
                                        <Zap size={20} />
                                        Generate AI Prep
                                    </>
                                )}
                            </button>
                        </div>
                    ) : (
                        <>
                            {/* Overview */}
                            {activeSection === 'overview' && (
                                <div className="space-y-6">
                                    <h2 className="text-2xl font-bold text-gray-800">Overview</h2>

                                    {prep.background_analysis && (
                                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                                            <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                                                <FileText size={20} />
                                                Company & Role Background
                                            </h3>
                                            <p className="text-blue-800 whitespace-pre-wrap">
                                                {prep.background_analysis}
                                            </p>
                                        </div>
                                    )}

                                    {prep.job_fit_analysis && (
                                        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                                            <h3 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
                                                <Award size={20} />
                                                Your Fit for This Role
                                            </h3>
                                            <p className="text-green-800 whitespace-pre-wrap">
                                                {prep.job_fit_analysis}
                                            </p>
                                        </div>
                                    )}

                                    {prep.step_by_step_guide && (
                                        <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
                                            <h3 className="font-semibold text-purple-900 mb-3 flex items-center gap-2">
                                                <ChevronRight size={20} />
                                                Preparation Steps
                                            </h3>
                                            <div className="text-purple-800 whitespace-pre-wrap">
                                                {prep.step_by_step_guide}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Practice Questions */}
                            {activeSection === 'questions' && (
                                <div className="space-y-8">
                                    <h2 className="text-2xl font-bold text-gray-800">Practice Questions</h2>

                                    {/* Common Questions */}
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                            <MessageSquare size={20} className="text-blue-600" />
                                            Common Interview Questions
                                        </h3>
                                        {prep.common_questions && prep.common_questions.length > 0 ? (
                                            <div className="space-y-4">
                                                {prep.common_questions.map((q, i) => (
                                                    <div key={i} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                                        <p className="font-medium text-gray-800 mb-2 flex items-start gap-2">
                                                            <span className="text-blue-600">{i + 1}.</span>
                                                            {q.question}
                                                        </p>
                                                        <p className="text-gray-600 text-sm mt-2 pl-6">
                                                            <strong>Answer:</strong> {q.answer}
                                                        </p>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <DefaultQuestions type="common" />
                                        )}
                                    </div>

                                    {/* Behavioral Questions */}
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                            <Users size={20} className="text-green-600" />
                                            Behavioral Questions (STAR Method)
                                        </h3>
                                        {prep.behavioral_questions && prep.behavioral_questions.length > 0 ? (
                                            <div className="space-y-4">
                                                {prep.behavioral_questions.map((q, i) => (
                                                    <div key={i} className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                                                        <p className="font-medium text-blue-900 mb-2 flex items-start gap-2">
                                                            <span className="text-blue-600">{i + 1}.</span>
                                                            {q.question}
                                                        </p>
                                                        <p className="text-blue-800 text-sm mt-2 pl-6">
                                                            <strong>STAR Response:</strong> {q.answer}
                                                        </p>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <DefaultQuestions type="behavioral" />
                                        )}
                                    </div>

                                    {/* Technical Questions */}
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                            <Brain size={20} className="text-purple-600" />
                                            Technical/Role-Specific Questions
                                        </h3>
                                        {prep.technical_questions && prep.technical_questions.length > 0 ? (
                                            <div className="space-y-4">
                                                {prep.technical_questions.map((q, i) => (
                                                    <div key={i} className="bg-green-50 rounded-lg p-4 border border-green-200">
                                                        <p className="font-medium text-green-900 mb-2 flex items-start gap-2">
                                                            <span className="text-green-600">{i + 1}.</span>
                                                            {q.question}
                                                        </p>
                                                        <p className="text-green-800 text-sm mt-2 pl-6">
                                                            <strong>Approach:</strong> {q.answer}
                                                        </p>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <DefaultQuestions type="technical" />
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Tips */}
                            {activeSection === 'tips' && (
                                <div className="space-y-6">
                                    <h2 className="text-2xl font-bold text-gray-800">Interview Tips & Strategies</h2>

                                    {prep.interview_tips ? (
                                        <div className="prose max-w-none">
                                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                                                <p className="text-gray-700 whitespace-pre-wrap">
                                                    {prep.interview_tips}
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="grid md:grid-cols-2 gap-6">
                                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                                                <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                                                    <CheckCircle size={20} />
                                                    Do's
                                                </h3>
                                                <ul className="space-y-2 text-blue-800">
                                                    <li>✓ Research company thoroughly</li>
                                                    <li>✓ Prepare specific examples</li>
                                                    <li>✓ Ask thoughtful questions</li>
                                                    <li>✓ Follow up with thank-you</li>
                                                    <li>✓ Be authentic and enthusiastic</li>
                                                    <li>✓ Dress professionally</li>
                                                </ul>
                                            </div>

                                            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                                                <h3 className="font-semibold text-red-900 mb-3 flex items-center gap-2">
                                                    <AlertCircle size={20} />
                                                    Don'ts
                                                </h3>
                                                <ul className="space-y-2 text-red-800">
                                                    <li>✗ Arrive late or unprepared</li>
                                                    <li>✗ Bad-mouth past employers</li>
                                                    <li>✗ Give vague answers</li>
                                                    <li>✗ Focus only on salary</li>
                                                    <li>✗ Interrupt the interviewer</li>
                                                    <li>✗ Use phone during interview</li>
                                                </ul>
                                            </div>
                                        </div>
                                    )}

                                    {prep.cultural_insights && (
                                        <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
                                            <h3 className="font-semibold text-purple-900 mb-3 flex items-center gap-2">
                                                <Star size={20} />
                                                Cultural Insights
                                            </h3>
                                            <p className="text-purple-800 whitespace-pre-wrap">
                                                {prep.cultural_insights}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* 30-60-90 Day Plan */}
                            {activeSection === 'plan' && (
                                <div className="space-y-6">
                                    <h2 className="text-2xl font-bold text-gray-800">30-60-90 Day Success Plan</h2>
                                    <p className="text-gray-600">
                                        A roadmap for your first three months in the role
                                    </p>

                                    {prep.development_plan ? (
                                        <div className="prose max-w-none">
                                            <div className="bg-gradient-to-br from-green-50 to-blue-50 border border-green-200 rounded-lg p-6">
                                                <p className="text-gray-700 whitespace-pre-wrap">
                                                    {prep.development_plan}
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                                                <h3 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
                                                    <Calendar size={20} />
                                                    First 30 Days: Learn & Observe
                                                </h3>
                                                <ul className="space-y-2 text-green-800">
                                                    <li>• Learn company processes and tools</li>
                                                    <li>• Build relationships with team members</li>
                                                    <li>• Understand current projects and priorities</li>
                                                    <li>• Set initial goals with your manager</li>
                                                    <li>• Complete all onboarding requirements</li>
                                                </ul>
                                            </div>

                                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                                                <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                                                    <Target size={20} />
                                                    Days 31-60: Contribute & Build
                                                </h3>
                                                <ul className="space-y-2 text-blue-800">
                                                    <li>• Take ownership of key responsibilities</li>
                                                    <li>• Contribute meaningfully to team projects</li>
                                                    <li>• Identify improvement opportunities</li>
                                                    <li>• Build cross-functional relationships</li>
                                                    <li>• Demonstrate your value and skills</li>
                                                </ul>
                                            </div>

                                            <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
                                                <h3 className="font-semibold text-purple-900 mb-3 flex items-center gap-2">
                                                    <TrendingUp size={20} />
                                                    Days 61-90: Lead & Optimize
                                                </h3>
                                                <ul className="space-y-2 text-purple-800">
                                                    <li>• Drive initiatives independently</li>
                                                    <li>• Demonstrate measurable impact</li>
                                                    <li>• Share knowledge and mentor others</li>
                                                    <li>• Plan long-term contributions</li>
                                                    <li>• Set goals for next quarter</li>
                                                </ul>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

// Default questions component
function DefaultQuestions({ type }) {
    const questions = {
        common: [
            { q: 'Tell me about yourself', tip: 'Give 2-minute professional overview focusing on relevant experience' },
            { q: 'Why are you interested in this role?', tip: 'Connect your career goals to the specific position' },
            { q: 'What are your greatest strengths?', tip: 'Use specific examples that relate to the job requirements' },
            { q: 'What are your weaknesses?', tip: 'Show self-awareness and growth mindset' },
            { q: 'Where do you see yourself in 5 years?', tip: 'Show ambition aligned with company growth' },
        ],
        behavioral: [
            { q: 'Tell me about a challenging project you led', tip: 'Use STAR: Situation, Task, Action, Result' },
            { q: 'Describe a time you worked in a difficult team', tip: 'Highlight collaboration and conflict resolution' },
            { q: 'How do you handle tight deadlines?', tip: 'Show time management and prioritization skills' },
            { q: 'Tell me about a failure and what you learned', tip: 'Focus on growth and lessons learned' },
            { q: 'Give an example of going above and beyond', tip: 'Demonstrate initiative and dedication' },
        ],
        technical: [
            { q: 'Explain your approach to problem-solving', tip: 'Walk through methodology with concrete example' },
            { q: 'What tools/technologies are you proficient in?', tip: 'Be specific and relate to job requirements' },
            { q: 'How do you stay current in your field?', tip: 'Show continuous learning and professional development' },
            { q: 'Describe a technical challenge you overcame', tip: 'Detail your solution and its impact' },
            { q: 'How would you approach [role-specific scenario]?', tip: 'Think aloud and explain your reasoning' },
        ],
    };

    return (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
            <p className="text-gray-600 mb-4 font-medium">Common {type} questions to prepare:</p>
            <div className="space-y-3">
                {questions[type].map((item, i) => (
                    <div key={i} className="pb-3 border-b border-gray-200 last:border-0">
                        <p className="font-medium text-gray-800 mb-1">{item.q}</p>
                        <p className="text-sm text-gray-600">💡 {item.tip}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}