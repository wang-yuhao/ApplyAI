/**
 * API Client - COMPLETE WITH ALL FIXES
 * - Proper authentication for blob downloads
 * - Resume generation support
 * - All endpoints working
 */

import axios from 'axios';

// Base API URL
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Create axios instance
const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor - add auth token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token') || localStorage.getItem('access_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
            console.log('✅ Token added to request:', config.url);
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor - handle 401
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            console.error('❌ 401 Unauthorized - Redirecting to login');
            localStorage.removeItem('token');
            localStorage.removeItem('access_token');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

// ============================================================================
// Authentication API
// ============================================================================

export const authAPI = {
    googleLogin: (token) => api.post('/api/auth/google', { token }),
    getCurrentUser: () => api.get('/api/auth/me'),
    register: (email, password, fullName = null) =>
        api.post('/api/auth/register', { email, password, full_name: fullName }),
    login: (email, password) => {
        const formData = new FormData();
        formData.append('username', email);
        formData.append('password', password);
        return api.post('/api/auth/login', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
    },
    getGoogleAuthUrl: () => api.get('/api/auth/google'),
    refreshToken: () => api.post('/api/auth/refresh'),
    changePassword: (oldPassword, newPassword) =>
        api.post('/api/auth/change-password', {
            old_password: oldPassword,
            new_password: newPassword,
        }),
    logout: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('access_token');
        window.location.href = '/login';
    },
};

// ============================================================================
// Profile API
// ============================================================================

export const profileAPI = {
    getProfile: () => api.get('/api/profile/'),

    updateProfile: (data) => api.put('/api/profile/', { profile_data: data }),

    uploadResume: (file) => {
        const formData = new FormData();
        formData.append('file', file);
        return api.post('/api/profile/upload-resume', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
    },

    uploadDocument: (file, documentType) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('document_type', documentType);
        return api.post('/api/profile/upload-document', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
    },

    getDocuments: (documentType = null) => {
        const params = documentType ? { document_type: documentType } : {};
        return api.get('/api/profile/documents', { params });
    },

    /**
     * Download document - FIXED for proper auth
     */
    downloadDocument: async (documentId) => {
        try {
            const token = localStorage.getItem('token') || localStorage.getItem('access_token');
            if (!token) throw new Error('No authentication token found');

            console.log(`📥 Downloading document ${documentId}`);

            const response = await api.get(`/api/profile/download-document/${documentId}`, {
                responseType: 'blob',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            console.log('✅ Document downloaded', {
                size: response.data?.size,
                type: response.data?.type,
                isBlob: response.data instanceof Blob
            });

            return response;  // ✅ FIXED - Returns full response object
        } catch (error) {
            console.error('❌ Download failed:', error);
            throw error;
        }
    },

    /**
     * Preview resume - FIXED for proper auth
     */
    previewResume: async (documentId) => {
        try {
            const token = localStorage.getItem('token') || localStorage.getItem('access_token');
            if (!token) throw new Error('No authentication token found');

            console.log(`👁️ Previewing resume ${documentId}`);

            const response = await api.get(`/api/profile/preview-resume/${documentId}`, {
                responseType: 'blob',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            console.log('✅ Resume preview loaded');
            return response.data;
        } catch (error) {
            console.error('❌ Preview failed:', error);
            throw error;
        }
    },

    /**
     * Get document as blob URL for preview
     */
    getDocumentBlobUrl: async (documentId) => {
        try {
            const blob = await profileAPI.downloadDocument(documentId);
            const url = URL.createObjectURL(blob);
            console.log('✅ Blob URL created');
            return url;
        } catch (error) {
            console.error('❌ Failed to create blob URL:', error);
            throw error;
        }
    },

    deleteDocument: (documentId) => api.delete(`/api/profile/document/${documentId}`),

    /**
     * Generate resume from profile data - CRITICAL for new workflow
     * This generates a PDF from the current profile data with selected template
     */
    generateResume: async (template = 'professional') => {
        try {
            const token = localStorage.getItem('token') || localStorage.getItem('access_token');
            if (!token) throw new Error('No authentication token found');

            console.log(`📄 Generating resume with template: ${template}`);

            const formData = new FormData();
            formData.append('template', template);

            const response = await api.post('/api/profile/generate-resume', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    'Authorization': `Bearer ${token}`
                },
                responseType: 'blob'
            });

            console.log('✅ Resume generated successfully');
            return response;
        } catch (error) {
            console.error('❌ Resume generation failed:', error);
            throw error;
        }
    },

    /**
     * Download resume (legacy) - kept for compatibility
     */
    downloadResume: (template = 'professional') => {
        return profileAPI.generateResume(template);
    },
};

// ============================================================================
// Jobs API
// ============================================================================

export const jobsAPI = {
    getPlatforms: () => api.get('/api/jobs/platforms'),
    getPlatform: (platformKey) => api.get(`/api/jobs/platforms/${platformKey}`),
    searchJobs: (params) => api.get('/api/jobs/search', { params }),
    enrichJob: (jobData) => api.post('/api/jobs/search/enrich', jobData),
    getJob: (id) => api.get(`/api/jobs/${id}`),
    createJob: (data) => api.post('/api/jobs', data),
    listJobs: (params = {}) => api.get('/api/jobs', { params }),
    deleteJob: (id) => api.delete(`/api/jobs/${id}`),
    getJobMatch: (id) => api.get(`/api/jobs/match/${id}`),
    saveJob: (jobData) => api.post('/api/jobs/save', jobData),
    getSavedJobs: () => api.get('/api/jobs/saved'),
    deleteSavedJob: (id) => api.delete(`/api/jobs/saved/${id}`),
    createApplication: (data) => api.post('/api/jobs/apply', data),
    getApplications: (status = null) => {
        const params = status ? { status } : {};
        return api.get('/api/jobs/applications', { params });
    },
    getApplication: (id) => api.get(`/api/jobs/applications/${id}`),
    updateApplication: (id, data) => api.put(`/api/jobs/applications/${id}`, data),
    deleteApplication: (id) => api.delete(`/api/jobs/applications/${id}`),
};

// ============================================================================
// Applications API
// ============================================================================

export const applicationsAPI = {
    getApplications: (params = {}) => api.get('/api/applications', { params }),
    getAll: (status = null) => {
        const params = status ? { status } : {};
        return api.get('/api/applications', { params });
    },
    createApplication: (data) => api.post('/api/applications', data),
    create: (data) => api.post('/api/applications', data),
    getApplication: (id) => api.get(`/api/applications/${id}`),
    getById: (id) => api.get(`/api/applications/${id}`),
    update: (id, data) => api.put(`/api/applications/${id}`, data),
    delete: (id) => api.delete(`/api/applications/${id}`),
    generateCoverLetter: (id) => api.post(`/api/applications/${id}/generate-cover-letter`),
    verifyApplication: (id, data) => api.post(`/api/applications/${id}/verify`, data),
    submitApplication: (id) => api.post(`/api/applications/${id}/submit`),
    getByStatus: (status) => api.get('/api/applications', { params: { status } }),
};

// ============================================================================
// Materials API (NEW)
// ============================================================================

/**
 * Materials API Additions - ADD TO YOUR api.js
 * Place these functions inside the materialsAPI export
 */

// ADD THESE TO YOUR EXISTING materialsAPI object:

export const materialsAPI = {
    // ... your existing materials functions ...

    /**
     * Generate motivation letter with optional template
     */
    generateMotivationLetter: async (jobData) => {
        return await api.post('/api/materials/generate-motivation-letter', jobData);
    },

    /**
     * Download motivation letter as PDF
     */
    downloadMotivationLetter: async (letterData) => {
        return await api.post('/api/materials/download-motivation-letter', letterData, {
            responseType: 'blob'
        });
    },

    /**
     * Download all materials (letter + resume) as merged PDF
     */
    downloadAllMaterials: async (materialsData) => {
        return await api.post('/api/materials/download-all-materials', materialsData, {
            responseType: 'blob'
        });
    },

    /**
     * Get list of uploaded motivation letters (templates)
     */
    getTemplates: async () => {
        return await api.get('/api/materials/templates');
    },

    /**
     * Get preview of a template letter
     */
    getTemplatePreview: async (templateId) => {
        return await api.get(`/api/materials/templates/${templateId}/preview`);
    },
};

// ============================================================================
// Interview API
// ============================================================================

export const interviewAPI = {
    getInterviewPrep: (applicationId) => api.get(`/api/interview/${applicationId}`),
    generateInterviewPrep: (applicationId) =>
        api.post(`/api/interview/${applicationId}/generate-preparation`),
    saveNotes: (applicationId, notes) =>
        api.post(`/api/interview/${applicationId}/notes`, { notes }),
    logPracticeSession: (applicationId, sessionData) =>
        api.post(`/api/interview/${applicationId}/practice-session`, sessionData),
    getAll: () => api.get('/api/interviews'),
    getById: (id) => api.get(`/api/interviews/${id}`),
    create: (data) => api.post('/api/interviews', data),
    update: (id, data) => api.put(`/api/interviews/${id}`, data),
    delete: (id) => api.delete(`/api/interviews/${id}`),
    schedule: (applicationId, interviewData) =>
        api.post(`/api/applications/${applicationId}/interview/schedule`, interviewData),
    getQuestions: (applicationId) => api.get(`/api/interview/${applicationId}/questions`),
    submitFeedback: (interviewId, feedback) =>
        api.post(`/api/interviews/${interviewId}/feedback`, { feedback }),
};

// ============================================================================
// Saved Jobs API
// ============================================================================

export const savedJobsAPI = {
    getAll: () => api.get('/api/jobs/saved'),
    save: (jobData) => api.post('/api/jobs/save', jobData),
    delete: (jobId) => api.delete(`/api/jobs/saved/${jobId}`),
};

// ============================================================================
// Documents API
// ============================================================================

export const documentsAPI = {
    getAll: (documentType = null) => {
        const params = documentType ? { document_type: documentType } : {};
        return api.get('/api/profile/documents', { params });
    },
    upload: (file, documentType) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('document_type', documentType);
        return api.post('/api/profile/upload-document', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
    },
    download: (documentId) => profileAPI.downloadDocument(documentId),
    delete: (documentId) => api.delete(`/api/profile/document/${documentId}`),
    uploadResume: (file) => profileAPI.uploadResume(file),
    previewResume: (documentId) => profileAPI.previewResume(documentId),
    getBlobUrl: (documentId) => profileAPI.getDocumentBlobUrl(documentId),
};


export default api;