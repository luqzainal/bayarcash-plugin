import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { useSearchParams } from 'react-router-dom';

// Helper to parse GHL data safely
const parsePaymentData = (eventData) => {
    if (typeof eventData === 'string') {
        try {
            return JSON.parse(eventData);
        } catch (e) {
            return null;
        }
    }
    return eventData;
};

// Success component with auto-close countdown
const SuccessWithAutoClose = () => {
    const [countdown, setCountdown] = useState(5);
    const [canClose, setCanClose] = useState(true);

    useEffect(() => {
        // Countdown timer
        const timer = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    // Try to close the window/tab
                    try {
                        window.close();
                        // If window.close didn't work (browser restriction), show message
                        setTimeout(() => setCanClose(false), 500);
                    } catch (e) {
                        setCanClose(false);
                    }
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    return (
        <>
            <div className="rounded-full h-16 w-16 bg-green-100 mx-auto mb-4 flex items-center justify-center">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
            </div>
            <h2 className="text-xl font-semibold text-green-800">Payment Successful!</h2>
            <p className="text-slate-500 mt-2">Your payment has been processed</p>

            {countdown > 0 ? (
                <p className="text-sm text-slate-400 mt-4">
                    This window will close in <span className="font-bold text-green-600">{countdown}</span> seconds...
                </p>
            ) : canClose ? (
                <p className="text-sm text-slate-400 mt-4">Closing...</p>
            ) : (
                <div className="mt-4">
                    <p className="text-sm text-slate-500 mb-3">You can now close this tab</p>
                    <button
                        onClick={() => window.close()}
                        className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                        Close Tab
                    </button>
                </div>
            )}
        </>
    );
};

// Error component with auto-close countdown
const ErrorWithAutoClose = ({ message }) => {
    const [countdown, setCountdown] = useState(5); // Reduced to 5s as requested
    const [canClose, setCanClose] = useState(true);

    useEffect(() => {
        // Countdown timer
        const timer = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    try {
                        window.close();
                        setTimeout(() => setCanClose(false), 500);
                    } catch (e) {
                        setCanClose(false);
                    }
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    return (
        <>
            <div className="rounded-full h-16 w-16 bg-red-100 mx-auto mb-4 flex items-center justify-center">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </div>
            <h2 className="text-xl font-semibold text-red-800">Payment Failed</h2>
            <p className="text-red-500 mt-2">{message}</p>

            {countdown > 0 ? (
                <p className="text-sm text-slate-400 mt-4">
                    This window will close in <span className="font-bold text-red-600">{countdown}</span> seconds...
                </p>
            ) : canClose ? (
                <p className="text-sm text-slate-400 mt-4">Closing...</p>
            ) : (
                <div className="mt-4">
                    <p className="text-sm text-slate-500 mb-3">You can close this tab now</p>
                    <button
                        onClick={() => window.close()}
                        className="px-6 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
                    >
                        Close Tab
                    </button>
                </div>
            )}
        </>
    );
};

const PaymentIframe = () => {
    const [searchParams] = useSearchParams();
    const [status, setStatus] = useState('loading'); // loading, processing, ready_to_pay, redirecting, success, error, waiting_for_payment_data
    const [error, setError] = useState('');
    const [paymentData, setPaymentData] = useState(null);
    const processingRef = useRef(false); // Ref to prevent double processing

    // Listen for messages from GHL
    useEffect(() => {
        // Track the interval ID so we can clear it from inside handleMessage
        const intervalRef = { current: null };

        const handleMessage = async (event) => {
            // Validate origin (optional but recommended)
            // if (event.origin !== "https://msgsndr.com") return;

            console.log('📩 Message received from parent:', event.data);

            // Parse data
            const data = parsePaymentData(event.data);

            // Validasi: Pastikan data itu dari GHL (biasanya ada type 'payment_initiate_props')
            // Atau jika object dengan properti locationId/amount (untuk payment link)
            if (data && (data.type === 'payment_initiate_props' || data.amount)) {

                console.log('🔍 FULL DATA RECEIVED:', JSON.stringify(data, null, 2)); // Debugging log

                // STOP THE LOOP IMMEDIATELY when we get valid data
                if (intervalRef.current) {
                    clearInterval(intervalRef.current);
                    intervalRef.current = null;
                }

                // Prevent duplicate processing
                if (processingRef.current) {
                    console.log('⚠️ Already processing payment, ignoring duplicate message.');
                    return;
                }

                // Double check status state just in case
                if (status === 'ready_to_pay' || status === 'success' || status === 'processing') return;

                processingRef.current = true; // LOCK
                console.log('✅ Valid Payment Data detected:', data);

                setPaymentData(data);
                setStatus('processing');

                // Extract vars
                const { amount, currency, orderId, locationId, contact, metadata, publishableKey } = data;

                // Detect mode
                const isTestMode = publishableKey &&
                    (publishableKey.toLowerCase().includes('test') ||
                        publishableKey.toLowerCase().includes('sandbox'));
                const paymentMode = isTestMode ? 'test' : 'live';

                console.log('🔑 Publishable Key:', publishableKey);
                console.log('🎯 Payment Mode:', paymentMode, isTestMode ? '(detected as test)' : '(defaulting to live)');

                // Call backend
                try {
                    console.log('📤 Calling backend /api/process-payment...');
                    const response = await axios.post('/api/process-payment', {
                        // Add fallbacks for different data structures (Payment Link vs Invoice)
                        locationId: locationId || data.location?.id || data.locationId,
                        amount: amount || data.amount || 0,
                        currency: currency || 'MYR',
                        orderId: orderId || data.order_id,
                        customer_name: contact?.name || 'Customer',
                        customer_email: contact?.email || 'customer@example.com',
                        metadata: metadata,
                        mode: paymentMode,
                        publishableKey: publishableKey // Send key to help backend detect mode
                    });

                    console.log('✅ Payment intent created:', response.data);

                    if (response.data.paymentUrl) {
                        // Store URL and Transaction ID
                        setPaymentData(prev => ({
                            ...prev,
                            paymentUrl: response.data.paymentUrl,
                            transactionId: response.data.transactionId
                        }));
                        setStatus('ready_to_pay');
                        console.log('🔗 Payment URL ready:', response.data.paymentUrl);
                    } else {
                        throw new Error('No payment URL returned');
                    }
                } catch (err) {
                    console.error('❌ Error processing:', err);
                    const errorMessage = err.response?.data?.error || err.message || 'Failed to initiate payment';
                    setError(errorMessage);
                    setStatus('error');
                    // Do not release lock on error to prevent spam loop

                    // Hantar error balik ke GHL (stringify)
                    const errorMsg = JSON.stringify({
                        type: 'custom_element_error_response',
                        error: { description: errorMessage }
                    });
                    window.parent.postMessage(errorMsg, '*');
                }
            }
        };

        window.addEventListener('message', handleMessage);

        // --- HANTAR SIGNAL "SAYA DAH READY" ---
        const readyEventMessage = JSON.stringify({
            type: 'custom_provider_ready',
            loaded: true
        });

        console.log('🚀 Sending Ready Signal to GHL:', readyEventMessage);
        window.parent.postMessage(readyEventMessage, '*');

        // Retry sending ready signal every 2 seconds
        intervalRef.current = setInterval(() => {
            console.log('🔄 Resending Ready Signal...');
            window.parent.postMessage(readyEventMessage, '*');
        }, 2000);

        setStatus('waiting_for_payment_data');

        return () => {
            window.removeEventListener('message', handleMessage);
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, []); // Empty dependency

    // Handle payment success callback
    useEffect(() => {
        // MANUAL PARSING for "Double Question Mark" Issue
        // Browser sees: ?location_id=xyz?transaction_id=abc
        // We need to treat that second '?' as '&'
        let cleanSearch = window.location.search;
        if ((cleanSearch.match(/\?/g) || []).length > 1) {
            console.log('⚠️ Detected double "?" in URL, fixing format...');
            // Keep first '?', replace others with '&'
            const firstMarkIndex = cleanSearch.indexOf('?');
            if (firstMarkIndex !== -1) {
                const queryPart = cleanSearch.substring(firstMarkIndex + 1);
                cleanSearch = '?' + queryPart.replace(/\?/g, '&');
            }
        }

        const manualParams = new URLSearchParams(cleanSearch);

        // Convert to object for easier logging
        const params = {};
        for (const [key, value] of manualParams.entries()) {
            params[key] = value;
        }
        console.log('🔗 Filtered URL Parameters:', params);

        const chargeId = manualParams.get('charge_id') || manualParams.get('transaction_id') || manualParams.get('id');
        const paymentStatus = manualParams.get('status');
        const statusDesc = manualParams.get('status_description');
        const exchangeRef = manualParams.get('exchange_reference_number');

        // Logic: Accept success ONLY if:
        // 1. status === 'success' OR '3' (BayarCash approved status)
        // 2. status_description === 'Approved'
        // IMPORTANT: BayarCash status codes:
        //   - status=2: FAILED (e.g., Insufficient Funds)
        //   - status=3: SUCCESS (Approved)
        //   - status=4: CANCELLED

        const isSuccessStatus = paymentStatus === 'success' || paymentStatus === '3' || statusDesc === 'Approved';
        // SECURITY FIX: status=2 is FAILED in BayarCash (Insufficient Funds, etc.)
        const isFailure = paymentStatus === 'failed' || paymentStatus === 'cancelled' || paymentStatus === 'canceled' || paymentStatus === '2' || paymentStatus === '4';

        console.log('🔍 Payment Status Check:', { paymentStatus, statusDesc, isSuccessStatus, isFailure });

        // SECURITY FIX: Only mark as success if EXPLICITLY successful, not just "not failed"
        if ((chargeId || exchangeRef) && isSuccessStatus && !isFailure) {
            console.log('✅ Payment verified as SUCCESSFUL');
            console.log('Charge ID:', chargeId);

            // Notify GHL of successful payment
            const successMsg = JSON.stringify({
                type: 'custom_element_success_response',
                chargeId: chargeId || exchangeRef
            });
            window.parent.postMessage(successMsg, '*');
            setStatus('success');
        } else if (isFailure || (!isSuccessStatus && (chargeId || exchangeRef))) {
            // Mark as failed if:
            // 1. Explicitly failed status (2, 4, 'failed', 'cancelled')
            // 2. OR has chargeId but no success status (unknown/pending treated as failure for safety)
            console.log('❌ Payment FAILED or NOT successful');
            console.log('Status:', paymentStatus, 'Description:', statusDesc);
            const errorMsg = JSON.stringify({
                type: 'custom_element_error_response',
                error: { description: statusDesc || 'Payment failed or was declined' }
            });
            window.parent.postMessage(errorMsg, '*');
            setStatus('error');
            setError(statusDesc || 'Payment failed or was declined');
        }
    }, []); // Empty dependency mainly because we rely on window.location parsing logic only once on mount or we can add searchParams if we want strictness, but window.location is safer source of truth here

    // Auto-popup and Polling Logic
    useEffect(() => {
        let pollInterval;

        if (status === 'ready_to_pay' && paymentData?.paymentUrl && paymentData?.transactionId) {
            console.log('🚀 Auto-opening payment URL in new tab...');
            // Attempt to open
            window.open(paymentData.paymentUrl, '_blank');

            // Start Polling
            pollInterval = setInterval(async () => {
                try {
                    console.log('🔄 Polling status for:', paymentData.transactionId);
                    // Add timestamp to prevent caching
                    const res = await axios.get(`/api/payment-status/${paymentData.transactionId}?t=${new Date().getTime()}`);
                    console.log(`🔄 Polling result [${paymentData.transactionId}]:`, res.data.status);

                    if (res.data.status === 'success' || res.data.status === 'successful') {
                        console.log('✅ Payment success detected via polling!');
                        clearInterval(pollInterval);
                        setStatus('success');

                        // Notify GHL
                        const successMsg = JSON.stringify({
                            type: 'custom_element_success_response',
                            chargeId: paymentData.transactionId
                        });
                        window.parent.postMessage(successMsg, '*');
                    } else if (res.data.status === 'failed' || res.data.status === 'cancelled') {
                        console.log('❌ Payment failed detected via polling');
                        clearInterval(pollInterval);
                        setStatus('error');
                        setError('Payment failed or cancelled');

                        // Notify GHL of failure
                        const errorMsg = JSON.stringify({
                            type: 'custom_element_error_response',
                            error: { description: 'Payment failed or was cancelled' }
                        });
                        window.parent.postMessage(errorMsg, '*');
                    }
                } catch (err) {
                    console.error('Polling error:', err);
                }
            }, 3000); // Poll every 3 seconds
        }

        return () => {
            if (pollInterval) clearInterval(pollInterval);
        };
    }, [status, paymentData]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
            <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full text-center">
                {status === 'loading' && (
                    <>
                        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <h2 className="text-xl font-semibold text-slate-800">Initializing Payment...</h2>
                        <p className="text-slate-500 mt-2">Please wait</p>
                    </>
                )}

                {status === 'waiting_for_payment_data' && (
                    <>
                        <div className="animate-pulse rounded-full h-16 w-16 bg-blue-100 mx-auto mb-4 flex items-center justify-center">
                            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <h2 className="text-xl font-semibold text-slate-800">Waiting for Payment Details...</h2>
                        <p className="text-slate-500 mt-2">Connecting to payment system</p>
                    </>
                )}

                {status === 'processing' && (
                    <>
                        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-green-600 mx-auto mb-4"></div>
                        <h2 className="text-xl font-semibold text-slate-800">Processing Payment...</h2>
                        <p className="text-slate-500 mt-2">Creating secure payment session</p>
                        {paymentData && (
                            <div className="mt-4 text-left bg-slate-50 p-4 rounded-md">
                                <p className="text-sm text-slate-600">Amount: <span className="font-semibold">{paymentData.currency} {paymentData.amount}</span></p>
                                <p className="text-sm text-slate-600">Order: <span className="font-semibold">{paymentData.orderId}</span></p>
                            </div>
                        )}
                    </>
                )}

                {status === 'ready_to_pay' && paymentData?.paymentUrl && (
                    <>
                        <div className="rounded-full h-16 w-16 bg-blue-50 mx-auto mb-4 flex items-center justify-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        </div>
                        <h2 className="text-xl font-semibold text-slate-800">Payment Opened in New Tab</h2>
                        <p className="text-slate-500 mt-2">Please complete the payment in the new tab.</p>

                        <div className="mt-6 p-4 bg-yellow-50 text-yellow-800 text-sm rounded-lg">
                            <p><strong>Note:</strong> If the payment page didn't open automatically, <a href={paymentData.paymentUrl} target="_blank" rel="noopener noreferrer" className="underline font-bold">click here</a>.</p>
                        </div>

                        <p className="text-xs text-slate-400 mt-4">We are checking your payment status automatically...</p>
                    </>
                )}

                {status === 'redirecting' && (
                    <>
                        <div className="animate-bounce rounded-full h-16 w-16 bg-green-100 mx-auto mb-4 flex items-center justify-center">
                            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                            </svg>
                        </div>
                        <h2 className="text-xl font-semibold text-slate-800">Redirecting to Checkout...</h2>
                        <p className="text-slate-500 mt-2">Please wait while we redirect you to BayarCash</p>
                    </>
                )}

                {status === 'success' && (
                    <SuccessWithAutoClose />
                )}

                {status === 'error' && (
                    <ErrorWithAutoClose message={error} />
                )}
            </div>
        </div>
    );
};

export default PaymentIframe;
