import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useSearchParams } from 'react-router-dom';

const PaymentIframe = () => {
    const [searchParams] = useSearchParams();
    const [status, setStatus] = useState('initializing');
    const [error, setError] = useState('');
    const [paymentData, setPaymentData] = useState(null);

    useEffect(() => {
        // --- 1. SETUP LISTENER DULU ---
        const handleMessage = async (event) => {
            // Accept messages from GHL and FastPayDirect (BayarCash uses FastPayDirect for processing)
            const allowedOrigins = [
                'https://link.fastpaydirect.com',
                'https://console.bayar.cash',
                window.location.origin
            ];

            // Log all messages for debugging
            console.log('📥 Received message from:', event.origin);
            console.log('📦 Message data:', event.data);

            let data = event.data;

            // GHL hantar String, kita perlu parse
            if (typeof data === 'string') {
                try {
                    data = JSON.parse(data);
                } catch (e) {
                    console.log('⚠️ Could not parse message as JSON, treating as string');
                    return; // Abaikan jika bukan JSON valid
                }
            }

            // Debugging
            if (data?.type) {
                console.log('📥 Message received:', data.type);
                console.log('📦 Full data:', JSON.stringify(data, null, 2));
            }

            // --- 2. TANGKAP DATA PAYMENT ---
            // GHL hantar event dengan type: 'payment_initiate_props'
            if (data && data.type === 'payment_initiate_props') {
                console.log('✅ Handshake Berjaya! Data Payment Diterima:', data);

                const { amount, currency, orderId, locationId, contact, metadata, publishableKey } = data;

                // Detect mode from GHL publishableKey (default to 'live' if not detected)
                const isTestMode = publishableKey &&
                    (publishableKey.toLowerCase().includes('test') ||
                        publishableKey.toLowerCase().includes('sandbox'));

                // Default to 'live' mode if not explicitly test
                const paymentMode = isTestMode ? 'test' : 'live';

                console.log('🔑 Publishable Key:', publishableKey);
                console.log('🎯 Payment Mode:', paymentMode, isTestMode ? '(detected as test)' : '(defaulting to live)');

                // Set state
                setPaymentData(data);
                setStatus('processing');

                // Call backend
                try {
                    console.log('📤 Calling backend /api/process-payment...');
                    const response = await axios.post('/api/process-payment', {
                        locationId: locationId || data.location?.id,
                        amount: amount || data.amount,
                        currency: currency || 'MYR',
                        orderId: orderId || data.order_id,
                        customer_name: contact?.name || 'Customer',
                        customer_email: contact?.email || 'customer@example.com',
                        metadata: metadata,
                        mode: paymentMode // Pass mode to backend
                    });

                    console.log('✅ Payment intent created:', response.data);

                    if (response.data.paymentUrl) {
                        setStatus('redirecting');
                        console.log('🔗 Redirecting to payment:', response.data.paymentUrl);

                        // Direct redirect - open in top level window (not iframe)
                        // This avoids popup blockers and iframe restrictions
                        window.top.location.href = response.data.paymentUrl;
                    } else {
                        throw new Error('No payment URL returned');
                    }
                } catch (err) {
                    console.error('❌ Error processing:', err);
                    setError(err.response?.data?.error || err.message || 'Failed to initiate payment');
                    setStatus('error');

                    // Hantar error balik ke GHL (stringify)
                    const errorMsg = JSON.stringify({
                        type: 'custom_element_error_response',
                        error: { description: err.message }
                    });
                    window.parent.postMessage(errorMsg, '*');
                }
            }
        };

        window.addEventListener('message', handleMessage);

        // --- 3. HANTAR SIGNAL "SAYA DAH READY" (PALING PENTING!) ---
        // MESTI stringify message!
        const readyEventMessage = JSON.stringify({
            type: 'custom_provider_ready',
            loaded: true
        });

        console.log('🚀 Sending Ready Signal to GHL:', readyEventMessage);
        window.parent.postMessage(readyEventMessage, '*');

        setStatus('waiting_for_payment_data');

        return () => {
            window.removeEventListener('message', handleMessage);
        };
    }, []);

    // Handle payment success callback (when redirected back from BayarCash)
    useEffect(() => {
        const chargeId = searchParams.get('charge_id') || searchParams.get('transaction_id') || searchParams.get('id');
        const paymentStatus = searchParams.get('status');

        if (chargeId && paymentStatus === 'success') {
            console.log('✅ Payment successful, notifying GHL');

            // Notify GHL of successful payment
            const successMsg = JSON.stringify({
                type: 'custom_element_success_response',
                chargeId: chargeId
            });
            window.parent.postMessage(successMsg, '*');

            setStatus('success');
        } else if (paymentStatus === 'failed') {
            console.log('❌ Payment failed, notifying GHL');

            // Notify GHL of failed payment
            const errorMsg = JSON.stringify({
                type: 'custom_element_error_response',
                error: { description: 'Payment failed or was declined' }
            });
            window.parent.postMessage(errorMsg, '*');

            setStatus('error');
            setError('Payment failed or was declined');
        } else if (paymentStatus === 'cancelled' || paymentStatus === 'canceled') {
            console.log('🚫 Payment cancelled, notifying GHL');

            // Notify GHL that payment was cancelled
            const cancelMsg = JSON.stringify({
                type: 'custom_element_close_response'
            });
            window.parent.postMessage(cancelMsg, '*');

            setStatus('error');
            setError('Payment was cancelled');
        }
    }, [searchParams]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
            <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full text-center">
                {status === 'initializing' && (
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
                    <>
                        <div className="rounded-full h-16 w-16 bg-green-100 mx-auto mb-4 flex items-center justify-center">
                            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h2 className="text-xl font-semibold text-green-800">Payment Successful!</h2>
                        <p className="text-slate-500 mt-2">Your payment has been processed</p>
                    </>
                )}

                {status === 'error' && (
                    <>
                        <div className="rounded-full h-16 w-16 bg-red-100 mx-auto mb-4 flex items-center justify-center">
                            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </div>
                        <h2 className="text-xl font-semibold text-red-800">Payment Failed</h2>
                        <p className="text-red-500 mt-2">{error}</p>
                        <button
                            onClick={() => window.location.reload()}
                            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                        >
                            Try Again
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};

export default PaymentIframe;
