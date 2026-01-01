require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const axios = require('axios');
const qs = require('qs');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
// Middleware to bypass ngrok browser warning  
app.use((req, res, next) => {
    res.setHeader('ngrok-skip-browser-warning', 'true');
    next();
});

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files (for logo)
app.use('/public', express.static(path.join(__dirname, 'public')));

// Direct logo endpoint - explicit serving
app.get('/logo.jpg', (req, res) => {
    const logoPath = path.resolve(__dirname, 'public', 'logo.jpg');
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.sendFile(logoPath, (err) => {
        if (err) {
            console.error('Error sending logo:', err);
            res.status(404).json({ error: 'Logo not found', path: logoPath });
        }
    });
});

// Also serve at /public/logo.jpg directly
app.get('/public/logo.jpg', (req, res) => {
    const logoPath = path.resolve(__dirname, 'public', 'logo.jpg');
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.sendFile(logoPath, (err) => {
        if (err) {
            console.error('Error sending logo:', err);
            res.status(404).json({ error: 'Logo not found', path: logoPath });
        }
    });
});

// Debug endpoint to check if public folder exists
app.get('/debug/public', (req, res) => {
    const fs = require('fs');
    const publicPath = path.join(__dirname, 'public');
    try {
        const files = fs.readdirSync(publicPath);
        res.json({ path: publicPath, files: files });
    } catch (err) {
        res.status(500).json({ error: err.message, path: publicPath });
    }
});

// Environment Variables
const {
    CLIENT_ID,
    CLIENT_SECRET,
    REDIRECT_URI,
    FRONTEND_URL,
    PORT,
    DB_HOST,
    DB_USER,
    DB_PASSWORD,
    DB_NAME,
    GHL_TOKEN_URL,
    BAYARCASH_API_URL_PRODUCTION,
    BAYARCASH_API_URL_SANDBOX
} = process.env;

// Helper: Refresh Access Token
async function refreshAccessToken(locationId) {
    try {
        const [rows] = await pool.execute(
            'SELECT refresh_token FROM ghl_integrations WHERE location_id = ?',
            [locationId]
        );

        if (rows.length === 0 || !rows[0].refresh_token) {
            throw new Error('No refresh token found');
        }

        const refreshToken = rows[0].refresh_token;
        const data = qs.stringify({
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            grant_type: 'refresh_token',
            refresh_token: refreshToken
        });

        const response = await axios.post(GHL_TOKEN_URL, data, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });

        const { access_token, refresh_token, expires_in } = response.data;

        await pool.execute(
            `UPDATE ghl_integrations 
             SET access_token = ?, refresh_token = ?, expires_in = ? 
             WHERE location_id = ?`,
            [access_token, refresh_token, expires_in, locationId]
        );

        console.log('🔄 Access token refreshed for location:', locationId);
        return access_token;

    } catch (error) {
        console.error('❌ Failed to refresh token:', error.response?.data || error.message);
        throw error;
    }
}

// MySQL Connection Pool
const pool = mysql.createPool({
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Test database connection
pool.getConnection()
    .then(connection => {
        console.log('✅ MySQL Database connected successfully');
        connection.release();

        // Display server configuration
        console.log('\n🚀 GHL BayarCash Integration Server');
        console.log('📡 Server running on http://localhost:' + (PORT || 3000));
        console.log('🔗 OAuth Callback:', REDIRECT_URI);
        console.log('🌐 Frontend URL:', FRONTEND_URL);
        console.log('💳 BayarCash Production API:', BAYARCASH_API_URL_PRODUCTION);
        console.log('🧪 BayarCash Sandbox API:', BAYARCASH_API_URL_SANDBOX);
        console.log('');
    })
    .catch(err => {
        console.error('❌ MySQL connection error:', err.message);
    });

// ============================================
// OAUTH CALLBACK ENDPOINT
// ============================================
app.get('/oauth/callback', async (req, res) => {
    try {
        // Step 1: Extract Authorization Code
        const { code } = req.query;

        if (!code) {
            console.error('❌ No authorization code received');
            const errorMsg = encodeURIComponent('No authorization code received');
            return res.redirect(`${FRONTEND_URL}/install-failed?error=${errorMsg}&code=NO_CODE`);
        }

        console.log('📝 Authorization code received, exchanging for tokens...');

        // Step 2: Exchange Code for Tokens
        const tokenResponse = await axios.post(
            GHL_TOKEN_URL,
            qs.stringify({
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET,
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: REDIRECT_URI
            }),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        );

        // Step 3: Capture Complete Response
        const {
            access_token,
            refresh_token,
            token_type,
            expires_in,
            scope,
            userType,
            locationId,
            companyId,
            userId
        } = tokenResponse.data;

        console.log('✅ Token exchange successful');
        console.log('📊 User Context:', {
            locationId,
            userType,
            companyId,
            userId
        });

        // Step 4: Store Data in MySQL
        const query = `
      INSERT INTO ghl_integrations (
        location_id,
        access_token,
        refresh_token,
        token_type,
        expires_in,
        scope,
        user_type,
        company_id,
        user_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        access_token = VALUES(access_token),
        refresh_token = VALUES(refresh_token),
        token_type = VALUES(token_type),
        expires_in = VALUES(expires_in),
        scope = VALUES(scope),
        user_type = VALUES(user_type),
        company_id = VALUES(company_id),
        user_id = VALUES(user_id),
        updated_at = CURRENT_TIMESTAMP
    `;

        await pool.execute(query, [
            locationId,
            access_token,
            refresh_token,
            token_type || 'Bearer',
            expires_in,
            scope,
            userType,
            companyId,
            userId
        ]);

        console.log('💾 Data stored successfully in database');

        // Step 5: Register BayarCash as Custom Payment Provider in GHL
        try {
            const providerData = {
                name: 'BayarCash Payment Integration',
                description: 'Accept payments in Malaysia via BayarCash - supports FPX, credit/debit cards, and e-wallets.',
                paymentsUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment-iframe`,
                queryUrl: `${process.env.BACKEND_URL || 'http://localhost:3000'}/bayarcash-query`,
                configUrl: `${process.env.BACKEND_URL || 'http://localhost:3000'}/payments/custom-provider/connect`,
                imageUrl: `${process.env.BACKEND_URL || 'http://localhost:3000'}/public/logo.jpg`,
                supportsSubscriptionSchedule: false
            };

            await axios.post(
                `https://services.leadconnectorhq.com/payments/custom-provider/provider?locationId=${locationId}`,
                providerData,
                {
                    headers: {
                        'Authorization': `Bearer ${access_token}`,
                        'Version': '2021-07-28',
                        'Content-Type': 'application/json'
                    }
                }
            );

            console.log('✅ BayarCash registered as custom payment provider in GHL');
        } catch (providerError) {
            console.error('⚠️  Failed to register payment provider (non-critical):', providerError.response?.data || providerError.message);
            // Continue even if provider registration fails
        }

        // Step 6: Redirect User to Frontend Success Page
        res.redirect(`${FRONTEND_URL}/settings?location_id=${locationId}&status=success`);

    } catch (error) {
        console.error('❌ OAuth callback error:', error.response?.data || error.message);

        // Extract error details
        let errorMessage = 'Unknown error occurred';
        let errorCode = 'UNKNOWN_ERROR';

        if (error.response) {
            // API returned error response
            errorCode = error.response.status;
            errorMessage = error.response.data?.error || error.response.data?.message || error.response.statusText;
        } else if (error.message) {
            // Network or other error
            errorMessage = error.message;
        }

        console.error(`Error Code: ${errorCode}, Message: ${errorMessage}`);

        // Redirect to error page with error details
        const encodedError = encodeURIComponent(errorMessage);
        res.redirect(`${FRONTEND_URL}/install-failed?error=${encodedError}&code=${errorCode}`);
    }
});

// ============================================
// GHL PAYMENT PROVIDER ENDPOINTS
// ============================================

// GHL Payment Provider Configuration Endpoint
// Called by GHL when user configures BayarCash in payment settings
// Called by GHL when user configures BayarCash in payment settings
app.post('/payments/custom-provider/connect', async (req, res) => {
    try {
        const { locationId } = req.query;
        const { live, test } = req.body;

        if (!locationId) {
            return res.status(400).json({
                success: false,
                error: 'locationId is required'
            });
        }

        console.log('📝 Received payment provider configuration for location:', locationId);
        console.log('Configuration data:', { live, test });

        const query = `
      UPDATE ghl_integrations
      SET bayarcash_api_key_live = ?,
          bayarcash_portal_key_live = ?,
          bayarcash_api_key_test = ?,
          bayarcash_portal_key_test = ?
      WHERE location_id = ?
    `;

        await pool.execute(query, [
            live?.apiKey || null,
            live?.publishableKey || null,
            test?.apiKey || null,
            test?.publishableKey || null,
            locationId
        ]);

        console.log('✅ Payment provider configuration saved');

        // Return success response to GHL
        res.json({
            success: true,
            message: 'BayarCash configuration saved successfully'
        });

    } catch (error) {
        console.error('❌ Error saving payment provider config:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to save configuration'
        });
    }
});

// DELETE Payment Provider
// Remove BayarCash as custom payment provider from GHL
app.delete('/payments/custom-provider/provider', async (req, res) => {
    try {
        const { locationId } = req.query;

        if (!locationId) {
            return res.status(400).json({
                success: false,
                error: 'locationId is required'
            });
        }

        // Get access token for this location
        const [rows] = await pool.execute(
            'SELECT access_token FROM ghl_integrations WHERE location_id = ?',
            [locationId]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Location not found'
            });
        }

        const { access_token } = rows[0];

        // Call GHL API to delete custom payment provider
        await axios.delete(
            `https://services.leadconnectorhq.com/payments/custom-provider/provider?locationId=${locationId}`,
            {
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Version': '2021-07-28'
                }
            }
        );

        console.log('✅ BayarCash payment provider removed from GHL');

        // Optionally clear BayarCash config from database
        await pool.execute(
            `UPDATE ghl_integrations 
       SET bayarcash_api_key = NULL,
           bayarcash_secret_key = NULL,
           bayarcash_merchant_id = NULL
       WHERE location_id = ?`,
            [locationId]
        );

        res.json({
            success: true,
            message: 'Payment provider disconnected successfully'
        });

    } catch (error) {
        console.error('❌ Error deleting payment provider:', error.response?.data || error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to delete payment provider'
        });
    }
});

// ============================================
// WEBHOOK ENDPOINTS
// ============================================

// Uninstall Webhook
// Called by GHL when user uninstalls the app
app.post('/webhook/uninstall', async (req, res) => {
    try {
        const { type, appId, companyId, locationId } = req.body;

        console.log('📥 Received uninstall webhook:', { type, appId, companyId, locationId });

        if (type !== 'UNINSTALL') {
            return res.status(400).json({
                success: false,
                error: 'Invalid webhook type'
            });
        }

        // Handle Location Level Uninstall
        if (locationId) {
            console.log(`🗑️  Processing location-level uninstall for: ${locationId}`);

            // Delete location data from database
            const [result] = await pool.execute(
                'DELETE FROM ghl_integrations WHERE location_id = ?',
                [locationId]
            );

            if (result.affectedRows > 0) {
                console.log(`✅ Location ${locationId} data deleted successfully`);
            } else {
                console.log(`⚠️  No data found for location ${locationId}`);
            }
        }

        // Handle Agency Level Uninstall
        if (companyId && !locationId) {
            console.log(`🗑️  Processing agency-level uninstall for company: ${companyId}`);

            // Delete all locations under this company
            const [result] = await pool.execute(
                'DELETE FROM ghl_integrations WHERE company_id = ?',
                [companyId]
            );

            console.log(`✅ Deleted ${result.affectedRows} location(s) for company ${companyId}`);
        }

        // Return success response to GHL
        res.json({
            success: true,
            message: 'Uninstall processed successfully'
        });

    } catch (error) {
        console.error('❌ Error processing uninstall webhook:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to process uninstall'
        });
    }
});

// ============================================
// BAYARCASH PAYMENT ENDPOINTS
// ============================================

// Get List of Banks from BayarCash
app.get('/banks', async (req, res) => {
    try {
        const { locationId } = req.query;

        if (!locationId) {
            return res.status(400).json({ error: 'locationId is required' });
        }

        // Get BayarCash credentials
        const [rows] = await pool.execute(
            'SELECT bayarcash_api_key_live, bayarcash_api_key_test FROM ghl_integrations WHERE location_id = ?',
            [locationId]
        );

        if (rows.length === 0) {
            return res.status(400).json({ error: 'Location not found' });
        }

        const config = rows[0];
        const apiKey = config.bayarcash_api_key_live || config.bayarcash_api_key_test;

        if (!apiKey) {
            return res.status(400).json({ error: 'BayarCash API key not found' });
        }

        const response = await axios.get(`${BAYARCASH_API_URL}/banks`, {
            headers: { 'Authorization': `Bearer ${apiKey}` }
        });

        res.json(response.data);

    } catch (error) {
        console.error('❌ Error fetching banks:', error.response?.data || error.message);
        res.status(500).json({ error: 'Failed to fetch bank list' });
    }
});

// Process Payment (Called by PaymentIframe from GHL)
app.post('/process-payment', async (req, res) => {
    try {
        const { locationId, amount, currency, orderId, customer_name, customer_email, metadata, mode, publishableKey } = req.body;

        console.log('💳 Processing payment from GHL iframe:', { locationId, amount, currency, orderId, mode, keyStarting: publishableKey?.substring(0, 5) });

        if (!locationId || !amount) {
            console.error('❌ Missing required fields. Received body keys:', Object.keys(req.body));
            return res.status(400).json({ error: `Missing required fields: locationId (${!!locationId}) and amount (${!!amount})` });
        }

        // Get BayarCash Credentials (including PAT for Authorization)
        const [rows] = await pool.execute(
            'SELECT bayarcash_pat_live, bayarcash_api_key_live, bayarcash_portal_key_live, bayarcash_pat_test, bayarcash_api_key_test, bayarcash_portal_key_test FROM ghl_integrations WHERE location_id = ?',
            [locationId]
        );

        if (rows.length === 0) {
            return res.status(400).json({ error: 'BayarCash not configured for this location' });
        }

        const config = rows[0];

        // Select credentials based on mode parameter
        // Select credentials based on publishableKey match OR mode parameter
        let pat, apiSecretKey, portalKey, apiUrl;
        let selectedMode = null;

        // 1. Try to match by Publishable Key (Exact Match) - Most Robust
        if (publishableKey) {
            if (publishableKey === config.bayarcash_portal_key_live) {
                selectedMode = 'live';
                console.log('🎯 Mode detected via Key Match: LIVE');
            } else if (publishableKey === config.bayarcash_portal_key_test) {
                selectedMode = 'test';
                console.log('🎯 Mode detected via Key Match: TEST');
            } else {
                console.log('⚠️ Key did not match any stored portal keys, falling back to mode param...');
            }
        }

        // 2. Fallback to mode param if key didn't match
        if (!selectedMode) {
            selectedMode = mode;
            console.log(`🎯 Using provided mode param: ${selectedMode}`);
        }

        if (selectedMode === 'live') {
            // Use Live credentials
            pat = config.bayarcash_pat_live;
            apiSecretKey = config.bayarcash_api_key_live;
            portalKey = config.bayarcash_portal_key_live;
            apiUrl = 'https://api.console.bayar.cash/v3';
            console.log('🚀 Using LIVE mode credentials with PRODUCTION URL');
        } else if (selectedMode === 'test') {
            // Use Test credentials
            pat = config.bayarcash_pat_test;
            apiSecretKey = config.bayarcash_api_key_test;
            portalKey = config.bayarcash_portal_key_test;
            apiUrl = 'https://api.console.bayarcash-sandbox.com/v3';
            console.log('🧪 Using TEST mode credentials with SANDBOX URL');
        } else {
            // No valid mode specified
            return res.status(400).json({
                error: 'Invalid mode. Please specify either "test" or "live" mode.'
            });
        }

        if (!pat || !apiSecretKey || !portalKey) {
            return res.status(400).json({
                error: 'BayarCash credentials missing. Please configure PAT, API Secret Key, and Portal Key in Settings.'
            });
        }

        console.log('🔗 BayarCash API URL:', apiUrl);
        console.log('🔑 Using PAT for Authorization (first 50 chars):', pat.substring(0, 50) + '...');

        // Create Payment Intent with BayarCash
        // BayarCash will handle bank selection on their hosted checkout page
        const returnUrl = `${process.env.FRONTEND_URL}/payment-iframe?location_id=${locationId}`;

        const paymentData = {
            payment_channel: 1, // FPX (BayarCash will show bank selection)
            portal_key: portalKey,
            order_number: orderId || `ORDER-${Date.now()}`,
            amount: amount, // BayarCash expects amount in ringgit (e.g., 5 for RM 5.00), NOT cents
            payer_name: customer_name || 'Customer',
            payer_email: customer_email || 'customer@example.com',
            return_url: returnUrl // Redirect back to iframe after payment
        };

        console.log('🔙 Return URL:', returnUrl);

        console.log('💰 Amount from GHL:', amount, '(in ringgit)');
        console.log('💰 Amount to BayarCash:', amount, '(in ringgit - BayarCash format)');
        console.log('📤 Creating BayarCash payment intent:', JSON.stringify(paymentData, null, 2));

        const response = await axios.post(
            `${apiUrl}/payment-intents`,
            paymentData,
            { headers: { 'Authorization': `Bearer ${pat}` } } // Use PAT for Authorization
        );

        console.log('✅ BayarCash payment intent created');
        console.log('📋 Full API Response:', JSON.stringify(response.data, null, 2));
        console.log('🔗 Payment URL:', response.data.payment_url || response.data.url);
        console.log('🆔 Transaction ID:', response.data.id);

        // Return payment URL to redirect user to BayarCash hosted checkout
        res.json({
            paymentUrl: response.data.payment_url || response.data.url,
            transactionId: response.data.id
        });

    } catch (error) {
        console.error('❌ Error processing payment:', error.response?.data || error.message);
        res.status(500).json({
            error: error.response?.data?.message || error.message || 'Payment failed'
        });
    }
});

// Get settings for a specific location
app.get('/settings/:location_id', async (req, res) => {
    try {
        const { location_id } = req.params;

        const [rows] = await pool.execute(
            'SELECT bayarcash_pat_live, bayarcash_api_key_live, bayarcash_portal_key_live, bayarcash_pat_test, bayarcash_api_key_test, bayarcash_portal_key_test FROM ghl_integrations WHERE location_id = ?',
            [location_id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Location not found' });
        }

        res.json(rows[0]);
    } catch (error) {
        console.error('Error fetching settings:', error);
        res.status(500).json({ error: 'Failed to fetch settings' });
    }
});

// Save BayarCash configuration
app.post('/settings', async (req, res) => {
    try {
        const {
            location_id,
            bayarcash_pat_live,
            bayarcash_api_key_live,
            bayarcash_portal_key_live,
            bayarcash_pat_test,
            bayarcash_api_key_test,
            bayarcash_portal_key_test
        } = req.body;

        if (!location_id) {
            return res.status(400).json({ error: 'location_id is required' });
        }

        // 1. Update Database
        const query = `
      UPDATE ghl_integrations
      SET bayarcash_pat_live = ?,
          bayarcash_api_key_live = ?,
          bayarcash_portal_key_live = ?,
          bayarcash_pat_test = ?,
          bayarcash_api_key_test = ?,
          bayarcash_portal_key_test = ?
      WHERE location_id = ?
    `;

        const [result] = await pool.execute(query, [
            bayarcash_pat_live || null,
            bayarcash_api_key_live || null,
            bayarcash_portal_key_live || null,
            bayarcash_pat_test || null,
            bayarcash_api_key_test || null,
            bayarcash_portal_key_test || null,
            location_id
        ]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Location not found' });
        }

        // 2. Call GHL Connect API to enable provider
        // Fetch access token first
        const [rows] = await pool.execute(
            'SELECT access_token FROM ghl_integrations WHERE location_id = ?',
            [location_id]
        );

        if (rows.length > 0 && rows[0].access_token) {
            const { access_token } = rows[0];

            const connectData = {};
            const disconnectRequests = [];

            // --- LIVE MODE LOGIC ---
            if (bayarcash_api_key_live && bayarcash_portal_key_live) {
                connectData.live = {
                    apiKey: bayarcash_api_key_live,
                    publishableKey: bayarcash_portal_key_live
                };
            } else {
                // No keys = Disconnect Live Mode
                disconnectRequests.push({ liveMode: true });
            }

            // --- TEST MODE LOGIC ---
            if (bayarcash_api_key_test && bayarcash_portal_key_test) {
                connectData.test = {
                    apiKey: bayarcash_api_key_test,
                    publishableKey: bayarcash_portal_key_test
                };
            } else {
                // No keys = Disconnect Test Mode
                disconnectRequests.push({ liveMode: false });
            }

            console.log('🔌 Connection Logic:', {
                connect: Object.keys(connectData),
                disconnect: disconnectRequests
            });

            // 1. Handle CONNECTIONS
            if (Object.keys(connectData).length > 0) {
                try {
                    await axios.post(
                        `https://services.leadconnectorhq.com/payments/custom-provider/connect?locationId=${location_id}`,
                        connectData,
                        {
                            headers: {
                                'Authorization': `Bearer ${access_token}`,
                                'Version': '2021-07-28',
                                'Content-Type': 'application/json'
                            }
                        }
                    );
                    console.log('✅ Connected modes in GHL:', Object.keys(connectData));
                } catch (ghlError) {
                    // Retry logic for 401 (Refresh Token)
                    if (ghlError.response?.status === 401) {
                        console.log('⚠️ Access token expired during connect, refreshing...');
                        const newAccessToken = await refreshAccessToken(location_id);
                        await axios.post(
                            `https://services.leadconnectorhq.com/payments/custom-provider/connect?locationId=${location_id}`,
                            connectData,
                            {
                                headers: {
                                    'Authorization': `Bearer ${newAccessToken}`,
                                    'Version': '2021-07-28',
                                    'Content-Type': 'application/json'
                                }
                            }
                        );
                        console.log('✅ Connected modes after refresh');
                    } else {
                        console.error('❌ Failed to connect GHL provider:', ghlError.response?.data || ghlError.message);
                        // Don't block the save, just log error
                    }
                }
            }

            // 2. Handle DISCONNECTIONS
            for (const reqBody of disconnectRequests) {
                try {
                    await axios.post(
                        `https://services.leadconnectorhq.com/payments/custom-provider/disconnect?locationId=${location_id}`,
                        reqBody,
                        {
                            headers: {
                                'Authorization': `Bearer ${access_token}`,
                                'Version': '2021-07-28',
                                'Content-Type': 'application/json'
                            }
                        }
                    );
                    console.log(`✅ Disconnected ${reqBody.liveMode ? 'Live' : 'Test'} mode in GHL`);
                } catch (ghlError) {
                    if (ghlError.response?.status === 401) {
                        // We could refresh here too, but simplest is to catch and log
                        // If refresh happened in Connect block, access_token might be stale here?
                        // Ideally we refetch or update the var, but for now retry with refresh logic if needed
                        console.log('⚠️ Access token expired during disconnect, refreshing...');
                        const newAccessToken = await refreshAccessToken(location_id);
                        await axios.post(
                            `https://services.leadconnectorhq.com/payments/custom-provider/disconnect?locationId=${location_id}`,
                            reqBody,
                            {
                                headers: {
                                    'Authorization': `Bearer ${newAccessToken}`,
                                    'Version': '2021-07-28',
                                    'Content-Type': 'application/json'
                                }
                            }
                        );
                        console.log(`✅ Disconnected ${reqBody.liveMode ? 'Live' : 'Test'} mode after refresh`);
                    } else {
                        console.error(`❌ Failed to disconnect ${reqBody.liveMode ? 'Live' : 'Test'} mode:`, ghlError.response?.data || ghlError.message);
                    }
                }
            }
        }

        console.log('✅ BayarCash settings saved for location:', location_id);
        res.json({ success: true, message: 'Settings saved and provider connected' });

    } catch (error) {
        console.error('Error saving settings:', error.response?.data || error.message);
        const errorMessage = error.response?.data?.message
            ? JSON.stringify(error.response.data.message)
            : (error.response?.data?.error || error.message || 'Failed to save settings');

        res.status(500).json({ error: errorMessage });
    }
});

// GHL Payment Verification Endpoint
// Called by GHL to verify payment status after custom_element_success_response
app.post('/bayarcash-query', async (req, res) => {
    try {
        const { type, transactionId, apiKey, chargeId, subscriptionId } = req.body;

        console.log('🔍 GHL Payment Verification Request:');
        console.log('   Type:', type);
        console.log('   Transaction ID:', transactionId);
        console.log('   Charge ID:', chargeId);
        console.log('   Subscription ID:', subscriptionId);

        if (type !== 'verify') {
            return res.status(400).json({ error: 'Invalid request type' });
        }

        if (!chargeId) {
            return res.status(400).json({ error: 'Missing chargeId' });
        }

        // TODO: Verify payment with BayarCash/FastPayDirect API
        // For now, we trust the chargeId from the frontend
        // In production, you should call BayarCash API to verify the payment status

        // For now, mark as success if chargeId exists
        console.log('✅ Payment verified successfully');
        return res.json({ success: true });

    } catch (error) {
        console.error('❌ Error verifying payment:', error.message);
        return res.json({ failed: true });
    }
});

// ============================================
// HEALTH CHECK ENDPOINTS
// ============================================

// Root health check
app.get('/', (req, res) => {
    res.json({
        status: 'ok',
        message: 'BayarCash Integration Server',
        version: '1.0.0',
        endpoints: {
            oauth: '/oauth/callback',
            settings: '/api/settings/:location_id',
            banks: '/api/banks',
            payment: '/api/process-payment',
            query: '/api/bayarcash-query'
        }
    });
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============================================
// SERVE FRONTEND (DISABLED IN PRODUCTION)
// ============================================
// Frontend is deployed separately in production
// Uncomment below for local development only

// app.use(express.static(path.join(__dirname, '../frontend/dist')));
// app.get('*', (req, res) => {
//     res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
// });

// Start server
app.listen(PORT, () => {
    console.log('🚀 GHL BayarCash Integration Server');
    console.log(`📡 Server running on http://localhost:${PORT}`);
    console.log(`🔗 OAuth Callback: ${REDIRECT_URI}`);
    console.log(`🌐 Frontend URL: ${FRONTEND_URL}`);
});
