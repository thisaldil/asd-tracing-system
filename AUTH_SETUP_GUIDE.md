# ASD Tracing System - Authentication Setup Guide

## Overview
This document describes the complete authentication system that has been implemented for the ASD Tracing System.

## Backend Setup

### 1. Install Dependencies
```bash
cd asd-tracing-backend
npm install
```

This will install:
- `bcryptjs` - Password hashing
- `jsonwebtoken` - JWT token generation and verification
- Other existing dependencies

### 2. Environment Variables
Create a `.env` file in the backend root directory:

```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your-secret-key-change-in-production
```

**Important:** Change the `JWT_SECRET` to a secure random string in production.

### 3. Database Models
Three key models have been created/updated:

#### Parent Model (`src/models/Parent.js`)
- Stores parent account information
- Handles password hashing and comparison
- Fields: fullName, email, passwordHash, createdAt

#### ChildProfile Model (`src/models/ChildProfile.js`)
- Updated to reference Parent model via ObjectId
- Previously used String parentId, now uses MongoDB ObjectId

#### CognitiveState & Session Models
- No changes required, existing models work with new auth system

### 4. Backend Routes

#### Auth Routes (`src/routes/authRoutes.js`)
- `POST /api/auth/register` - Register new parent account
- `POST /api/auth/login` - Login parent account
- `POST /api/auth/verify` - Verify JWT token validity

#### Child Routes (`src/routes/childRoutes.js`)
- `POST /api/children` - Create child profile
- `GET /api/children/parent/:parentId` - Get all children for a parent

### 5. Middleware
- JWT authentication middleware in `src/middleware/auth.js`
- Can be used to protect routes: `router.get('/protected', requireAuth, controllerFunction)`

### 6. Start Backend Server
```bash
# Development with hot reload
npm run dev

# Production
npm start
```

## Frontend Setup

### 1. Install Dependencies
```bash
cd asd-tracing-app
npm install
# or
expo install
```

### 2. Update API Base URL
Edit `src/services/apiService.js`:

```javascript
const BASE_URL = 'http://YOUR_LAPTOP_IP:5000/api';
```

Get your IP address:
- Windows: `ipconfig` (look for IPv4 Address)
- Mac/Linux: `ifconfig` or `ip addr show`

### 3. Authentication Flow

#### Login/Register Screens (`src/screens/auth/LoginScreen.js`, `RegisterScreen.js`)
- Parent registers with email and password
- On success, auto-login and navigate to ChildSetup
- On login, check if parent has children:
  - If yes → ChildSelectScreen
  - If no → ChildSetupScreen

#### Child Setup Screen (`src/screens/auth/ChildSetupScreen.js`)
- Parent creates child profiles with:
  - Nickname/Alias (required)
  - Age (3-18)
  - ASD Severity Level (1-3)
  - Verbal Ability (non-verbal, limited, verbal)
- Parent can add multiple children
- Consent is recorded by creating the profile

#### Child Select Screen (`src/screens/auth/ChildSelectScreen.js`)
- Shows all children under parent account as cards
- Parent selects a child to start tracing
- Navigation to TracingGameScreen with selected child

### 4. Context Updates
`src/context/ChildContext.js` now stores:
- `activeChild` - Currently selected child
- `parentProfile` - Logged-in parent information
- `authToken` - JWT token for API requests
- `childrenList` - All children for parent
- `cognitiveState` - Child's cognitive state
- Methods: `selectChild()`, `setParent()`, `setChildren()`, `logout()`

### 5. API Service Updates
`src/services/apiService.js` now includes:

#### Authentication Functions
- `registerParent(fullName, email, password, confirmPassword)` - Register new account
- `loginParent(email, password)` - Login to account
- `verifyToken()` - Verify token validity
- `logoutParent()` - Logout and clear storage

#### JWT Interceptors
- Request interceptor: Automatically adds JWT token to all requests
- Response interceptor: Handles 401 errors by clearing token

#### Child Management
- `createChild(childData)` - Create child profile
- `getParentChildren(parentId)` - Get all children for parent

### 6. Navigation Structure

#### Before Login
```
Auth Stack
├── Login Screen
├── Register Screen
├── Child Setup Screen
└── Child Select Screen
```

#### After Login
```
App Stack
├── Parent Dashboard Screen
└── Tracing Game Screen
```

### 7. Key Features

#### Automatic Token Management
- JWT token stored in AsyncStorage
- Automatically added to all API requests
- Invalid/expired tokens trigger re-login

#### Session Persistence
- Parent login persists across app restarts
- Active child selection persists
- Token validity checked on app launch

#### Hardcoded Test Child Removed
- Previously: `'69e0e39c84040d2901db4b04'`
- Now: Always uses `activeChild._id` from context
- User must select child through auth flow

## Security Considerations

1. **Password Security**
   - Passwords are hashed using bcryptjs with salt rounds of 10
   - Never stored in plain text
   - Never transmitted except over HTTPS (in production)

2. **JWT Token Security**
   - Set a strong `JWT_SECRET` in production
   - Tokens have 30-day expiration
   - Tokens stored in AsyncStorage (secure in production apps)

3. **API Protection**
   - Auth middleware available to protect sensitive endpoints
   - Can be applied to child creation, trial submission, etc.
   - 401 responses clear token and redirect to login

4. **Data Privacy**
   - Child names/aliases never stored with real names (ethics requirement)
   - Consent must be recorded before data collection
   - ParentId associations prevent cross-parent data access

## Troubleshooting

### "Invalid email or password" on login
- Verify email is registered
- Check password is correct
- Ensure MongoDB is running

### "Cannot connect to API"
- Verify backend is running: `http://LAPTOP_IP:5000/health`
- Check BASE_URL in apiService.js matches backend IP
- Ensure both devices are on same network

### "Token expired" errors
- Clear AsyncStorage: Settings → App Data → Clear Cache
- Re-login with credentials
- Token refreshes on each successful request

### New routes not working
- Restart backend server
- Clear app cache if caching middleware is enabled
- Check MongoDB connection

## Testing the Flow

1. **Register** - Create new parent account with email/password
2. **Child Setup** - Add first child profile
3. **Child Select** - See child card and select
4. **Tracing Game** - Start tracing with selected child
5. **Logout** - Parent menu → Logout → Redirects to Login

## Next Steps

1. **Deploy to Production**
   - Set strong JWT_SECRET
   - Use HTTPS for API calls
   - Configure CORS properly

2. **Add Advanced Features**
   - Password reset via email
   - Two-factor authentication
   - Parent dashboard improvements

3. **Protect Endpoints**
   - Add requireAuth middleware to sensitive routes
   - Validate parentId ownership of children
   - Rate limiting for auth endpoints

## Files Created/Modified

### New Files
- `asd-tracing-backend/src/models/Parent.js`
- `asd-tracing-backend/src/controllers/authController.js`
- `asd-tracing-backend/src/routes/authRoutes.js`
- `asd-tracing-backend/src/middleware/auth.js`
- `asd-tracing-app/src/screens/auth/LoginScreen.js`
- `asd-tracing-app/src/screens/auth/RegisterScreen.js`
- `asd-tracing-app/src/screens/auth/ChildSetupScreen.js`
- `asd-tracing-app/src/screens/auth/ChildSelectScreen.js`

### Modified Files
- `asd-tracing-backend/package.json` - Added bcryptjs
- `asd-tracing-backend/server.js` - Added auth routes
- `asd-tracing-backend/src/models/ChildProfile.js` - Changed parentId to ObjectId
- `asd-tracing-app/App.js` - Complete rewrite with auth navigation
- `asd-tracing-app/src/context/ChildContext.js` - Added auth state management
- `asd-tracing-app/src/services/apiService.js` - Added auth functions and interceptors
- `asd-tracing-app/src/screens/TracingGameScreen.js` - Removed hardcoded test child ID
