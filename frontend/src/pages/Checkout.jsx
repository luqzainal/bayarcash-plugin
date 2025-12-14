import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useSearchParams } from 'react-router-dom';

const Checkout = () => {
    const [searchParams] = useSearchParams();
    const [loading, setLoading] = useState(true);
    const [banks, setBanks] = useState([]);
    const [selectedBank, setSelectedBank] = useState('');
    const [orderData, setOrderData] = useState(null);
    const [error, setError] = useState('');
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        const token = searchParams.get('token');
        if (!token) {
            setError('Invalid payment link');
            setLoading(false);
            return;
        }

        try {
            // Decode token
            const data = JSON.parse(atob(token));
            setOrderData(data);
            fetchBanks(data.locationId);
        } catch (err) {
            setError('Failed to load payment details');
            setLoading(false);
        }
    }, [searchParams]);

    const fetchBanks = async (locationId) => {
        try {
            const response = await axios.get(`/api/banks?locationId=${locationId}`);
            setBanks(response.data.data || []); // Adjust based on actual API response structure
        } catch (err) {
            console.error('Failed to fetch banks', err);
            setError('Failed to load bank list');
        } finally {
            setLoading(false);
        }
    };

    const handlePayment = async () => {
        if (!selectedBank) return;
        setProcessing(true);

        try {
            const response = await axios.post('/api/process-payment', {
                ...orderData,
                bank_code: selectedBank
            });

            if (response.data.paymentUrl) {
                window.location.href = response.data.paymentUrl;
            } else {
                setError('Payment provider did not return a valid URL');
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Payment failed');
            setProcessing(false);
        }
    };

    if (loading) return <div className="flex justify-center items-center h-screen">Loading...</div>;
    if (error) return <div className="flex justify-center items-center h-screen text-red-500">{error}</div>;

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
                <div className="text-center mb-6">
                    <h1 className="text-2xl font-bold text-slate-800">Secure Checkout</h1>
                    <p className="text-slate-500">Complete your payment securely via FPX</p>
                </div>

                <div className="bg-slate-50 p-4 rounded-md mb-6">
                    <div className="flex justify-between mb-2">
                        <span className="text-slate-600">Order ID</span>
                        <span className="font-medium">{orderData.orderId}</span>
                    </div>
                    <div className="flex justify-between mb-2">
                        <span className="text-slate-600">Customer</span>
                        <span className="font-medium">{orderData.customer_name}</span>
                    </div>
                    <div className="border-t border-slate-200 my-2"></div>
                    <div className="flex justify-between text-lg font-bold text-slate-800">
                        <span>Total</span>
                        <span>{orderData.currency} {orderData.amount}</span>
                    </div>
                </div>

                <div className="mb-6">
                    <label className="block text-sm font-medium text-slate-700 mb-2">Select Bank</label>
                    <select
                        className="w-full p-3 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        value={selectedBank}
                        onChange={(e) => setSelectedBank(e.target.value)}
                    >
                        <option value="">-- Choose your bank --</option>
                        {banks.map((bank) => (
                            <option key={bank.code} value={bank.code}>
                                {bank.name}
                            </option>
                        ))}
                    </select>
                </div>

                <button
                    onClick={handlePayment}
                    disabled={!selectedBank || processing}
                    className={`w-full py-3 px-4 rounded-md text-white font-medium transition-colors
                        ${!selectedBank || processing
                            ? 'bg-slate-400 cursor-not-allowed'
                            : 'bg-blue-600 hover:bg-blue-700'}`}
                >
                    {processing ? 'Processing...' : `Pay ${orderData.currency} ${orderData.amount}`}
                </button>

                <div className="mt-4 text-center">
                    <img src="/fpx-logo.png" alt="FPX" className="h-8 mx-auto opacity-70" />
                </div>
            </div>
        </div>
    );
};

export default Checkout;
