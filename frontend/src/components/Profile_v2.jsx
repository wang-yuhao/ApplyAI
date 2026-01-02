import React, { useState, useEffect } from 'react';
import {
    Upload,
    Download,
    Save,
    Plus,
    X,
    Loader,
    FileText,
    AlertCircle,
    CheckCircle,
} from 'lucide-react';
import { profileAPI } from '../services/api';

export default function Profile() {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [uploadSuccess, setUploadSuccess] = useState(false);

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        try {
            const { data } = await profileAPI.getProfile();
            setProfile(data.profile_data || getEmptyProfile());
        } catch (error) {
            console.error('Failed to load profile:', error);
            setProfile(getEmptyProfile());
        } finally {
            setLoading(false);
        }
    };

    const getEmptyProfile = () => ({
        full_name: '',
        gender: null,
        phone: '',
        location: '',
        personal_website: '',
        github_url: '',
        linkedin_url: '',
        current_title: '',
        years_of_experience: 0,
        professional_summary: '',
        work_experience: [],
        education: [],
        projects: [],
        training_certifications: [],
        publications: [],
        languages: [],
        awards_honors: [],
        technical_skills: {
            programming_languages: [],
            frameworks: [],
            databases: [],
            tools: [],
            cloud_platforms: [],
            soft_skills: [],
            other_skills: []
        },
        online_courses: [],
        volunteer_work: []
    });

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const allowedTypes = [
            'application/pdf',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/msword',
            'text/plain'
        ];

        if (!allowedTypes.includes(file.type)) {
            alert('Please upload a PDF, DOCX, DOC, or TXT file');
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            alert('File size must be less than 10MB');
            return;
        }

        setUploading(true);
        setUploadSuccess(false);

        try {
            const { data } = await profileAPI.uploadResume(file);

            if (data.extracted_info) {
                const personal = data.extracted_info.personal_info || {};
                const newProfile = {
                    ...profile,
                    full_name: personal.full_name || profile.full_name,
                    gender: personal.gender || profile.gender,
                    phone: personal.phone || profile.phone,
                    location: personal.location || profile.location,
                    personal_website: personal.personal_website || profile.personal_website,
                    github_url: personal.github_url || profile.github_url,
                    linkedin_url: personal.linkedin_url || profile.linkedin_url,
                    current_title: personal.current_title || profile.current_title,
                    years_of_experience: personal.years_of_experience || profile.years_of_experience,
                    professional_summary: personal.professional_summary || profile.professional_summary,
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
                setUploadSuccess(true);
                await handleSave(newProfile);
            }
        } catch (error) {
            console.error('Upload failed:', error);
            alert(error.response?.data?.detail || 'Failed to upload resume. Please try again.');
        } finally {
            setUploading(false);
        }
    };

    const handleSave = async (dataToSave = null) => {
        setSaving(true);
        try {
            await profileAPI.updateProfile({ profile_data: dataToSave || profile });
            alert('Profile saved successfully!');
        } catch (error) {
            console.error('Save failed:', error);
            alert('Failed to save profile. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const handleDownload = async () => {
        setDownloading(true);
        try {
            const { data } = await profileAPI.downloadResume('professional');
            if (data.download_url) {
                window.open(data.download_url, '_blank');
            }
        } catch (error) {
            console.error('Download failed:', error);
            alert('Failed to generate resume. Please ensure your profile is complete.');
        } finally {
            setDownloading(false);
        }
    };

    const addItem = (field) => {
        const newProfile = { ...profile };
        newProfile[field] = [...(newProfile[field] || []), getEmptyItem(field)];
        setProfile(newProfile);
    };

    const removeItem = (field, index) => {
        const newProfile = { ...profile };
        newProfile[field] = newProfile[field].filter((_, i) => i !== index);
        setProfile(newProfile);
    };

    const updateItem = (field, index, updates) => {
        const newProfile = { ...profile };
        newProfile[field] = [...newProfile[field]];
        newProfile[field][index] = { ...newProfile[field][index], ...updates };
        setProfile(newProfile);
    };

    const getEmptyItem = (field) => {
        const templates = {
            work_experience: { company: '', position: '', location: '', start_date: '', end_date: '', current: false, skills: [], responsibilities: [], achievements: [] },
            education: { institution: '', location: '', degree: '', field_of_study: '', start_date: '', end_date: '', gpa: '', thesis_title: '', summary: '', honors: [] },
            projects: { project_name: '', role: '', location: '', start_date: '', end_date: '', tools_and_skills: [], description: '', achievements: [], url: '' },
            training_certifications: { name: '', issuing_organization: '', issue_date: '', expiry_date: '', credential_id: '', url: '' },
            publications: { title: '', authors: [], publication_type: '', publisher: '', publication_date: '', doi: '', url: '', abstract: '' },
            languages: { language: '', proficiency: 'Professional' },
            awards_honors: { title: '', issuer: '', date: '', description: '' },
            online_courses: { course_name: '', platform: '', instructor: '', completion_date: '', certificate_url: '', skills_learned: [] },
            volunteer_work: { organization: '', role: '', start_date: '', end_date: '', description: '' }
        };
        return templates[field] || {};
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader className="animate-spin text-blue-500" size={48} />
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">Profile & Materials</h1>
                    <p className="text-gray-600 mt-2">Upload your resume or enter information manually</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => handleSave()}
                        disabled={saving}
                        className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                        {saving ? <Loader className="animate-spin" size={20} /> : <Save size={20} />}
                        {saving ? 'Saving...' : 'Save Profile'}
                    </button>
                    <button
                        onClick={handleDownload}
                        disabled={downloading}
                        className="flex items-center gap-2 px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                    >
                        {downloading ? <Loader className="animate-spin" size={20} /> : <Download size={20} />}
                        {downloading ? 'Generating...' : 'Download PDF'}
                    </button>
                </div>
            </div>

            {/* PART 1: Upload Resume */}
            <div className="bg-white rounded-lg shadow-lg p-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                    <Upload size={28} className="text-blue-600" />
                    Part 1: Upload Your Resume/CV
                </h2>

                <div className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center hover:border-blue-400 transition-colors">
                    <div className="max-w-md mx-auto">
                        <FileText className="mx-auto text-gray-400 mb-4" size={64} />

                        {uploadSuccess && (
                            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center justify-center gap-2 text-green-800">
                                <CheckCircle size={20} />
                                <span>Resume processed successfully!</span>
                            </div>
                        )}

                        <h3 className="text-xl font-semibold text-gray-700 mb-2">
                            Upload Your Resume for AI Extraction
                        </h3>
                        <p className="text-gray-600 mb-6">
                            Our AI will automatically extract and fill in all your information
                        </p>

                        <label className="inline-block">
                            <span className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer inline-flex items-center gap-2 text-lg font-medium">
                                {uploading ? (
                                    <>
                                        <Loader className="animate-spin" size={24} />
                                        Processing...
                                    </>
                                ) : (
                                    <>
                                        <Upload size={24} />
                                        Choose File to Upload
                                    </>
                                )}
                            </span>
                            <input
                                type="file"
                                accept=".pdf,.docx,.doc,.txt"
                                onChange={handleFileUpload}
                                disabled={uploading}
                                className="hidden"
                            />
                        </label>

                        <p className="text-sm text-gray-500 mt-4">
                            Supported formats: PDF, DOCX, DOC, TXT (Max 10MB)
                        </p>
                    </div>
                </div>

                <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-6">
                    <h4 className="font-semibold text-blue-900 mb-3">What We Extract:</h4>
                    <div className="grid md:grid-cols-3 gap-4 text-sm text-blue-800">
                        <ul className="space-y-2">
                            <li>• Personal Information</li>
                            <li>• Contact Details</li>
                            <li>• Social Links</li>
                        </ul>
                        <ul className="space-y-2">
                            <li>• Work Experience</li>
                            <li>• Education History</li>
                            <li>• Projects & Research</li>
                        </ul>
                        <ul className="space-y-2">
                            <li>• Skills & Technologies</li>
                            <li>• Publications & Awards</li>
                            <li>• Certifications & Courses</li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* Divider */}
            <div className="relative">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t-2 border-gray-300"></div>
                </div>
                <div className="relative flex justify-center">
                    <span className="px-6 py-2 bg-gray-50 text-gray-600 font-medium rounded-full border-2 border-gray-300">
                        OR Enter Information Manually Below
                    </span>
                </div>
            </div>

            {/* PART 2: Manual Input */}
            <div className="bg-white rounded-lg shadow-lg p-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-8">
                    Part 2: Enter Information Manually
                </h2>

                <div className="space-y-10">
                    {/* Personal Information */}
                    <Section title="Personal Information">
                        <div className="grid md:grid-cols-2 gap-6">
                            <Input label="Full Name *" value={profile.full_name} onChange={(e) => setProfile({ ...profile, full_name: e.target.value })} placeholder="John Doe" />
                            <Select label="Gender" value={profile.gender || ''} onChange={(e) => setProfile({ ...profile, gender: e.target.value || null })} options={[
                                { value: '', label: 'Prefer not to say' },
                                { value: 'male', label: 'Male' },
                                { value: 'female', label: 'Female' },
                                { value: 'non_binary', label: 'Non-binary' },
                            ]} />
                            <Input label="Phone" type="tel" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} placeholder="+1 (555) 123-4567" />
                            <Input label="Location" value={profile.location} onChange={(e) => setProfile({ ...profile, location: e.target.value })} placeholder="New York, NY" />
                            <Input label="Current Title" value={profile.current_title} onChange={(e) => setProfile({ ...profile, current_title: e.target.value })} placeholder="Software Engineer" />
                            <Input label="Years of Experience" type="number" value={profile.years_of_experience} onChange={(e) => setProfile({ ...profile, years_of_experience: parseInt(e.target.value) || 0 })} min="0" />
                            <Input label="LinkedIn URL" type="url" value={profile.linkedin_url} onChange={(e) => setProfile({ ...profile, linkedin_url: e.target.value })} placeholder="https://linkedin.com/in/johndoe" />
                            <Input label="GitHub URL" type="url" value={profile.github_url} onChange={(e) => setProfile({ ...profile, github_url: e.target.value })} placeholder="https://github.com/johndoe" />
                            <Input label="Personal Website" type="url" value={profile.personal_website} onChange={(e) => setProfile({ ...profile, personal_website: e.target.value })} placeholder="https://johndoe.com" className="md:col-span-2" />
                        </div>
                        <Textarea label="Professional Summary" value={profile.professional_summary} onChange={(e) => setProfile({ ...profile, professional_summary: e.target.value })} rows={4} placeholder="Brief summary of your professional background..." />
                    </Section>

                    {/* Work Experience */}
                    <Section title="Work Experience" onAdd={() => addItem('work_experience')} addLabel="Add Work Experience">
                        {profile.work_experience?.length === 0 && <EmptyState message="No work experience added yet." />}
                        {profile.work_experience?.map((exp, index) => (
                            <Card key={index} onRemove={() => removeItem('work_experience', index)}>
                                <div className="grid md:grid-cols-2 gap-4">
                                    <Input label="Company" value={exp.company || ''} onChange={(e) => updateItem('work_experience', index, { company: e.target.value })} placeholder="Company Name" />
                                    <Input label="Position" value={exp.position || ''} onChange={(e) => updateItem('work_experience', index, { position: e.target.value })} placeholder="Job Title" />
                                    <Input label="Location" value={exp.location || ''} onChange={(e) => updateItem('work_experience', index, { location: e.target.value })} placeholder="City, Country" />
                                    <div className="flex gap-2">
                                        <Input label="Start Date" value={exp.start_date || ''} onChange={(e) => updateItem('work_experience', index, { start_date: e.target.value })} placeholder="YYYY-MM" />
                                        <Input label="End Date" value={exp.end_date || ''} onChange={(e) => updateItem('work_experience', index, { end_date: e.target.value })} placeholder="Present" />
                                    </div>
                                </div>
                                <Textarea label="Responsibilities (one per line)" value={Array.isArray(exp.responsibilities) ? exp.responsibilities.join('\n') : ''} onChange={(e) => updateItem('work_experience', index, { responsibilities: e.target.value.split('\n').filter(r => r.trim()) })} rows={3} placeholder="• Managed team&#10;• Led projects" />
                            </Card>
                        ))}
                    </Section>

                    {/* Education */}
                    <Section title="Education" onAdd={() => addItem('education')} addLabel="Add Education">
                        {profile.education?.length === 0 && <EmptyState message="No education added yet." />}
                        {profile.education?.map((edu, index) => (
                            <Card key={index} onRemove={() => removeItem('education', index)}>
                                <div className="grid md:grid-cols-2 gap-4">
                                    <Input label="Institution" value={edu.institution || ''} onChange={(e) => updateItem('education', index, { institution: e.target.value })} placeholder="University" />
                                    <Input label="Degree" value={edu.degree || ''} onChange={(e) => updateItem('education', index, { degree: e.target.value })} placeholder="Bachelor of Science" />
                                    <Input label="Field of Study" value={edu.field_of_study || ''} onChange={(e) => updateItem('education', index, { field_of_study: e.target.value })} placeholder="Computer Science" />
                                    <Input label="Location" value={edu.location || ''} onChange={(e) => updateItem('education', index, { location: e.target.value })} placeholder="City" />
                                    <Input label="Start" value={edu.start_date || ''} onChange={(e) => updateItem('education', index, { start_date: e.target.value })} placeholder="YYYY" />
                                    <Input label="End" value={edu.end_date || ''} onChange={(e) => updateItem('education', index, { end_date: e.target.value })} placeholder="YYYY" />
                                    <Input label="GPA" value={edu.gpa || ''} onChange={(e) => updateItem('education', index, { gpa: e.target.value })} placeholder="3.8/4.0" />
                                    <Input label="Thesis" value={edu.thesis_title || ''} onChange={(e) => updateItem('education', index, { thesis_title: e.target.value })} placeholder="Thesis title" />
                                </div>
                                <Textarea label="Summary" value={edu.summary || ''} onChange={(e) => updateItem('education', index, { summary: e.target.value })} rows={2} placeholder="Achievements..." />
                            </Card>
                        ))}
                    </Section>

                    {/* Projects */}
                    <Section title="Projects" onAdd={() => addItem('projects')} addLabel="Add Project">
                        {profile.projects?.length === 0 && <EmptyState message="No projects added yet." />}
                        {profile.projects?.map((proj, index) => (
                            <Card key={index} onRemove={() => removeItem('projects', index)}>
                                <div className="grid md:grid-cols-2 gap-4">
                                    <Input label="Project Name" value={proj.project_name || ''} onChange={(e) => updateItem('projects', index, { project_name: e.target.value })} placeholder="Project" />
                                    <Input label="Role" value={proj.role || ''} onChange={(e) => updateItem('projects', index, { role: e.target.value })} placeholder="Developer" />
                                    <Input label="URL" type="url" value={proj.url || ''} onChange={(e) => updateItem('projects', index, { url: e.target.value })} placeholder="https://github.com/project" className="md:col-span-2" />
                                </div>
                                <Textarea label="Description" value={proj.description || ''} onChange={(e) => updateItem('projects', index, { description: e.target.value })} rows={3} placeholder="Project details..." />
                                <Input label="Tools (comma-separated)" value={Array.isArray(proj.tools_and_skills) ? proj.tools_and_skills.join(', ') : ''} onChange={(e) => updateItem('projects', index, { tools_and_skills: e.target.value.split(',').map(s => s.trim()).filter(s => s) })} placeholder="Python, React" />
                            </Card>
                        ))}
                    </Section>

                    {/* Technical Skills */}
                    <Section title="Technical Skills">
                        <div className="grid md:grid-cols-2 gap-6">
                            <Input label="Programming Languages" value={profile.technical_skills?.programming_languages?.join(', ') || ''} onChange={(e) => setProfile({ ...profile, technical_skills: { ...profile.technical_skills, programming_languages: e.target.value.split(',').map(s => s.trim()).filter(s => s) } })} placeholder="Python, JavaScript" />
                            <Input label="Frameworks" value={profile.technical_skills?.frameworks?.join(', ') || ''} onChange={(e) => setProfile({ ...profile, technical_skills: { ...profile.technical_skills, frameworks: e.target.value.split(',').map(s => s.trim()).filter(s => s) } })} placeholder="React, Django" />
                            <Input label="Databases" value={profile.technical_skills?.databases?.join(', ') || ''} onChange={(e) => setProfile({ ...profile, technical_skills: { ...profile.technical_skills, databases: e.target.value.split(',').map(s => s.trim()).filter(s => s) } })} placeholder="PostgreSQL, MongoDB" />
                            <Input label="Tools" value={profile.technical_skills?.tools?.join(', ') || ''} onChange={(e) => setProfile({ ...profile, technical_skills: { ...profile.technical_skills, tools: e.target.value.split(',').map(s => s.trim()).filter(s => s) } })} placeholder="Git, Docker" />
                            <Input label="Cloud Platforms" value={profile.technical_skills?.cloud_platforms?.join(', ') || ''} onChange={(e) => setProfile({ ...profile, technical_skills: { ...profile.technical_skills, cloud_platforms: e.target.value.split(',').map(s => s.trim()).filter(s => s) } })} placeholder="AWS, Azure" />
                            <Input label="Soft Skills" value={profile.technical_skills?.soft_skills?.join(', ') || ''} onChange={(e) => setProfile({ ...profile, technical_skills: { ...profile.technical_skills, soft_skills: e.target.value.split(',').map(s => s.trim()).filter(s => s) } })} placeholder="Leadership, Communication" />
                        </div>
                    </Section>

                    {/* Languages */}
                    <Section title="Languages" onAdd={() => addItem('languages')} addLabel="Add Language">
                        {profile.languages?.length === 0 && <EmptyState message="No languages added." />}
                        <div className="grid md:grid-cols-2 gap-4">
                            {profile.languages?.map((lang, index) => (
                                <Card key={index} onRemove={() => removeItem('languages', index)} inline>
                                    <Input label="Language" value={lang.language || ''} onChange={(e) => updateItem('languages', index, { language: e.target.value })} placeholder="English" />
                                    <Select label="Proficiency" value={lang.proficiency || 'Professional'} onChange={(e) => updateItem('languages', index, { proficiency: e.target.value })} options={[
                                        { value: 'Native', label: 'Native' },
                                        { value: 'Fluent', label: 'Fluent' },
                                        { value: 'Professional', label: 'Professional' },
                                        { value: 'Conversational', label: 'Conversational' },
                                        { value: 'Basic', label: 'Basic' },
                                    ]} />
                                </Card>
                            ))}
                        </div>
                    </Section>

                    {/* Certifications */}
                    <Section title="Certifications & Training" onAdd={() => addItem('training_certifications')} addLabel="Add Certification">
                        {profile.training_certifications?.length === 0 && <EmptyState message="No certifications added." />}
                        {profile.training_certifications?.map((cert, index) => (
                            <Card key={index} onRemove={() => removeItem('training_certifications', index)}>
                                <div className="grid md:grid-cols-2 gap-4">
                                    <Input label="Name" value={cert.name || ''} onChange={(e) => updateItem('training_certifications', index, { name: e.target.value })} placeholder="AWS Certified" />
                                    <Input label="Issuer" value={cert.issuing_organization || ''} onChange={(e) => updateItem('training_certifications', index, { issuing_organization: e.target.value })} placeholder="Amazon" />
                                    <Input label="Date" value={cert.issue_date || ''} onChange={(e) => updateItem('training_certifications', index, { issue_date: e.target.value })} placeholder="YYYY-MM" />
                                    <Input label="URL" type="url" value={cert.url || ''} onChange={(e) => updateItem('training_certifications', index, { url: e.target.value })} placeholder="https://" />
                                </div>
                            </Card>
                        ))}
                    </Section>

                    {/* Publications */}
                    <Section title="Publications" onAdd={() => addItem('publications')} addLabel="Add Publication">
                        {profile.publications?.length === 0 && <EmptyState message="No publications added." />}
                        {profile.publications?.map((pub, index) => (
                            <Card key={index} onRemove={() => removeItem('publications', index)}>
                                <div className="grid md:grid-cols-2 gap-4">
                                    <Input label="Title" value={pub.title || ''} onChange={(e) => updateItem('publications', index, { title: e.target.value })} placeholder="Paper Title" className="md:col-span-2" />
                                    <Input label="Type" value={pub.publication_type || ''} onChange={(e) => updateItem('publications', index, { publication_type: e.target.value })} placeholder="Journal" />
                                    <Input label="Publisher" value={pub.publisher || ''} onChange={(e) => updateItem('publications', index, { publisher: e.target.value })} placeholder="Venue" />
                                    <Input label="Date" value={pub.publication_date || ''} onChange={(e) => updateItem('publications', index, { publication_date: e.target.value })} placeholder="YYYY-MM" />
                                    <Input label="DOI" value={pub.doi || ''} onChange={(e) => updateItem('publications', index, { doi: e.target.value })} placeholder="10.1000/..." />
                                </div>
                                <Textarea label="Abstract" value={pub.abstract || ''} onChange={(e) => updateItem('publications', index, { abstract: e.target.value })} rows={3} placeholder="Summary..." />
                            </Card>
                        ))}
                    </Section>

                    {/* Awards */}
                    <Section title="Awards & Honors" onAdd={() => addItem('awards_honors')} addLabel="Add Award">
                        {profile.awards_honors?.length === 0 && <EmptyState message="No awards added." />}
                        {profile.awards_honors?.map((award, index) => (
                            <Card key={index} onRemove={() => removeItem('awards_honors', index)}>
                                <div className="grid md:grid-cols-2 gap-4">
                                    <Input label="Title" value={award.title || ''} onChange={(e) => updateItem('awards_honors', index, { title: e.target.value })} placeholder="Award Name" />
                                    <Input label="Issuer" value={award.issuer || ''} onChange={(e) => updateItem('awards_honors', index, { issuer: e.target.value })} placeholder="Organization" />
                                    <Input label="Date" value={award.date || ''} onChange={(e) => updateItem('awards_honors', index, { date: e.target.value })} placeholder="YYYY-MM" />
                                </div>
                                <Textarea label="Description" value={award.description || ''} onChange={(e) => updateItem('awards_honors', index, { description: e.target.value })} rows={2} />
                            </Card>
                        ))}
                    </Section>

                    {/* Online Courses */}
                    <Section title="Online Courses" onAdd={() => addItem('online_courses')} addLabel="Add Course">
                        {profile.online_courses?.length === 0 && <EmptyState message="No courses added." />}
                        {profile.online_courses?.map((course, index) => (
                            <Card key={index} onRemove={() => removeItem('online_courses', index)}>
                                <div className="grid md:grid-cols-2 gap-4">
                                    <Input label="Course" value={course.course_name || ''} onChange={(e) => updateItem('online_courses', index, { course_name: e.target.value })} placeholder="Course Title" />
                                    <Input label="Platform" value={course.platform || ''} onChange={(e) => updateItem('online_courses', index, { platform: e.target.value })} placeholder="Coursera, Udemy" />
                                    <Input label="Date" value={course.completion_date || ''} onChange={(e) => updateItem('online_courses', index, { completion_date: e.target.value })} placeholder="YYYY-MM" />
                                    <Input label="Certificate URL" type="url" value={course.certificate_url || ''} onChange={(e) => updateItem('online_courses', index, { certificate_url: e.target.value })} placeholder="https://" />
                                </div>
                            </Card>
                        ))}
                    </Section>

                    {/* Volunteer Work */}
                    <Section title="Volunteer Work" onAdd={() => addItem('volunteer_work')} addLabel="Add Volunteer Work">
                        {profile.volunteer_work?.length === 0 && <EmptyState message="No volunteer work added." />}
                        {profile.volunteer_work?.map((vol, index) => (
                            <Card key={index} onRemove={() => removeItem('volunteer_work', index)}>
                                <div className="grid md:grid-cols-2 gap-4">
                                    <Input label="Organization" value={vol.organization || ''} onChange={(e) => updateItem('volunteer_work', index, { organization: e.target.value })} placeholder="Org Name" />
                                    <Input label="Role" value={vol.role || ''} onChange={(e) => updateItem('volunteer_work', index, { role: e.target.value })} placeholder="Volunteer" />
                                    <Input label="Start" value={vol.start_date || ''} onChange={(e) => updateItem('volunteer_work', index, { start_date: e.target.value })} placeholder="YYYY-MM" />
                                    <Input label="End" value={vol.end_date || ''} onChange={(e) => updateItem('volunteer_work', index, { end_date: e.target.value })} placeholder="Present" />
                                </div>
                                <Textarea label="Description" value={vol.description || ''} onChange={(e) => updateItem('volunteer_work', index, { description: e.target.value })} rows={2} />
                            </Card>
                        ))}
                    </Section>
                </div>
            </div>
        </div>
    );
}

// Helper Components
function Section({ title, children, onAdd, addLabel }) {
    return (
        <div className="border-t pt-6">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-800">{title}</h3>
                {onAdd && (
                    <button onClick={onAdd} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                        <Plus size={20} />
                        {addLabel || `Add ${title}`}
                    </button>
                )}
            </div>
            <div className="space-y-4">{children}</div>
        </div>
    );
}

function Input({ label, value, onChange, type = 'text', placeholder, className = '', ...props }) {
    return (
        <div className={className}>
            <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
            <input type={type} value={value || ''} onChange={onChange} placeholder={placeholder} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" {...props} />
        </div>
    );
}

function Textarea({ label, value, onChange, rows = 3, placeholder, ...props }) {
    return (
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
            <textarea value={value || ''} onChange={onChange} rows={rows} placeholder={placeholder} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" {...props} />
        </div>
    );
}

function Select({ label, value, onChange, options, ...props }) {
    return (
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
            <select value={value} onChange={onChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" {...props}>
                {options.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
            </select>
        </div>
    );
}

function Card({ children, onRemove, inline = false }) {
    return (
        <div className={`border border-gray-200 rounded-lg p-4 ${inline ? '' : 'bg-gray-50'}`}>
            <div className="flex justify-end mb-2">
                <button onClick={onRemove} className="text-red-600 hover:text-red-800 p-1" title="Remove">
                    <X size={20} />
                </button>
            </div>
            <div className="space-y-4">{children}</div>
        </div>
    );
}

function EmptyState({ message }) {
    return (
        <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
            <AlertCircle className="mx-auto text-gray-400 mb-2" size={32} />
            <p className="text-gray-600">{message}</p>
        </div>
    );
}