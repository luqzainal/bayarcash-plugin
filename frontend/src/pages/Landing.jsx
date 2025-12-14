import React from 'react';

const Landing = () => {
    const handleLogin = () => {
        // Redirect to GHL OAuth URL with payment scopes
        const clientId = '68d3da9b07280c17384ef694-mipy8sp0';
        const redirectUri = encodeURIComponent('http://localhost:3000/oauth/callback');
        const scope = encodeURIComponent('payments/orders.readonly payments/orders.write payments/subscriptions.readonly payments/transactions.readonly payments/custom-provider.readonly payments/custom-provider.write products.readonly products/prices.readonly oauth.readonly');
        const versionId = '68d3da9b07280c17384ef694';

        const oauthUrl = `https://marketplace.gohighlevel.com/oauth/chooselocation?response_type=code&redirect_uri=${redirectUri}&client_id=${clientId}&scope=${scope}&version_id=${versionId}`;

        window.location.href = oauthUrl;
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="max-w-4xl w-full animate-fade-in">
                {/* Hero Section */}
                <div className="text-center mb-12">
                    <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
                        Accept Payments with
                        <span className="block bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                            BayarCash
                        </span>
                    </h1>

                    <p className="text-xl text-slate-600 mb-8 max-w-2xl mx-auto">
                        Seamlessly integrate BayarCash payment gateway with your GoHighLevel account.
                        Accept FPX, credit cards, and e-wallet payments from Malaysian customers.
                    </p>
                </div>

                {/* Features Grid */}
                <div className="grid md:grid-cols-3 gap-6 mb-12">
                    <div className="card text-center hover:scale-105 transition-transform duration-300">
                        <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-green-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-semibold mb-2">Instant Setup</h3>
                        <p className="text-slate-600">
                            Connect your BayarCash account in seconds
                        </p>
                    </div>

                    <div className="card text-center hover:scale-105 transition-transform duration-300">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-semibold mb-2">Secure Payments</h3>
                        <p className="text-slate-600">
                            Bank-level security for all transactions
                        </p>
                    </div>

                    <div className="card text-center hover:scale-105 transition-transform duration-300">
                        <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-semibold mb-2">Multiple Payment Methods</h3>
                        <p className="text-slate-600">
                            Support FPX Online Banking, Credit/Debit Cards, and popular e-wallets via BayarCash
                        </p>
                    </div>
                </div>

                {/* CTA Section */}
                <div className="card text-center">
                    <h2 className="text-2xl font-bold mb-4">Ready to Get Started?</h2>
                    <p className="text-slate-600 mb-6">
                        Connect your GoHighLevel account to begin accepting payments with BayarCash
                    </p>

                    <button
                        onClick={handleLogin}
                        className="btn-primary inline-flex items-center gap-2 text-lg"
                    >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Install BayarCash Integration
                    </button>

                    <p className="text-sm text-slate-500 mt-4">
                        By connecting, you agree to our Terms of Service and Privacy Policy
                    </p>
                </div>

                {/* Footer */}
                <div className="text-center mt-8 text-slate-400 text-sm">
                    <p>Powered by BayarCash × GoHighLevel</p>
                </div>
            </div>
        </div>
    );
};

export default Landing;
