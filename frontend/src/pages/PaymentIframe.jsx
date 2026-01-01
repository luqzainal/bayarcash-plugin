import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useSearchParams } from 'react-router-dom';

const PaymentIframe = () => {
    const [searchParams] = useSearchParams();
    const [status, setStatus] = useState('initializing');
    const [error, setError] = useState('');
    const [paymentData, setPaymentData] = useState(null);
    const [debugLogs, setDebugLogs] = useState([]);

    const addLog = (msg) => {
        const time = new Date().toLocaleTimeString();
        setDebugLogs(prev => [`[${time}] ${msg}`, ...prev]);
        console.log(`[${time}] ${msg}`);
    };

    useEffect(() => {
        addLog('🚀 Iframe loaded, initializing listener...');

        // --- 1. SETUP LISTENER DULU ---
        const handleMessage = async (event) => {
            // Log raw event
            // addLog(`📥 Event from: ${event.origin}`);

            let data = event.data;

            // GHL hantar String, kita perlu parse
            if (typeof data === 'string') {
                try {
                    data = JSON.parse(data);
                } catch (e) {
                    // Ignore non-JSON messages (noise)
                    return;
                }
            }

            // Debugging
            if (data?.type) {
                addLog(`📥 Msg: ${data.type}`);
            }

            // --- 2. TANGKAP DATA PAYMENT ---
            if (data && data.type === 'payment_initiate_props') {
                addLog('✅ Handshake Received!');

                const { amount, currency, orderId, locationId, contact, metadata, publishableKey } = data;
                addLog(`💰 Amount: ${amount} ${currency}`);
                addLog(`🔑 Key: ${publishableKey?.substring(0, 10)}...`);

                // Detect mode from GHL publishableKey (default to 'live' if not detected)
                const isTestMode = publishableKey &&
                    (publishableKey.toLowerCase().includes('test') ||
                        publishableKey.toLowerCase().includes('sandbox'));

                // Default to 'live' mode if not explicitly test
                const paymentMode = isTestMode ? 'test' : 'live';
                addLog(`🎯 Mode directly detected: ${paymentMode}`);

                // Set state
                setPaymentData(data);
                setStatus('processing');

                // Call backend
                try {
                    addLog('📤 Calling backend /process-payment...');
                    const response = await axios.post('/api/process-payment', {
                        locationId: locationId || data.location?.id,
                        amount: amount || data.amount,
                        currency: currency || 'MYR',
                        orderId: orderId || data.order_id,
                        customer_name: contact?.name || 'Customer',
                        customer_email: contact?.email || 'customer@example.com',
                        metadata: metadata,
                        mode: paymentMode
                    });

                    addLog('✅ Backend Responded');

                    if (response.data.paymentUrl) {
                        // Store URL in paymentData for user to click
                        setPaymentData(prev => ({ ...prev, paymentUrl: response.data.paymentUrl }));
                        setStatus('ready_to_pay');
                        addLog('🔗 Payment URL Ready!');
                    } else {
                        throw new Error('No payment URL returned');
                    }
                } catch (err) {
                    addLog(`❌ Error: ${err.message}`);
                    setError(err.response?.data?.error || err.message || 'Failed to initiate payment');
                    setStatus('error');

                    // Hantar error balik ke GHL
                    const errorMsg = JSON.stringify({
                        type: 'custom_element_error_response',
                        error: { description: err.message }
                    });
                    window.parent.postMessage(errorMsg, '*');
                }
            }
        };

        window.addEventListener('message', handleMessage);

        // --- 3. HANTAR SIGNAL "SAYA DAH READY" ---
        const readyEventMessage = JSON.stringify({
            type: 'custom_provider_ready',
            loaded: true
        });

        addLog('🚀 Sending custom_provider_ready...');
        window.parent.postMessage(readyEventMessage, '*');

        setStatus('waiting_for_payment_data');

        return () => {
            window.removeEventListener('message', handleMessage);
        };
    }, []);

    // ... (rest of component) ...

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
            {/* ... existing UI ... */}
            <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full text-center">
                {/* ... existing status blocks ... */}

                {status === 'initializing' && (
                    <>
                        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <h2 className="text-xl font-semibold text-slate-800">Initializing...</h2>
                    </>
                )}

                {status === 'waiting_for_payment_data' && (
                    <>
                        <div className="animate-pulse rounded-full h-16 w-16 bg-blue-100 mx-auto mb-4 flex items-center justify-center">
                            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <h2 className="text-xl font-semibold text-slate-800">Waiting for Payment...</h2>
                        <p className="text-slate-500 mt-2">Connecting to system...</p>
                    </>
                )}

                {/* ... other status blocks ... */}

                {/* DEBUG LOGS */}
                <div className="mt-8 pt-4 border-t border-slate-200 text-left">
                    <button
                        onClick={() => document.getElementById('debug-logs').classList.toggle('hidden')}
                        className="text-xs text-slate-400 hover:text-slate-600 underline mb-2"
                    >
                        Toggle Debug Logs
                    </button>
                    <div id="debug-logs" className="hidden">
                        <p className="text-xs font-mono text-slate-500 mb-1">Origin: {window.location.origin}</p>
                        <ul className="text-[10px] font-mono text-slate-400 space-y-1 max-h-32 overflow-y-auto bg-slate-50 p-2 rounded">
                            {debugLogs.map((log, i) => (
                                <li key={i}>{log}</li>
                            ))}
                            {debugLogs.length === 0 && <li>Waiting for events...</li>}
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PaymentIframe;
