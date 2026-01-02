import React, { useState, useEffect } from 'react';
import {
    Upload, Download, Save, Plus, X, Loader, FileText, AlertCircle, CheckCircle,
    Eye, File, Trash2, FolderOpen, ChevronDown, ChevronUp, User, Briefcase,
    GraduationCap, Code, Award, Globe, RefreshCw, Layout
} from 'lucide-react';
import { profileAPI } from '../services/api';

export default function Profile() {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [uploadSuccess, setUploadSuccess] = useState(false);

    // Tab state
    const [activeTab, setActiveTab] = useState('resume');

    // Resume states
    const [resumeDocument, setResumeDocument] = useState(null);
    const [selectedTemplate, setSelectedTemplate] = useState('professional');
    const [previewPDF, setPreviewPDF] = useState(null);
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    // Collapsible sections state
    const [expandedSections, setExpandedSections] = useState({
        personal: true,
        experience: false,
        education: false,
        skills: false,
        additional: false
    });

    // Documents states
    const [allDocuments, setAllDocuments] = useState([]);
    const [uploadingDoc, setUploadingDoc] = useState(false);
    const [selectedDocType, setSelectedDocType] = useState('motivation_letter');

    const TABS = [
        { id: 'resume', label: 'Resume Builder', icon: FileText },
        { id: 'documents', label: 'Supporting Documents', icon: FolderOpen },
    ];

    const TEMPLATES = [
        { id: 'modern', name: 'Modern', color: 'blue', description: 'Clean, minimal design' },
        { id: 'professional', name: 'Professional', color: 'slate', description: 'Traditional, ATS-friendly' },
        { id: 'academic', name: 'Academic', color: 'purple', description: 'Publication-focused CV' }
    ];

    const DOCUMENT_TYPES = [
        { value: 'motivation_letter', label: 'Motivation Letter', icon: FileText, color: 'blue' },
        { value: 'diploma', label: 'Diploma/Degree', icon: Award, color: 'purple' },
        { value: 'certificate', label: 'Certificate', icon: Award, color: 'green' },
        { value: 'transcript', label: 'Transcript', icon: FileText, color: 'yellow' },
        { value: 'other', label: 'Other Document', icon: File, color: 'gray' },
    ];

    useEffect(() => {
        loadProfile();
        loadAllDocuments();
    }, []);

    useEffect(() => {
        return () => {
            if (previewPDF && previewPDF.startsWith('blob:')) {
                URL.revokeObjectURL(previewPDF);
            }
        };
    }, [previewPDF]);

    const loadProfile = async () => {
        try {
            const { data } = await profileAPI.getProfile();
            setProfile(data.profile_data || getEmptyProfile());

            // ✅ FIXED: Set resume document if exists
            if (data.latest_resume) {
                setResumeDocument(data.latest_resume);
            }
        } catch (error) {
            console.error('Failed to load profile:', error);
            setProfile(getEmptyProfile());
        } finally {
            setLoading(false);
        }
    };

    const loadAllDocuments = async () => {
        try {
            const { data } = await profileAPI.getDocuments();
            setAllDocuments(data.documents || []);
            const resume = data.documents?.find(doc => doc.document_type === 'resume');
            if (resume) setResumeDocument(resume);
        } catch (error) {
            console.error('Failed to load documents:', error);
        }
    };

    const getEmptyProfile = () => ({
        full_name: '', gender: null, phone: '', location: '', personal_website: '',
        github_url: '', linkedin_url: '', current_title: '', years_of_experience: 0,
        professional_summary: '', work_experience: [], education: [], projects: [],
        training_certifications: [], publications: [], languages: [], awards_honors: [],
        technical_skills: {
            programming_languages: [], frameworks: [], databases: [], tools: [],
            cloud_platforms: [], soft_skills: [], other_skills: []
        },
        online_courses: [], volunteer_work: []
    });

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
        if (!allowedTypes.includes(file.type)) {
            alert('Please upload a PDF or DOCX file');
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            alert('File size must be less than 10MB');
            return;
        }

        setUploading(true);
        try {
            const { data } = await profileAPI.uploadResume(file);
            if (data.extracted_info) {
                const personal = data.extracted_info.personal_info || {};
                const newProfile = {
                    ...profile,
                    ...personal,
                    work_experience: data.extracted_info.work_experience || profile.work_experience,
                    education: data.extracted_info.education || profile.education,
                    projects: data.extracted_info.projects || profile.projects,
                    training_certifications: data.extracted_info.training_certifications || profile.training_certifications,
                    publications: data.extracted_info.publications || profile.publications,
                    languages: data.extracted_info.languages || profile.languages,
                    awards_honors: data.extracted_info.awards_honors || profile.awards_honors,
                    technical_skills: data.extracted_info.technical_skills || profile.technical_skills,
                    online_courses: data.extracted_info.online_courses || profile.online_courses,
                    volunteer_work: data.extracted_info.volunteer_work || profile.volunteer_work
                };
                setProfile(newProfile);
                await handleSave(newProfile);
                await loadAllDocuments();
                setUploadSuccess(true);
                setTimeout(() => setUploadSuccess(false), 3000);
            }
        } catch (error) {
            console.error('Upload failed:', error);
            alert(error.response?.data?.detail || 'Failed to upload resume.');
        } finally {
            setUploading(false);
        }
    };

    const handleSave = async (dataToSave = null) => {
        setSaving(true);
        try {
            await profileAPI.updateProfile({ profile_data: dataToSave || profile });
            setUploadSuccess(true);
            setHasChanges(false);
            setTimeout(() => setUploadSuccess(false), 3000);
        } catch (error) {
            console.error('Save failed:', error);
            alert('Failed to save profile.');
        } finally {
            setSaving(false);
        }
    };

    const handleGeneratePreview = async () => {
        setGenerating(true);
        try {
            const response = await profileAPI.generateResume(selectedTemplate);
            const blob = new Blob([response.data], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            setPreviewPDF(url);
            setShowPreviewModal(true);
        } catch (error) {
            console.error('Preview failed:', error);
            alert('Failed to generate preview. Please make sure your profile is complete.');
        } finally {
            setGenerating(false);
        }
    };

    const handleDownload = async () => {
        setDownloading(true);
        try {
            const response = await profileAPI.generateResume(selectedTemplate);
            const blob = new Blob([response.data], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${profile.full_name || 'Resume'}_${selectedTemplate}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Download failed:', error);
            alert('Failed to download resume.');
        } finally {
            setDownloading(false);
        }
    };

    const toggleSection = (section) => {
        setExpandedSections(prev => ({
            ...prev,
            [section]: !prev[section]
        }));
    };

    const updateProfile = (updates) => {
        setProfile({ ...profile, ...updates });
        setHasChanges(true);
    };

    const addItem = (field) => {
        const newProfile = { ...profile };
        newProfile[field] = [...(newProfile[field] || []), getEmptyItem(field)];
        setProfile(newProfile);
        setHasChanges(true);
    };

    const removeItem = (field, index) => {
        const newProfile = { ...profile };
        newProfile[field] = newProfile[field].filter((_, i) => i !== index);
        setProfile(newProfile);
        setHasChanges(true);
    };

    const updateItem = (field, index, updates) => {
        const newProfile = { ...profile };
        newProfile[field] = [...newProfile[field]];
        newProfile[field][index] = { ...newProfile[field][index], ...updates };
        setProfile(newProfile);
        setHasChanges(true);
    };

    const getEmptyItem = (field) => {
        const templates = {
            work_experience: { company: '', position: '', location: '', start_date: '', end_date: '', responsibilities: [] },
            education: { institution: '', degree: '', field_of_study: '', location: '', start_date: '', end_date: '', gpa: '' },
            projects: { project_name: '', role: '', description: '', tools_and_skills: [], url: '' },
            training_certifications: { name: '', issuing_organization: '', issue_date: '', url: '' },
            publications: { title: '', authors: [], publication_type: '', publisher: '', publication_date: '' },
            languages: { language: '', proficiency: 'Professional' },
            awards_honors: { title: '', issuer: '', date: '', description: '' },
            online_courses: { course_name: '', platform: '', completion_date: '' },
            volunteer_work: { organization: '', role: '', start_date: '', end_date: '', description: '' }
        };
        return templates[field] || {};
    };

    const handleDocumentUpload = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        setUploadingDoc(true);
        try {
            for (const file of files) {
                await profileAPI.uploadDocument(file, selectedDocType);
            }
            await loadAllDocuments();
            alert(`Successfully uploaded ${files.length} document(s)`);
        } catch (error) {
            console.error('Document upload failed:', error);
            alert('Failed to upload document.');
        } finally {
            setUploadingDoc(false);
        }
    };

    const handleDeleteDocument = async (docId) => {
        if (!confirm('Are you sure you want to delete this document?')) return;
        try {
            await profileAPI.deleteDocument(docId);
            await loadAllDocuments();
        } catch (error) {
            console.error('Delete failed:', error);
            alert('Failed to delete document.');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader className="animate-spin text-blue-500" size={48} />
                <p className="text-gray-600 ml-4">Loading your profile...</p>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-4xl font-bold text-gray-900 mb-2">Career Profile</h1>
                <p className="text-gray-600">Build your professional resume and manage documents</p>
            </div>

            {/* Status Messages */}
            {uploadSuccess && (
                <div className="mb-6 bg-green-50 border-l-4 border-green-500 p-4 rounded-r-lg">
                    <div className="flex items-center">
                        <CheckCircle className="text-green-500 mr-3" size={24} />
                        <div>
                            <p className="font-semibold text-green-800">Success!</p>
                            <p className="text-green-700 text-sm">Your changes have been saved</p>
                        </div>
                    </div>
                </div>
            )}

            {hasChanges && (
                <div className="mb-6 bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center">
                            <AlertCircle className="text-amber-500 mr-3" size={24} />
                            <div>
                                <p className="font-semibold text-amber-800">Unsaved Changes</p>
                                <p className="text-amber-700 text-sm">Remember to save your profile</p>
                            </div>
                        </div>
                        <button
                            onClick={() => handleSave()}
                            disabled={saving}
                            className="flex items-center gap-2 px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50"
                        >
                            {saving ? <Loader className="animate-spin" size={18} /> : <Save size={18} />}
                            Save Now
                        </button>
                    </div>
                </div>
            )}

            {/* Tabs */}
            <div className="mb-6 border-b-2 border-gray-200">
                <div className="flex gap-1">
                    {TABS.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-6 py-3 font-medium border-b-4 transition-all ${isActive
                                    ? 'text-blue-600 border-blue-600 bg-blue-50'
                                    : 'text-gray-600 border-transparent hover:text-blue-600 hover:bg-gray-50'
                                    }`}
                            >
                                <Icon size={20} />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Content */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200">
                {activeTab === 'resume' && (
                    <ResumeBuilder
                        profile={profile}
                        resumeDocument={resumeDocument}
                        selectedTemplate={selectedTemplate}
                        templates={TEMPLATES}
                        uploading={uploading}
                        generating={generating}
                        downloading={downloading}
                        saving={saving}
                        hasChanges={hasChanges}
                        expandedSections={expandedSections}
                        onFileUpload={handleFileUpload}
                        onGeneratePreview={handleGeneratePreview}
                        onDownload={handleDownload}
                        onSave={handleSave}
                        onTemplateChange={setSelectedTemplate}
                        toggleSection={toggleSection}
                        updateProfile={updateProfile}
                        addItem={addItem}
                        removeItem={removeItem}
                        updateItem={updateItem}
                    />
                )}

                {activeTab === 'documents' && (
                    <DocumentsManager
                        documents={allDocuments.filter(doc => doc.document_type !== 'resume')}
                        selectedDocType={selectedDocType}
                        uploadingDoc={uploadingDoc}
                        documentTypes={DOCUMENT_TYPES}
                        onDocTypeChange={setSelectedDocType}
                        onDocumentUpload={handleDocumentUpload}
                        onDeleteDocument={handleDeleteDocument}
                    />
                )}
            </div>

            {/* Preview Modal */}
            {showPreviewModal && previewPDF && (
                <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col">
                        <div className="flex items-center justify-between p-6 border-b">
                            <div>
                                <h3 className="text-2xl font-bold text-gray-900">Resume Preview</h3>
                                <p className="text-sm text-gray-600 mt-1">Template: {selectedTemplate}</p>
                            </div>
                            <button
                                onClick={() => {
                                    setShowPreviewModal(false);
                                    if (previewPDF.startsWith('blob:')) {
                                        URL.revokeObjectURL(previewPDF);
                                    }
                                    setPreviewPDF(null);
                                }}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <X size={24} />
                            </button>
                        </div>
                        <div className="flex-1 overflow-hidden p-4">
                            <iframe
                                src={previewPDF}
                                className="w-full h-full rounded-lg border-2 border-gray-200"
                                title="Resume Preview"
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ============================================================================
// RESUME BUILDER COMPONENT
// ============================================================================

function ResumeBuilder({
    profile, resumeDocument, selectedTemplate, templates, uploading, generating,
    downloading, saving, hasChanges, expandedSections, onFileUpload, onGeneratePreview,
    onDownload, onSave, onTemplateChange, toggleSection, updateProfile, addItem,
    removeItem, updateItem
}) {
    return (
        <div className="p-8 space-y-8">
            {/* Quick Actions Bar */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border-2 border-blue-100">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-1">Resume Builder</h2>
                        <p className="text-gray-600">Create your professional resume in minutes</p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={onSave}
                            disabled={saving || !hasChanges}
                            className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md transition-all font-medium"
                        >
                            {saving ? <Loader className="animate-spin" size={20} /> : <Save size={20} />}
                            {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                        <button
                            onClick={onGeneratePreview}
                            disabled={generating}
                            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 shadow-md transition-all font-medium"
                        >
                            {generating ? <Loader className="animate-spin" size={20} /> : <Eye size={20} />}
                            {generating ? 'Generating...' : 'Preview PDF'}
                        </button>
                        <button
                            onClick={onDownload}
                            disabled={downloading}
                            className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 shadow-md transition-all font-medium"
                        >
                            {downloading ? <Loader className="animate-spin" size={20} /> : <Download size={20} />}
                            {downloading ? 'Downloading...' : 'Download PDF'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Upload Resume Section */}
            <div className="bg-white rounded-xl border-2 border-dashed border-gray-300 p-8 hover:border-blue-400 hover:bg-blue-50 transition-all">
                <div className="max-w-2xl mx-auto text-center">
                    <div className="bg-blue-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Upload className="text-blue-600" size={36} />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                        {resumeDocument ? 'Update Your Resume' : 'Upload Your Resume'}
                    </h3>
                    <p className="text-gray-600 mb-4">
                        AI will automatically extract and fill your information
                    </p>
                    {resumeDocument && (
                        <div className="mb-4 p-3 bg-gray-50 rounded-lg inline-block">
                            <p className="text-sm font-medium text-gray-700">{resumeDocument.file_name}</p>
                            <p className="text-xs text-gray-500">
                                {(resumeDocument.file_size / 1024).toFixed(1)} KB • {new Date(resumeDocument.created_at).toLocaleDateString()}
                            </p>
                        </div>
                    )}
                    <label className="inline-block cursor-pointer">
                        <span className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 inline-flex items-center gap-3 font-medium shadow-lg transition-all">
                            {uploading ? (
                                <>
                                    <Loader className="animate-spin" size={24} />
                                    Processing...
                                </>
                            ) : (
                                <>
                                    <Upload size={24} />
                                    Choose File
                                </>
                            )}
                        </span>
                        <input
                            type="file"
                            accept=".pdf,.docx"
                            onChange={onFileUpload}
                            disabled={uploading}
                            className="hidden"
                        />
                    </label>
                    <p className="text-xs text-gray-500 mt-4">Supported: PDF, DOCX (Max 10MB)</p>
                </div>
            </div>

            {/* Template Selector */}
            <div className="bg-gray-50 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <Layout className="text-blue-600" size={24} />
                        <h3 className="text-xl font-bold text-gray-900">Choose Template</h3>
                    </div>
                    <span className="text-sm text-gray-600">Selected: <span className="font-semibold text-blue-600">{selectedTemplate}</span></span>
                </div>
                <div className="grid md:grid-cols-3 gap-4">
                    {templates.map((template) => (
                        <button
                            key={template.id}
                            onClick={() => onTemplateChange(template.id)}
                            className={`p-6 rounded-xl border-2 transition-all text-left ${selectedTemplate === template.id
                                ? `border-${template.color}-500 bg-${template.color}-50 shadow-lg scale-105`
                                : 'border-gray-300 hover:border-gray-400 hover:shadow-md'
                                }`}
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div className={`p-3 rounded-lg bg-${template.color}-100`}>
                                    <FileText className={`text-${template.color}-600`} size={24} />
                                </div>
                                {selectedTemplate === template.id && (
                                    <CheckCircle className={`text-${template.color}-600`} size={24} />
                                )}
                            </div>
                            <h4 className="font-bold text-gray-900 text-lg mb-1">{template.name}</h4>
                            <p className="text-sm text-gray-600">{template.description}</p>
                        </button>
                    ))}
                </div>
            </div>

            {/* Profile Information Sections */}
            <div className="space-y-4">
                <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                    <User className="text-blue-600" size={28} />
                    Profile Information
                </h3>

                {/* Personal Info Section */}
                <CollapsibleSection
                    title="Personal Information"
                    icon={User}
                    isExpanded={expandedSections.personal}
                    onToggle={() => toggleSection('personal')}
                    required
                >
                    <PersonalInfoSection profile={profile} updateProfile={updateProfile} />
                </CollapsibleSection>

                {/* Experience Section */}
                <CollapsibleSection
                    title="Work Experience"
                    icon={Briefcase}
                    isExpanded={expandedSections.experience}
                    onToggle={() => toggleSection('experience')}
                    count={profile.work_experience?.length || 0}
                >
                    <ExperienceSection
                        profile={profile}
                        addItem={addItem}
                        removeItem={removeItem}
                        updateItem={updateItem}
                    />
                </CollapsibleSection>

                {/* Education Section */}
                <CollapsibleSection
                    title="Education"
                    icon={GraduationCap}
                    isExpanded={expandedSections.education}
                    onToggle={() => toggleSection('education')}
                    count={profile.education?.length || 0}
                >
                    <EducationSection
                        profile={profile}
                        addItem={addItem}
                        removeItem={removeItem}
                        updateItem={updateItem}
                    />
                </CollapsibleSection>

                {/* Skills Section */}
                <CollapsibleSection
                    title="Skills & Languages"
                    icon={Code}
                    isExpanded={expandedSections.skills}
                    onToggle={() => toggleSection('skills')}
                >
                    <SkillsSection
                        profile={profile}
                        updateProfile={updateProfile}
                        addItem={addItem}
                        removeItem={removeItem}
                        updateItem={updateItem}
                    />
                </CollapsibleSection>

                {/* Additional Section */}
                <CollapsibleSection
                    title="Additional Information"
                    icon={Award}
                    isExpanded={expandedSections.additional}
                    onToggle={() => toggleSection('additional')}
                >
                    <AdditionalSection
                        profile={profile}
                        addItem={addItem}
                        removeItem={removeItem}
                        updateItem={updateItem}
                    />
                </CollapsibleSection>
            </div>
        </div>
    );
}

// ============================================================================
// COLLAPSIBLE SECTION COMPONENT
// ============================================================================

function CollapsibleSection({ title, icon: Icon, isExpanded, onToggle, children, count, required }) {
    return (
        <div className="bg-white rounded-xl border-2 border-gray-200 overflow-hidden transition-all hover:border-blue-300">
            <button
                onClick={onToggle}
                className="w-full px-6 py-4 flex items-center justify-between bg-gradient-to-r from-gray-50 to-white hover:from-gray-100 transition-all"
            >
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                        <Icon className="text-blue-600" size={24} />
                    </div>
                    <h4 className="text-lg font-bold text-gray-900">{title}</h4>
                    {required && <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded-full font-medium">Required</span>}
                    {count !== undefined && count > 0 && (
                        <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded-full font-medium">
                            {count} {count === 1 ? 'item' : 'items'}
                        </span>
                    )}
                </div>
                {isExpanded ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
            </button>
            {isExpanded && (
                <div className="p-6 border-t-2 border-gray-100 bg-white">
                    {children}
                </div>
            )}
        </div>
    );
}

// ============================================================================
// PERSONAL INFO SECTION
// ============================================================================

function PersonalInfoSection({ profile, updateProfile }) {
    return (
        <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
                <Input
                    label="Full Name"
                    value={profile.full_name}
                    onChange={(e) => updateProfile({ full_name: e.target.value })}
                    placeholder="John Doe"
                    required
                />
                <Select
                    label="Gender"
                    value={profile.gender || ''}
                    onChange={(e) => updateProfile({ gender: e.target.value || null })}
                    options={[
                        { value: '', label: 'Prefer not to say' },
                        { value: 'male', label: 'Male' },
                        { value: 'female', label: 'Female' },
                        { value: 'non_binary', label: 'Non-binary' },
                    ]}
                />
                <Input
                    label="Phone"
                    type="tel"
                    value={profile.phone}
                    onChange={(e) => updateProfile({ phone: e.target.value })}
                    placeholder="+1 (555) 123-4567"
                />
                <Input
                    label="Location"
                    value={profile.location}
                    onChange={(e) => updateProfile({ location: e.target.value })}
                    placeholder="New York, NY"
                />
                <Input
                    label="Current Title"
                    value={profile.current_title}
                    onChange={(e) => updateProfile({ current_title: e.target.value })}
                    placeholder="Software Engineer"
                />
                <Input
                    label="Years of Experience"
                    type="number"
                    value={profile.years_of_experience}
                    onChange={(e) => updateProfile({ years_of_experience: parseInt(e.target.value) || 0 })}
                    min="0"
                />
            </div>

            <div className="grid md:grid-cols-3 gap-6">
                <Input
                    label="LinkedIn URL"
                    type="url"
                    value={profile.linkedin_url}
                    onChange={(e) => updateProfile({ linkedin_url: e.target.value })}
                    placeholder="https://linkedin.com/in/johndoe"
                    icon={Globe}
                />
                <Input
                    label="GitHub URL"
                    type="url"
                    value={profile.github_url}
                    onChange={(e) => updateProfile({ github_url: e.target.value })}
                    placeholder="https://github.com/johndoe"
                    icon={Globe}
                />
                <Input
                    label="Personal Website"
                    type="url"
                    value={profile.personal_website}
                    onChange={(e) => updateProfile({ personal_website: e.target.value })}
                    placeholder="https://johndoe.com"
                    icon={Globe}
                />
            </div>

            <Textarea
                label="Professional Summary"
                value={profile.professional_summary}
                onChange={(e) => updateProfile({ professional_summary: e.target.value })}
                rows={4}
                placeholder="Brief summary of your professional background, key achievements, and career objectives..."
            />
        </div>
    );
}

// ============================================================================
// EXPERIENCE SECTION
// ============================================================================

function ExperienceSection({ profile, addItem, removeItem, updateItem }) {
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center mb-4">
                <p className="text-gray-600">Add your work experience and projects</p>
                <button
                    onClick={() => addItem('work_experience')}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-md"
                >
                    <Plus size={20} />
                    Add Experience
                </button>
            </div>

            {profile.work_experience?.length === 0 ? (
                <EmptyState message="No work experience added yet. Click 'Add Experience' to get started." />
            ) : (
                profile.work_experience?.map((exp, index) => (
                    <Card key={index} onRemove={() => removeItem('work_experience', index)}>
                        <div className="grid md:grid-cols-2 gap-4">
                            <Input
                                label="Company"
                                value={exp.company || ''}
                                onChange={(e) => updateItem('work_experience', index, { company: e.target.value })}
                                placeholder="Company Name"
                            />
                            <Input
                                label="Position"
                                value={exp.position || ''}
                                onChange={(e) => updateItem('work_experience', index, { position: e.target.value })}
                                placeholder="Job Title"
                            />
                            <Input
                                label="Location"
                                value={exp.location || ''}
                                onChange={(e) => updateItem('work_experience', index, { location: e.target.value })}
                                placeholder="City, Country"
                            />
                            <div className="flex gap-2">
                                <Input
                                    label="Start Date"
                                    value={exp.start_date || ''}
                                    onChange={(e) => updateItem('work_experience', index, { start_date: e.target.value })}
                                    placeholder="YYYY-MM"
                                />
                                <Input
                                    label="End Date"
                                    value={exp.end_date || ''}
                                    onChange={(e) => updateItem('work_experience', index, { end_date: e.target.value })}
                                    placeholder="Present"
                                />
                            </div>
                        </div>
                        <Textarea
                            label="Responsibilities (one per line)"
                            value={Array.isArray(exp.responsibilities) ? exp.responsibilities.join('\n') : ''}
                            onChange={(e) => updateItem('work_experience', index, {
                                responsibilities: e.target.value.split('\n').filter(r => r.trim())
                            })}
                            rows={4}
                            placeholder="• Led team of 5 developers&#10;• Implemented new feature that increased revenue by 30%&#10;• Managed project timeline and deliverables"
                        />
                    </Card>
                ))
            )}

            {/* Projects */}
            <div className="mt-8 pt-6 border-t-2 border-gray-200">
                <div className="flex justify-between items-center mb-4">
                    <h5 className="text-lg font-bold text-gray-900">Projects</h5>
                    <button
                        onClick={() => addItem('projects')}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all shadow-md"
                    >
                        <Plus size={18} />
                        Add Project
                    </button>
                </div>

                {profile.projects?.length === 0 ? (
                    <EmptyState message="No projects added yet." />
                ) : (
                    profile.projects?.map((proj, index) => (
                        <Card key={index} onRemove={() => removeItem('projects', index)}>
                            <div className="grid md:grid-cols-2 gap-4">
                                <Input
                                    label="Project Name"
                                    value={proj.project_name || ''}
                                    onChange={(e) => updateItem('projects', index, { project_name: e.target.value })}
                                    placeholder="Project Title"
                                />
                                <Input
                                    label="Your Role"
                                    value={proj.role || ''}
                                    onChange={(e) => updateItem('projects', index, { role: e.target.value })}
                                    placeholder="Developer / Lead"
                                />
                                <Input
                                    label="Project URL"
                                    type="url"
                                    value={proj.url || ''}
                                    onChange={(e) => updateItem('projects', index, { url: e.target.value })}
                                    placeholder="https://github.com/project"
                                    className="md:col-span-2"
                                />
                            </div>
                            <Textarea
                                label="Description"
                                value={proj.description || ''}
                                onChange={(e) => updateItem('projects', index, { description: e.target.value })}
                                rows={3}
                                placeholder="Describe the project, your contributions, and impact..."
                            />
                            <Input
                                label="Technologies Used (comma-separated)"
                                value={Array.isArray(proj.tools_and_skills) ? proj.tools_and_skills.join(', ') : ''}
                                onChange={(e) => updateItem('projects', index, {
                                    tools_and_skills: e.target.value.split(',').map(s => s.trim()).filter(s => s)
                                })}
                                placeholder="Python, React, PostgreSQL, AWS"
                            />
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}

// ============================================================================
// EDUCATION SECTION
// ============================================================================

function EducationSection({ profile, addItem, removeItem, updateItem }) {
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center mb-4">
                <p className="text-gray-600">Add your educational background</p>
                <button
                    onClick={() => addItem('education')}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-md"
                >
                    <Plus size={20} />
                    Add Education
                </button>
            </div>

            {profile.education?.length === 0 ? (
                <EmptyState message="No education added yet. Click 'Add Education' to get started." />
            ) : (
                profile.education?.map((edu, index) => (
                    <Card key={index} onRemove={() => removeItem('education', index)}>
                        <div className="grid md:grid-cols-2 gap-4">
                            <Input
                                label="Institution"
                                value={edu.institution || ''}
                                onChange={(e) => updateItem('education', index, { institution: e.target.value })}
                                placeholder="University Name"
                            />
                            <Input
                                label="Degree"
                                value={edu.degree || ''}
                                onChange={(e) => updateItem('education', index, { degree: e.target.value })}
                                placeholder="Bachelor of Science"
                            />
                            <Input
                                label="Field of Study"
                                value={edu.field_of_study || ''}
                                onChange={(e) => updateItem('education', index, { field_of_study: e.target.value })}
                                placeholder="Computer Science"
                            />
                            <Input
                                label="Location"
                                value={edu.location || ''}
                                onChange={(e) => updateItem('education', index, { location: e.target.value })}
                                placeholder="City, Country"
                            />
                            <Input
                                label="Start Year"
                                value={edu.start_date || ''}
                                onChange={(e) => updateItem('education', index, { start_date: e.target.value })}
                                placeholder="2015"
                            />
                            <Input
                                label="End Year"
                                value={edu.end_date || ''}
                                onChange={(e) => updateItem('education', index, { end_date: e.target.value })}
                                placeholder="2019"
                            />
                            <Input
                                label="GPA (optional)"
                                value={edu.gpa || ''}
                                onChange={(e) => updateItem('education', index, { gpa: e.target.value })}
                                placeholder="3.8/4.0"
                            />
                        </div>
                        <Textarea
                            label="Summary / Achievements (optional)"
                            value={edu.summary || ''}
                            onChange={(e) => updateItem('education', index, { summary: e.target.value })}
                            rows={2}
                            placeholder="Honors, awards, relevant coursework, thesis..."
                        />
                    </Card>
                ))
            )}
        </div>
    );
}

// ============================================================================
// SKILLS SECTION
// ============================================================================

function SkillsSection({ profile, updateProfile, addItem, removeItem, updateItem }) {
    return (
        <div className="space-y-8">
            {/* Technical Skills */}
            <div>
                <h5 className="text-lg font-bold text-gray-900 mb-4">Technical Skills</h5>
                <div className="grid md:grid-cols-2 gap-6">
                    <Input
                        label="Programming Languages"
                        value={profile.technical_skills?.programming_languages?.join(', ') || ''}
                        onChange={(e) => updateProfile({
                            technical_skills: {
                                ...profile.technical_skills,
                                programming_languages: e.target.value.split(',').map(s => s.trim()).filter(s => s)
                            }
                        })}
                        placeholder="Python, JavaScript, Java"
                    />
                    <Input
                        label="Frameworks & Libraries"
                        value={profile.technical_skills?.frameworks?.join(', ') || ''}
                        onChange={(e) => updateProfile({
                            technical_skills: {
                                ...profile.technical_skills,
                                frameworks: e.target.value.split(',').map(s => s.trim()).filter(s => s)
                            }
                        })}
                        placeholder="React, Django, Spring Boot"
                    />
                    <Input
                        label="Databases"
                        value={profile.technical_skills?.databases?.join(', ') || ''}
                        onChange={(e) => updateProfile({
                            technical_skills: {
                                ...profile.technical_skills,
                                databases: e.target.value.split(',').map(s => s.trim()).filter(s => s)
                            }
                        })}
                        placeholder="PostgreSQL, MongoDB, Redis"
                    />
                    <Input
                        label="Tools & Technologies"
                        value={profile.technical_skills?.tools?.join(', ') || ''}
                        onChange={(e) => updateProfile({
                            technical_skills: {
                                ...profile.technical_skills,
                                tools: e.target.value.split(',').map(s => s.trim()).filter(s => s)
                            }
                        })}
                        placeholder="Git, Docker, Kubernetes"
                    />
                    <Input
                        label="Cloud Platforms"
                        value={profile.technical_skills?.cloud_platforms?.join(', ') || ''}
                        onChange={(e) => updateProfile({
                            technical_skills: {
                                ...profile.technical_skills,
                                cloud_platforms: e.target.value.split(',').map(s => s.trim()).filter(s => s)
                            }
                        })}
                        placeholder="AWS, Azure, Google Cloud"
                    />
                    <Input
                        label="Soft Skills"
                        value={profile.technical_skills?.soft_skills?.join(', ') || ''}
                        onChange={(e) => updateProfile({
                            technical_skills: {
                                ...profile.technical_skills,
                                soft_skills: e.target.value.split(',').map(s => s.trim()).filter(s => s)
                            }
                        })}
                        placeholder="Leadership, Communication, Problem Solving"
                    />
                </div>
            </div>

            {/* Languages */}
            <div className="pt-6 border-t-2 border-gray-200">
                <div className="flex justify-between items-center mb-4">
                    <h5 className="text-lg font-bold text-gray-900">Languages</h5>
                    <button
                        onClick={() => addItem('languages')}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-md"
                    >
                        <Plus size={18} />
                        Add Language
                    </button>
                </div>

                {profile.languages?.length === 0 ? (
                    <EmptyState message="No languages added yet." />
                ) : (
                    <div className="grid md:grid-cols-2 gap-4">
                        {profile.languages?.map((lang, index) => (
                            <Card key={index} onRemove={() => removeItem('languages', index)} inline>
                                <div className="flex gap-4">
                                    <Input
                                        label="Language"
                                        value={lang.language || ''}
                                        onChange={(e) => updateItem('languages', index, { language: e.target.value })}
                                        placeholder="English"
                                        className="flex-1"
                                    />
                                    <Select
                                        label="Proficiency"
                                        value={lang.proficiency || 'Professional'}
                                        onChange={(e) => updateItem('languages', index, { proficiency: e.target.value })}
                                        options={[
                                            { value: 'Native', label: 'Native' },
                                            { value: 'Fluent', label: 'Fluent' },
                                            { value: 'Professional', label: 'Professional' },
                                            { value: 'Conversational', label: 'Conversational' },
                                            { value: 'Basic', label: 'Basic' },
                                        ]}
                                        className="flex-1"
                                    />
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

// ============================================================================
// ADDITIONAL SECTION
// ============================================================================

function AdditionalSection({ profile, addItem, removeItem, updateItem }) {
    return (
        <div className="space-y-8">
            {/* Certifications */}
            <div>
                <div className="flex justify-between items-center mb-4">
                    <h5 className="text-lg font-bold text-gray-900">Certifications & Training</h5>
                    <button
                        onClick={() => addItem('training_certifications')}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        <Plus size={18} />
                        Add Certification
                    </button>
                </div>

                {profile.training_certifications?.length === 0 ? (
                    <EmptyState message="No certifications added." />
                ) : (
                    profile.training_certifications?.map((cert, index) => (
                        <Card key={index} onRemove={() => removeItem('training_certifications', index)}>
                            <div className="grid md:grid-cols-2 gap-4">
                                <Input label="Certification Name" value={cert.name || ''} onChange={(e) => updateItem('training_certifications', index, { name: e.target.value })} placeholder="AWS Certified Solutions Architect" />
                                <Input label="Issuing Organization" value={cert.issuing_organization || ''} onChange={(e) => updateItem('training_certifications', index, { issuing_organization: e.target.value })} placeholder="Amazon Web Services" />
                                <Input label="Issue Date" value={cert.issue_date || ''} onChange={(e) => updateItem('training_certifications', index, { issue_date: e.target.value })} placeholder="2023-06" />
                                <Input label="Credential URL" type="url" value={cert.url || ''} onChange={(e) => updateItem('training_certifications', index, { url: e.target.value })} placeholder="https://..." />
                            </div>
                        </Card>
                    ))
                )}
            </div>

            {/* Publications */}
            <div className="pt-6 border-t-2 border-gray-200">
                <div className="flex justify-between items-center mb-4">
                    <h5 className="text-lg font-bold text-gray-900">Publications</h5>
                    <button
                        onClick={() => addItem('publications')}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                    >
                        <Plus size={18} />
                        Add Publication
                    </button>
                </div>

                {profile.publications?.length === 0 ? (
                    <EmptyState message="No publications added." />
                ) : (
                    profile.publications?.map((pub, index) => (
                        <Card key={index} onRemove={() => removeItem('publications', index)}>
                            <Input label="Title" value={pub.title || ''} onChange={(e) => updateItem('publications', index, { title: e.target.value })} placeholder="Paper Title" className="mb-4" />
                            <div className="grid md:grid-cols-2 gap-4">
                                <Input label="Type" value={pub.publication_type || ''} onChange={(e) => updateItem('publications', index, { publication_type: e.target.value })} placeholder="Journal Article" />
                                <Input label="Publisher" value={pub.publisher || ''} onChange={(e) => updateItem('publications', index, { publisher: e.target.value })} placeholder="IEEE" />
                                <Input label="Date" value={pub.publication_date || ''} onChange={(e) => updateItem('publications', index, { publication_date: e.target.value })} placeholder="2023-08" />
                            </div>
                        </Card>
                    ))
                )}
            </div>

            {/* Awards */}
            <div className="pt-6 border-t-2 border-gray-200">
                <div className="flex justify-between items-center mb-4">
                    <h5 className="text-lg font-bold text-gray-900">Awards & Honors</h5>
                    <button
                        onClick={() => addItem('awards_honors')}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                        <Plus size={18} />
                        Add Award
                    </button>
                </div>

                {profile.awards_honors?.length === 0 ? (
                    <EmptyState message="No awards added." />
                ) : (
                    profile.awards_honors?.map((award, index) => (
                        <Card key={index} onRemove={() => removeItem('awards_honors', index)}>
                            <div className="grid md:grid-cols-3 gap-4">
                                <Input label="Award Title" value={award.title || ''} onChange={(e) => updateItem('awards_honors', index, { title: e.target.value })} placeholder="Employee of the Year" />
                                <Input label="Issuer" value={award.issuer || ''} onChange={(e) => updateItem('awards_honors', index, { issuer: e.target.value })} placeholder="Company Name" />
                                <Input label="Date" value={award.date || ''} onChange={(e) => updateItem('awards_honors', index, { date: e.target.value })} placeholder="2023" />
                            </div>
                            <Textarea label="Description" value={award.description || ''} onChange={(e) => updateItem('awards_honors', index, { description: e.target.value })} rows={2} placeholder="Brief description..." />
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}

// ============================================================================
// DOCUMENTS MANAGER COMPONENT - WITH FIXED DOCUMENT VIEWING
// ============================================================================

function DocumentsManager({ documents, selectedDocType, uploadingDoc, documentTypes, onDocTypeChange, onDocumentUpload, onDeleteDocument }) {
    const getDocumentIcon = (type) => {
        const docType = documentTypes.find(dt => dt.value === type);
        return docType ? docType.icon : File;
    };

    const getDocumentColor = (type) => {
        const docType = documentTypes.find(dt => dt.value === type);
        return docType ? docType.color : 'gray';
    };

    // ✅ FIX: Handle document view with proper authentication
    const handleViewDocument = async (doc) => {
        try {
            console.log('📄 Downloading:', doc.file_name);

            const response = await profileAPI.downloadDocument(doc.id);

            console.log('✅ Response:', {
                dataType: typeof response.data,
                dataSize: response.data?.size,
                isBlob: response.data instanceof Blob
            });

            // Check if data is valid
            if (!response.data || response.data.size === 0) {
                alert('Document is empty. Please check backend logs.');
                return;
            }

            // Detect content type from file extension
            const fileName = doc.file_name.toLowerCase();
            let contentType = 'application/pdf';

            if (fileName.endsWith('.png')) contentType = 'image/png';
            else if (fileName.endsWith('.jpg') || fileName.endsWith('.jpeg')) contentType = 'image/jpeg';
            else if (fileName.endsWith('.pdf')) contentType = 'application/pdf';

            // Create blob
            const blob = new Blob([response.data], { type: contentType });

            console.log('📦 Blob:', { size: blob.size, type: blob.type });

            // Create and open URL
            const url = URL.createObjectURL(blob);
            window.open(url, '_blank');

            setTimeout(() => URL.revokeObjectURL(url), 60000);

        } catch (error) {
            console.error('❌ Error:', error);
            alert('Failed to view document. Check console.');
        }
    };
    return (
        <div className="p-8 space-y-8">
            <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Supporting Documents</h2>
                <p className="text-gray-600">Upload and manage your career-related documents</p>
            </div>

            {/* Upload Section */}
            <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl p-6 border-2 border-purple-100">
                <div className="mb-4">
                    <label className="block text-sm font-bold text-gray-900 mb-2">Document Type</label>
                    <select
                        value={selectedDocType}
                        onChange={(e) => onDocTypeChange(e.target.value)}
                        className="w-full md:w-auto px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white shadow-sm"
                    >
                        {documentTypes.map(type => (
                            <option key={type.value} value={type.value}>{type.label}</option>
                        ))}
                    </select>
                </div>

                <div className="border-2 border-dashed border-purple-300 rounded-xl p-8 text-center bg-white hover:bg-purple-50 transition-all">
                    <label className="cursor-pointer">
                        <div className="flex flex-col items-center gap-4">
                            {uploadingDoc ? (
                                <>
                                    <Loader className="animate-spin text-purple-600" size={48} />
                                    <p className="text-lg font-semibold text-gray-900">Uploading...</p>
                                </>
                            ) : (
                                <>
                                    <div className="bg-purple-100 p-6 rounded-full">
                                        <Upload className="text-purple-600" size={40} />
                                    </div>
                                    <div>
                                        <p className="text-lg font-semibold text-gray-900 mb-1">Upload Documents</p>
                                        <p className="text-sm text-gray-600">Drag and drop or click to browse</p>
                                    </div>
                                    <p className="text-xs text-gray-500">Supported: PDF, DOCX, DOC, JPG, PNG (Max 10MB each)</p>
                                </>
                            )}
                        </div>
                        <input
                            type="file"
                            multiple
                            accept=".pdf,.docx,.doc,.jpg,.jpeg,.png"
                            onChange={onDocumentUpload}
                            disabled={uploadingDoc}
                            className="hidden"
                        />
                    </label>
                </div>
            </div>

            {/* Documents Grid */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-gray-900">Your Documents</h3>
                    <span className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                        {documents.length} {documents.length === 1 ? 'document' : 'documents'}
                    </span>
                </div>

                {documents.length === 0 ? (
                    <div className="text-center py-16 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                        <FolderOpen className="mx-auto text-gray-400 mb-4" size={64} />
                        <p className="text-gray-600 font-semibold text-lg mb-2">No documents yet</p>
                        <p className="text-gray-500 text-sm">Upload your first document to get started</p>
                    </div>
                ) : (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {documents.map((doc) => {
                            const DocIcon = getDocumentIcon(doc.document_type);
                            const colorClass = getDocumentColor(doc.document_type);

                            return (
                                <div
                                    key={doc.id}
                                    className="group bg-white border-2 border-gray-200 rounded-xl p-4 hover:border-purple-300 hover:shadow-lg transition-all"
                                >
                                    <div className="flex items-start gap-3">
                                        <div className={`bg-${colorClass}-100 p-3 rounded-lg flex-shrink-0`}>
                                            <DocIcon className={`text-${colorClass}-600`} size={24} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-gray-900 truncate mb-1">{doc.file_name}</p>
                                            <p className="text-xs text-gray-600 mb-2">
                                                {documentTypes.find(t => t.value === doc.document_type)?.label || doc.document_type}
                                            </p>
                                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                                <span>{(doc.file_size / 1024).toFixed(1)} KB</span>
                                                <span>•</span>
                                                <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 mt-4">
                                        {/* ✅ FIXED: Use button with API call instead of direct link */}
                                        <button
                                            onClick={() => handleViewDocument(doc)}
                                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                                        >
                                            <Eye size={16} />
                                            View
                                        </button>
                                        <button
                                            onClick={() => onDeleteDocument(doc.id)}
                                            className="flex items-center justify-center gap-2 px-3 py-2 text-sm bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function Input({ label, value, onChange, type = 'text', placeholder, className = '', required, icon: Icon, ...props }) {
    return (
        <div className={className}>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            <div className="relative">
                {Icon && (
                    <div className="absolute left-3 top-1/2 -translate-y-1/2">
                        <Icon className="text-gray-400" size={18} />
                    </div>
                )}
                <input
                    type={type}
                    value={value || ''}
                    onChange={onChange}
                    placeholder={placeholder}
                    className={`w-full ${Icon ? 'pl-10' : 'pl-4'} pr-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder-gray-400`}
                    {...props}
                />
            </div>
        </div>
    );
}

function Textarea({ label, value, onChange, rows = 3, placeholder, required, ...props }) {
    return (
        <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            <textarea
                value={value || ''}
                onChange={onChange}
                rows={rows}
                placeholder={placeholder}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder-gray-400 resize-none"
                {...props}
            />
        </div>
    );
}

function Select({ label, value, onChange, options, className = '', required, ...props }) {
    return (
        <div className={className}>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            <select
                value={value}
                onChange={onChange}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
                {...props}
            >
                {options.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
            </select>
        </div>
    );
}

function Card({ children, onRemove, inline = false }) {
    return (
        <div className={`relative border-2 border-gray-200 rounded-xl p-6 ${inline ? '' : 'bg-gray-50'} hover:border-blue-300 hover:shadow-md transition-all mb-4`}>
            <button
                onClick={onRemove}
                className="absolute top-4 right-4 p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-all"
                title="Remove"
            >
                <X size={20} />
            </button>
            <div className="pr-12 space-y-4">{children}</div>
        </div>
    );
}

function EmptyState({ message }) {
    return (
        <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
            <AlertCircle className="mx-auto text-gray-400 mb-3" size={48} />
            <p className="text-gray-600 font-medium">{message}</p>
        </div>
    );
}