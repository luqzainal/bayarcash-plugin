# BayarCash Payment Plugin for GoHighLevel

A custom payment integration plugin that enables BayarCash payment processing within the GoHighLevel (GHL) platform. This plugin allows GHL users to accept payments through BayarCash with support for both Live and Test modes.

## 🌟 Features

- **Dual Mode Support**: Seamlessly switch between Live and Test BayarCash environments
- **OAuth Integration**: Secure authentication with GoHighLevel
- **Custom Payment Provider**: Fully integrated as a GHL custom payment provider
- **Real-time Configuration**: Easy setup through GHL marketplace interface
- **Webhook Support**: Automatic payment status updates
- **Multi-location Support**: Manage different BayarCash credentials per GHL location

## 📋 Prerequisites

- Node.js (v16 or higher)
- MySQL (v5.7 or higher)
- GoHighLevel Developer Account
- BayarCash Account (with API credentials)

## � Quick Start

### 1. Database Setup

```bash
# Login to MySQL
mysql -u root -p

# Create database and import schema
mysql -u root -p < backend/database.sql
```

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Configure environment variables
# Create a .env file with your credentials (see Configuration section)

# Start the server
npm start
```

The backend will run on `http://localhost:3000`

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The frontend will run on `http://localhost:5173`

## ⚙️ Configuration

### Backend Environment Variables

Create a `.env` file in the `backend` directory:

```env
# GHL OAuth Credentials
CLIENT_ID=your_ghl_client_id
CLIENT_SECRET=your_ghl_client_secret
REDIRECT_URI=http://localhost:3000/oauth/callback

# Frontend URL
FRONTEND_URL=http://localhost:5173

# Backend URL (for GHL callbacks)
BACKEND_URL=http://localhost:3000

# Server Configuration
PORT=3000

# MySQL Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=ghl_billplz

# GHL OAuth Endpoint
GHL_TOKEN_URL=https://services.leadconnectorhq.com/oauth/token
```

### BayarCash Configuration

After installation, configure your BayarCash credentials through the GHL marketplace:

1. **Personal Access Token (PAT)**: Your BayarCash API token
2. **API Secret Key**: Your BayarCash secret key
3. **Mode Selection**: Choose between Live or Test environment

## 📁 Project Structure

```
bayarcash-plugin/
├── backend/
│   ├── server.js              # Express server with OAuth & API endpoints
│   ├── database.sql           # MySQL schema
│   ├── package.json
│   └── .env                   # Environment configuration
└── frontend/
    ├── src/
    │   ├── App.jsx            # Main app with routing
    │   ├── main.jsx           # React entry point
    │   ├── index.css          # Global styles
    │   └── pages/
    │       ├── Landing.jsx    # Landing page with OAuth login
    │       ├── Settings.jsx   # BayarCash configuration page
    │       └── InstallFailed.jsx  # Error page
    ├── index.html
    ├── package.json
    ├── tailwind.config.js
    ├── postcss.config.js
    └── vite.config.js
```

## 🔄 How It Works

### OAuth Flow

1. User installs the plugin from GHL Marketplace
2. OAuth authorization redirects to GHL login
3. User authorizes the application
4. Backend receives authorization code and exchanges for access tokens
5. Backend stores tokens and location data in MySQL
6. Backend automatically registers BayarCash as a custom payment provider
7. User is redirected to configuration page

### Payment Flow

1. User creates an invoice/order in GHL
2. Customer selects BayarCash as payment method
3. Plugin creates payment intent via BayarCash API
4. Customer completes payment on BayarCash checkout page
5. BayarCash sends webhook notification
6. Plugin updates payment status in GHL

## 🎨 API Endpoints

### OAuth
- `GET /oauth/callback` - Handle GHL OAuth callback and token exchange

### Payment Provider Integration
- `POST /payments/custom-provider/connect` - Receive BayarCash configuration from GHL
- `DELETE /payments/custom-provider/disconnect` - Handle provider disconnection

### Settings
- `GET /api/settings/:location_id` - Get BayarCash configuration for a location
- `POST /api/settings` - Save BayarCash configuration

### Payments
- `POST /api/create-payment-link` - Create a BayarCash payment link

### Webhooks
- `POST /webhook/uninstall` - Handle app uninstallation

### Health
- `GET /health` - Server health check

## 🗄️ Database Schema

The plugin uses a MySQL database to store:
- GHL OAuth tokens (access_token, refresh_token)
- Location metadata (location_id, company_id, user_id)
- BayarCash credentials (API keys for Live and Test modes)
- Provider configuration

## 🧪 Testing

### Test OAuth Flow
1. Navigate to `http://localhost:5173`
2. Click "Login with GoHighLevel"
3. Complete OAuth authorization
4. Verify redirect to settings page
5. Check MySQL database for stored tokens

### Test Payment Integration
1. Configure BayarCash credentials in Test mode
2. Create a test invoice in GHL
3. Select BayarCash as payment method
4. Complete test payment
5. Verify payment status updates in GHL

## 🚨 Troubleshooting

### OAuth Callback Fails
- Verify `REDIRECT_URI` matches GHL app settings
- Check `CLIENT_ID` and `CLIENT_SECRET` are correct
- Ensure backend server is running on correct port

### Database Connection Error
- Verify MySQL is running
- Check database credentials in `.env`
- Ensure database exists and schema is imported

### Payment Creation Fails
- Verify BayarCash API credentials are correct
- Check if using correct mode (Live vs Test)
- Review backend logs for API error messages

## 📝 License

MIT

## 👨‍💻 Support

For issues and questions, please open an issue on GitHub.

---

Built with ❤️ for GoHighLevel Marketplace
