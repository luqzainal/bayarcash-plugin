import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const Settings = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const locationId = searchParams.get('location_id') || searchParams.get('locationId');
    const status = searchParams.get('status');

    const [activeTab, setActiveTab] = useState('live');
    const [formData, setFormData] = useState({
        bayarcash_pat_live: '',
        bayarcash_api_key_live: '',
        bayarcash_portal_key_live: '',
        bayarcash_pat_test: '',
        bayarcash_api_key_test: '',
        bayarcash_portal_key_test: ''
    });

    const [loading, setLoading] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [error, setError] = useState('');
    const [showSuccessAlert, setShowSuccessAlert] = useState(status === 'success');

    // Load existing settings
    useEffect(() => {
        if (locationId) {
            loadSettings();
        }
    }, [locationId]);

    // Auto-hide success alert after 5 seconds
    useEffect(() => {
        if (showSuccessAlert) {
            const timer = setTimeout(() => {
                setShowSuccessAlert(false);
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [showSuccessAlert]);

    const loadSettings = async () => {
        try {
            const response = await axios.get(`/api/settings/${locationId}`);
            setFormData({
                bayarcash_pat_live: response.data.bayarcash_pat_live || '',
                bayarcash_api_key_live: response.data.bayarcash_api_key_live || '',
                bayarcash_portal_key_live: response.data.bayarcash_portal_key_live || '',
                bayarcash_pat_test: response.data.bayarcash_pat_test || '',
                bayarcash_api_key_test: response.data.bayarcash_api_key_test || '',
                bayarcash_portal_key_test: response.data.bayarcash_portal_key_test || ''
            });
        } catch (err) {
            console.log('No existing settings found');
        }
    };

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSaveSuccess(false);

        try {
            await axios.post('/api/settings', {
                location_id: locationId,
                ...formData
            });

            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        } catch (err) {
            console.error('Save error:', err);
            const errorMessage = err.response?.data?.error || err.message || 'Failed to save settings';
            setError(`Error: ${errorMessage}`);
        } finally {
            setLoading(false);
        }
    };

    if (!locationId) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <div className="card max-w-md text-center">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold mb-2">Missing Location ID</h2>
                    <p className="text-slate-600 mb-6">Please complete the OAuth flow first</p>

                    {/* Debug Info */}
                    <div className="mb-6 p-3 bg-slate-100 rounded text-xs font-mono text-left break-all">
                        <p className="font-bold text-slate-500 mb-1">Debug Info:</p>
                        <p>Params: {searchParams.toString() || 'None'}</p>
                        <p>URL: {window.location.href}</p>
                    </div>

                    {/* Manual Entry Fallback */}
                    <div className="mb-6 border-t border-slate-200 pt-4">
                        <p className="text-sm text-slate-600 mb-2">Or manually enter Location ID:</p>
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                const manualId = e.target.elements.manualLocationId.value.trim();
                                if (manualId) {
                                    window.location.href = `/settings?locationId=${manualId}`;
                                }
                            }}
                            className="flex gap-2"
                        >
                            <input
                                name="manualLocationId"
                                type="text"
                                placeholder="e.g. 0b1pGi..."
                                className="input-field text-sm"
                                required
                            />
                            <button type="submit" className="btn-primary py-2 px-4 text-sm">
                                Go
                            </button>
                        </form>
                    </div>

                    <button onClick={() => navigate('/')} className="btn-secondary text-sm">
                        Back to Home
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-4 py-12">
            <div className="max-w-3xl mx-auto">
                {/* Success Alert */}
                {showSuccessAlert && (
                    <div className="alert-success mb-6 flex items-start gap-3">
                        <svg className="w-6 h-6 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <div className="flex-1">
                            <h3 className="font-semibold text-lg">Integration Successful!</h3>
                            <p className="text-emerald-700 mt-1">
                                Connected as Location ID: <span className="font-mono font-semibold">{locationId}</span>
                            </p>
                        </div>
                        <button
                            onClick={() => setShowSuccessAlert(false)}
                            className="text-emerald-600 hover:text-emerald-800"
                        >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                        </button>
                    </div>
                )}

                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                        BayarCash Configuration
                    </h1>
                    <p className="text-slate-600">
                        Configure your BayarCash payment settings for this location
                    </p>
                </div>

                {/* Configuration Form */}
                <div className="card">
                    {/* Tabs */}
                    <div className="flex border-b border-slate-200 mb-6">
                        <button
                            className={`flex-1 py-3 px-4 text-center font-semibold text-sm transition-colors ${activeTab === 'live'
                                ? 'text-blue-600 border-b-2 border-blue-600'
                                : 'text-slate-500 hover:text-slate-700'
                                }`}
                            onClick={() => setActiveTab('live')}
                        >
                            Live Mode
                        </button>
                        <button
                            className={`flex-1 py-3 px-4 text-center font-semibold text-sm transition-colors ${activeTab === 'test'
                                ? 'text-blue-600 border-b-2 border-blue-600'
                                : 'text-slate-500 hover:text-slate-700'
                                }`}
                            onClick={() => setActiveTab('test')}
                        >
                            Test Mode
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Location ID Display */}
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                                Location ID
                            </label>
                            <div className="px-4 py-3 bg-slate-100 rounded-lg border border-slate-200">
                                <code className="text-sm font-mono text-slate-800">{locationId}</code>
                            </div>
                        </div>

                        {activeTab === 'live' ? (
                            <>
                                {/* Live PAT */}
                                <div>
                                    <label htmlFor="bayarcash_pat_live" className="block text-sm font-semibold text-slate-700 mb-2">
                                        Personal Access Token (PAT) <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        id="bayarcash_pat_live"
                                        name="bayarcash_pat_live"
                                        value={formData.bayarcash_pat_live}
                                        onChange={handleChange}
                                        placeholder="e.g., eyJhbGciOi..."
                                        className="input-field font-mono text-sm"
                                        required
                                    />
                                    <p className="text-xs text-slate-500 mt-1">
                                        Your Live BayarCash Personal Access Token (for Authorization header)
                                    </p>
                                </div>

                                {/* Live API Secret Key */}
                                <div>
                                    <label htmlFor="bayarcash_api_key_live" className="block text-sm font-semibold text-slate-700 mb-2">
                                        API Secret Key <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        id="bayarcash_api_key_live"
                                        name="bayarcash_api_key_live"
                                        value={formData.bayarcash_api_key_live}
                                        onChange={handleChange}
                                        placeholder="e.g., BLZAjCx7yg4v..."
                                        className="input-field font-mono text-sm"
                                        required
                                    />
                                    <p className="text-xs text-slate-500 mt-1">
                                        Your Live BayarCash API Secret Key (BayarCash requirement)
                                    </p>
                                </div>

                                {/* Live Portal Key */}
                                <div>
                                    <label htmlFor="bayarcash_portal_key_live" className="block text-sm font-semibold text-slate-700 mb-2">
                                        Portal Key <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        id="bayarcash_portal_key_live"
                                        name="bayarcash_portal_key_live"
                                        value={formData.bayarcash_portal_key_live}
                                        onChange={handleChange}
                                        placeholder="e.g., ynjxee7dH6..."
                                        className="input-field font-mono text-sm"
                                        required
                                    />
                                    <p className="text-xs text-slate-500 mt-1">
                                        Your Live BayarCash Portal Key (retrieve from console)
                                    </p>
                                </div>
                            </>
                        ) : (
                            <>
                                {/* Test PAT */}
                                <div>
                                    <label htmlFor="bayarcash_pat_test" className="block text-sm font-semibold text-slate-700 mb-2">
                                        Test Personal Access Token (PAT) <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        id="bayarcash_pat_test"
                                        name="bayarcash_pat_test"
                                        value={formData.bayarcash_pat_test}
                                        onChange={handleChange}
                                        placeholder="e.g., eyJhbGciOi..."
                                        className="input-field font-mono text-sm"
                                        required
                                    />
                                    <p className="text-xs text-slate-500 mt-1">
                                        Your Test BayarCash Personal Access Token (for Authorization header)
                                    </p>
                                </div>

                                {/* Test API Secret Key */}
                                <div>
                                    <label htmlFor="bayarcash_api_key_test" className="block text-sm font-semibold text-slate-700 mb-2">
                                        Test API Secret Key <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        id="bayarcash_api_key_test"
                                        name="bayarcash_api_key_test"
                                        value={formData.bayarcash_api_key_test}
                                        onChange={handleChange}
                                        placeholder="e.g., BLZAjCx7yg4v..."
                                        className="input-field font-mono text-sm"
                                        required
                                    />
                                    <p className="text-xs text-slate-500 mt-1">
                                        Your Test BayarCash API Secret Key (BayarCash requirement)
                                    </p>
                                </div>

                                {/* Test Portal Key */}
                                <div>
                                    <label htmlFor="bayarcash_portal_key_test" className="block text-sm font-semibold text-slate-700 mb-2">
                                        Test Portal Key <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        id="bayarcash_portal_key_test"
                                        name="bayarcash_portal_key_test"
                                        value={formData.bayarcash_portal_key_test}
                                        onChange={handleChange}
                                        placeholder="e.g., test_ynjxee..."
                                        className="input-field font-mono text-sm"
                                        required
                                    />
                                    <p className="text-xs text-slate-500 mt-1">
                                        Your Test BayarCash Portal Key (retrieve from console)
                                    </p>
                                </div>
                            </>
                        )}

                        {/* Error Message */}
                        {error && (
                            <div className="alert-error flex items-center gap-2">
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                                <span>{error}</span>
                            </div>
                        )}

                        {/* Success Message */}
                        {saveSuccess && (
                            <div className="alert-success flex items-center gap-2">
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                <span>Settings saved successfully!</span>
                            </div>
                        )}

                        {/* Submit Button */}
                        <div className="flex gap-4">
                            <button
                                type="submit"
                                disabled={loading}
                                className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Saving...
                                    </span>
                                ) : (
                                    'Save Configuration'
                                )}
                            </button>

                            <button
                                type="button"
                                onClick={() => navigate('/')}
                                className="btn-secondary"
                            >
                                Back to Home
                            </button>
                        </div>
                    </form>
                </div>

                {/* Help Section */}
                <div className="mt-8 p-6 bg-blue-50 border border-blue-200 rounded-xl">
                    <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        Need Help?
                    </h3>
                    <p className="text-sm text-blue-800">
                        Visit the <a href="https://console.bayarcash-sandbox.com" target="_blank" rel="noopener noreferrer" className="underline font-semibold hover:text-blue-600">BayarCash Console</a> to get your Integration Keys.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Settings;
