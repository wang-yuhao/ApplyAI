import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Loader, FileText, Download } from 'lucide-react';
import { jobsAPI, applicationsAPI } from '../services/api';

export default function JobDetail() {
    const { jobId } = useParams();
    const [job, setJob] = useState(null);
    const [matchAnalysis, setMatchAnalysis] = useState(null);
    const [coverLetter, setCoverLetter] = useState('');
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);

    useEffect(() => {
        loadJobDetails();
    }, [jobId]);

    const loadJobDetails = async () => {
        try {
            const { data } = await jobsAPI.getJobDetails(jobId);
            setJob(data.job);
            setMatchAnalysis(data.match_analysis);
        } catch (error) {
            console.error('Failed to load job:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateCoverLetter = async () => {
        setGenerating(true);
        try {
            const appResponse = await applicationsAPI.createApplication(parseInt(jobId));
            const { data } = await applicationsAPI.generateCoverLetter(appResponse.data.id);
            setCoverLetter(data.cover_letter);
        } catch (error) {
            console.error('Failed to generate cover letter:', error);
            alert('Failed to generate cover letter');
        } finally {
            setGenerating(false);
        }
    };

    if (loading) return <div className="flex justify-center"><Loader className="animate-spin" size={48} /></div>;

    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow">
                <h1 className="text-3xl font-bold text-gray-800">{job.job_title}</h1>
                <p className="text-xl text-gray-600 mt-2">{job.company_name}</p>
                <p className="text-gray-500 mt-1">{job.company_location}</p>
            </div>

            {matchAnalysis && (
                <div className="bg-white p-6 rounded-lg shadow">
                    <h2 className="text-2xl font-semibold mb-4">Match Analysis</h2>
                    <div className="text-3xl font-bold text-blue-600 mb-4">
                        {Math.round(matchAnalysis.match_rate)}% Match
                    </div>
                    <div className="grid md:grid-cols-2 gap-6">
                        <div>
                            <h3 className="font-semibold text-green-600 mb-2">Strengths</h3>
                            <ul className="list-disc list-inside space-y-1">
                                {matchAnalysis.pros?.map((pro, i) => <li key={i}>{pro}</li>)}
                            </ul>
                        </div>
                        <div>
                            <h3 className="font-semibold text-red-600 mb-2">Areas to Address</h3>
                            <ul className="list-disc list-inside space-y-1">
                                {matchAnalysis.cons?.map((con, i) => <li key={i}>{con}</li>)}
                            </ul>
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-2xl font-semibold mb-4">Cover Letter</h2>
                {!coverLetter ? (
                    <button
                        onClick={handleGenerateCoverLetter}
                        disabled={generating}
                        className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
                    >
                        {generating ? 'Generating...' : 'Generate Cover Letter'}
                    </button>
                ) : (
                    <div>
                        <textarea
                            value={coverLetter}
                            onChange={(e) => setCoverLetter(e.target.value)}
                            rows={15}
                            className="w-full p-4 border rounded-lg"
                        />
                        <div className="flex gap-4 mt-4">
                            <button className="px-6 py-2 bg-blue-500 text-white rounded-lg">
                                Verify & Continue
                            </button>
                            <button className="px-6 py-2 border rounded-lg">
                                <Download size={20} className="inline mr-2" />
                                Download
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}