import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    FileText, Download, Edit3, Save, X, Check, Loader,
    FileDown, FilePlus, Upload, Sparkles, ChevronDown,
    ChevronUp, AlertCircle, CheckCircle2, Send, ArrowLeft,
    Briefcase, Building, MapPin, DollarSign, Calendar
} from 'lucide-react';
import { materialsAPI, profileAPI } from '../services/api';

export default function MaterialPreparation() {
    const location = useLocation();
    const navigate = useNavigate();
    const job = location.state?.job;

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [downloading, setDownloading] = useState(false);

    // Materials state
    const [motivationLetter, setMotivationLetter] = useState('');
    const [resume, setResume] = useState(null);
    const [certificates, setCertificates] = useState([]);
    const [portfolio, setPortfolio] = useState(null);
    const [referenceLetters, setReferenceLetters] = useState([]);

    // UI state
    const [isEditingLetter, setIsEditingLetter] = useState(false);
    const [showJobDescription, setShowJobDescription] = useState(true);
    const [showMaterialsList, setShowMaterialsList] = useState(true);
    const [checklist, setChecklist] = useState({
        motivationLetter: false,
        resume: false,
        certificates: false,
        portfolio: false,
        references: false
    });

    useEffect(() => {
        if (!job) {
            navigate('/search');
            return;
        }
        loadMaterials();
    }, [job]);

    const loadMaterials = async () => {
        setLoading(true);
        try {
            // Load user's existing documents
            const { data } = await profileAPI.getDocuments();

            // Find resume
            const resumeDoc = data.documents?.find(doc =>
                doc.document_type === 'resume' || doc.document_type === 'cv'
            );
            if (resumeDoc) {
                setResume(resumeDoc);
                setChecklist(prev => ({ ...prev, resume: true }));
            }

            // Load certificates
            const certs = data.documents?.filter(doc =>
                doc.document_type === 'certificate'
            ) || [];
            setCertificates(certs);
            if (certs.length > 0) {
                setChecklist(prev => ({ ...prev, certificates: true }));
            }

        } catch (error) {
            console.error('Failed to load materials:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateMotivationLetter = async () => {
        setGenerating(true);
        try {
            const { data } = await materialsAPI.generateMotivationLetter({
                job_title: job.job_title,
                company_name: job.company_name,
                job_description: job.description || '',
                job_requirements: job.requirements || [],
                location: job.location || job.company_location
            });

            setMotivationLetter(data.motivation_letter || data.cover_letter);
            setChecklist(prev => ({ ...prev, motivationLetter: true }));
            alert('✅ Motivation letter generated successfully!');
        } catch (error) {
            console.error('Failed to generate motivation letter:', error);
            alert('Failed to generate motivation letter. Please try again.');
        } finally {
            setGenerating(false);
        }
    };

    const handleSaveMotivationLetter = async () => {
        setSaving(true);
        try {
            await materialsAPI.saveMotivationLetter({
                job_title: job.job_title,
                company_name: job.company_name,
                content: motivationLetter
            });

            setIsEditingLetter(false);
            alert('✅ Motivation letter saved successfully!');
        } catch (error) {
            console.error('Failed to save motivation letter:', error);
            alert('Failed to save motivation letter.');
        } finally {
            setSaving(false);
        }
    };

    const handleDownloadLetter = async () => {
        try {
            const { data } = await materialsAPI.downloadMotivationLetter({
                content: motivationLetter,
                job_title: job.job_title,
                company_name: job.company_name
            });

            // Create download link
            const blob = new Blob([data], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Motivation_Letter_${job.company_name}_${job.job_title}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            alert('✅ Motivation letter downloaded!');
        } catch (error) {
            console.error('Failed to download letter:', error);
            alert('Failed to download letter.');
        }
    };

    const handleDownloadAllMaterials = async () => {
        setDownloading(true);
        try {
            const { data } = await materialsAPI.downloadAllMaterials({
                job_title: job.job_title,
                company_name: job.company_name,
                motivation_letter: motivationLetter,
                resume_id: resume?.id,
                certificate_ids: certificates.map(c => c.id)
            });

            // Create download link
            const blob = new Blob([data], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Application_Package_${job.company_name}_${job.job_title}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            alert('✅ All materials downloaded as single PDF!');
        } catch (error) {
            console.error('Failed to download all materials:', error);
            alert('Failed to download all materials.');
        } finally {
            setDownloading(false);
        }
    };

    const handleSubmitApplication = async () => {
        // Check if all required materials are ready
        if (!motivationLetter || !resume) {
            alert('Please generate motivation letter and upload resume first.');
            return;
        }

        try {
            await materialsAPI.submitApplication({
                job_title: job.job_title,
                company_name: job.company_name,
                job_url: job.job_url,
                job_description: job.description,
                location: job.location || job.company_location,
                motivation_letter: motivationLetter,
                resume_id: resume.id,
                match_score: job.match_score
            });

            alert('✅ Application submitted successfully!');
            navigate('/applications');
        } catch (error) {
            console.error('Failed to submit application:', error);
            alert('Failed to submit application.');
        }
    };

    if (!job) {
        return null;
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader className="animate-spin text-blue-500" size={48} />
            </div>
        );
    }

    const allMaterialsReady = motivationLetter && resume;
    const completionPercentage = Object.values(checklist).filter(Boolean).length / Object.keys(checklist).length * 100;

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-2"
                    >
                        <ArrowLeft size={20} />
                        Back to Search
                    </button>
                    <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
                        <FileText className="text-blue-600" />
                        Application Materials
                    </h1>
                    <p className="text-gray-600 mt-2">
                        Prepare and organize all materials for your application
                    </p>
                </div>

                {/* Completion Progress */}
                <div className="text-right">
                    <div className="text-sm text-gray-600 mb-1">
                        Completion: {Math.round(completionPercentage)}%
                    </div>
                    <div className="w-48 bg-gray-200 rounded-full h-2">
                        <div
                            className="bg-blue-600 h-2 rounded-full transition-all"
                            style={{ width: `${completionPercentage}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* Job Information */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 border border-blue-200">
                <h2 className="text-2xl font-bold text-gray-800 mb-2">
                    {job.job_title}
                </h2>
                <p className="text-xl text-gray-600 mb-4">
                    {job.company_name}
                </p>

                <div className="flex flex-wrap gap-4 text-sm text-gray-600">
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
                    {job.match_score && (
                        <div className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded-full font-semibold">
                            <CheckCircle2 size={14} />
                            <span>{job.match_score}% Match</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Job Description */}
            <div className="bg-white rounded-lg shadow">
                <button
                    onClick={() => setShowJobDescription(!showJobDescription)}
                    className="w-full px-6 py-4 flex items-center justify-between text-left border-b border-gray-200 hover:bg-gray-50"
                >
                    <h3 className="text-lg font-semibold text-gray-800">
                        Job Description
                    </h3>
                    {showJobDescription ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </button>

                {showJobDescription && (
                    <div className="p-6 prose max-w-none">
                        <p className="text-gray-700 whitespace-pre-wrap">
                            {job.description || 'No description available'}
                        </p>

                        {job.requirements && job.requirements.length > 0 && (
                            <div className="mt-4">
                                <h4 className="font-semibold text-gray-800 mb-2">Requirements:</h4>
                                <ul className="list-disc pl-5 space-y-1 text-gray-700">
                                    {job.requirements.map((req, i) => (
                                        <li key={i}>{req}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Materials Checklist */}
            <div className="bg-white rounded-lg shadow">
                <button
                    onClick={() => setShowMaterialsList(!showMaterialsList)}
                    className="w-full px-6 py-4 flex items-center justify-between text-left border-b border-gray-200 hover:bg-gray-50"
                >
                    <h3 className="text-lg font-semibold text-gray-800">
                        Required Materials
                    </h3>
                    {showMaterialsList ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </button>

                {showMaterialsList && (
                    <div className="p-6 space-y-3">
                        {[
                            { key: 'motivationLetter', label: 'Motivation Letter', required: true },
                            { key: 'resume', label: 'Resume / CV', required: true },
                            { key: 'certificates', label: 'Certificates', required: false },
                            { key: 'portfolio', label: 'Portfolio / Work Samples', required: false },
                            { key: 'references', label: 'Reference Letters', required: false }
                        ].map(item => (
                            <div
                                key={item.key}
                                className={`flex items-center justify-between p-3 rounded-lg border ${checklist[item.key]
                                    ? 'bg-green-50 border-green-200'
                                    : 'bg-gray-50 border-gray-200'
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    {checklist[item.key] ? (
                                        <CheckCircle2 className="text-green-600" size={20} />
                                    ) : (
                                        <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
                                    )}
                                    <span className={`font-medium ${checklist[item.key] ? 'text-green-800' : 'text-gray-700'
                                        }`}>
                                        {item.label}
                                        {item.required && <span className="text-red-500 ml-1">*</span>}
                                    </span>
                                </div>
                                <span className={`text-sm ${checklist[item.key] ? 'text-green-600' : 'text-gray-500'
                                    }`}>
                                    {checklist[item.key] ? 'Ready' : 'Pending'}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Motivation Letter Section */}
            <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-800">
                        Motivation Letter
                    </h3>
                    <div className="flex items-center gap-2">
                        {!motivationLetter && (
                            <button
                                onClick={handleGenerateMotivationLetter}
                                disabled={generating}
                                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 flex items-center gap-2"
                            >
                                {generating ? (
                                    <>
                                        <Loader className="animate-spin" size={16} />
                                        Generating...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles size={16} />
                                        Generate with AI
                                    </>
                                )}
                            </button>
                        )}

                        {motivationLetter && !isEditingLetter && (
                            <>
                                <button
                                    onClick={() => setIsEditingLetter(true)}
                                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-2"
                                >
                                    <Edit3 size={16} />
                                    Edit
                                </button>
                                <button
                                    onClick={handleDownloadLetter}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                                >
                                    <Download size={16} />
                                    Download PDF
                                </button>
                            </>
                        )}

                        {isEditingLetter && (
                            <>
                                <button
                                    onClick={() => setIsEditingLetter(false)}
                                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-2"
                                >
                                    <X size={16} />
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSaveMotivationLetter}
                                    disabled={saving}
                                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 flex items-center gap-2"
                                >
                                    {saving ? (
                                        <>
                                            <Loader className="animate-spin" size={16} />
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <Save size={16} />
                                            Save
                                        </>
                                    )}
                                </button>
                            </>
                        )}
                    </div>
                </div>

                <div className="p-6">
                    {!motivationLetter ? (
                        <div className="text-center py-12">
                            <FilePlus className="mx-auto text-gray-400 mb-4" size={48} />
                            <p className="text-gray-600 mb-4">
                                No motivation letter yet. Generate one with AI using your profile and job description.
                            </p>
                            <button
                                onClick={handleGenerateMotivationLetter}
                                disabled={generating}
                                className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 inline-flex items-center gap-2"
                            >
                                {generating ? (
                                    <>
                                        <Loader className="animate-spin" size={20} />
                                        Generating...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles size={20} />
                                        Generate with AI
                                    </>
                                )}
                            </button>
                        </div>
                    ) : isEditingLetter ? (
                        <textarea
                            value={motivationLetter}
                            onChange={(e) => setMotivationLetter(e.target.value)}
                            className="w-full h-96 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                            placeholder="Write your motivation letter here..."
                        />
                    ) : (
                        <div className="prose max-w-none">
                            <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                                <p className="whitespace-pre-wrap text-gray-800">
                                    {motivationLetter}
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Resume Section */}
            <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                    Resume / CV
                </h3>

                {resume ? (
                    <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center gap-3">
                            <CheckCircle2 className="text-green-600" size={24} />
                            <div>
                                <p className="font-medium text-green-800">
                                    {resume.file_name || 'Resume.pdf'}
                                </p>
                                <p className="text-sm text-green-600">
                                    Uploaded: {new Date(resume.created_at).toLocaleDateString()}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => navigate('/profile')}
                            className="px-4 py-2 border border-green-300 text-green-700 rounded-lg hover:bg-green-100"
                        >
                            Change Resume
                        </button>
                    </div>
                ) : (
                    <div className="text-center py-8 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <AlertCircle className="mx-auto text-yellow-600 mb-3" size={48} />
                        <p className="text-yellow-800 mb-4">
                            No resume found. Please upload your resume in your profile.
                        </p>
                        <button
                            onClick={() => navigate('/profile')}
                            className="px-6 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
                        >
                            Go to Profile
                        </button>
                    </div>
                )}
            </div>

            {/* Action Buttons */}
            <div className="bg-white rounded-lg shadow p-6">
                <div className="grid md:grid-cols-2 gap-4">
                    <button
                        onClick={handleDownloadAllMaterials}
                        disabled={!allMaterialsReady || downloading}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center justify-center gap-2 text-lg font-medium"
                    >
                        {downloading ? (
                            <>
                                <Loader className="animate-spin" size={20} />
                                Preparing Download...
                            </>
                        ) : (
                            <>
                                <FileDown size={20} />
                                Download All Materials (Merged PDF)
                            </>
                        )}
                    </button>

                    <button
                        onClick={handleSubmitApplication}
                        disabled={!allMaterialsReady}
                        className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 flex items-center justify-center gap-2 text-lg font-medium"
                    >
                        <Send size={20} />
                        Submit Application
                    </button>
                </div>

                {!allMaterialsReady && (
                    <p className="text-center text-sm text-gray-600 mt-3">
                        <AlertCircle className="inline mr-1" size={14} />
                        Please complete all required materials before submitting
                    </p>
                )}
            </div>
        </div>
    );
}