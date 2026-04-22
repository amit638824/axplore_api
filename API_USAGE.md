# API Usage Guide - Login Endpoint

## Login API

### Endpoint
```
POST /api/auth/login
```

### Base URL
```
http://localhost:4000/api/auth/login
```
(Change `localhost:4000` to your server URL in production)

---

## Request Details

### Headers
```
Content-Type: application/json
```

### Request Body (JSON)

**Required Fields:**
- `email` (string, required) - User's email address
- `password` (string, required) - User's password

**Optional Fields:**
- `deviceId` (string, optional) - Unique device identifier (auto-generated if not provided)
- `deviceType` (string, optional) - One of: `'web'`, `'mobile'`, `'tablet'` (defaults to `'web'`)
- `deviceName` (string, optional) - Device name/description (defaults to User-Agent)
- `appVersion` (string, optional) - Application version

### Example Request Body

**Minimal Request (only required fields):**
```json
{
  "email": "sujeet@gmail.com",
  "password": "skysk@123"
}
```

**Full Request (with optional fields):**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "deviceId": "device-12345",
  "deviceType": "web",
  "deviceName": "Chrome Browser",
  "appVersion": "1.0.0"
}
```

---

## Response

### Success Response (200 OK)

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Note**: Login API now returns only the token. Use `/api/auth/user_info` endpoint to get full user information with menus.

### Error Responses

#### 400 Bad Request - Validation Error
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Please provide a valid email address"
    }
  ]
}
```

#### 401 Unauthorized - Invalid Credentials
```json
{
  "success": false,
  "message": "Invalid email or password"
}
```

#### 401 Unauthorized - Account Locked
```json
{
  "success": false,
  "message": "Account is locked. Please contact administrator."
}
```

#### 429 Too Many Requests - Rate Limit
```json
{
  "success": false,
  "message": "Too many authentication attempts, please try again later."
}
```

---

## Usage Examples

### 1. Using cURL

```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "sujeet@gmail.com",
    "password": "skysk@123"
  }'
```

### 2. Using JavaScript (Fetch API)

```javascript
async function login(email, password) {
  try {
    const response = await fetch('http://localhost:4000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email,
        password: password
      })
    });

    const data = await response.json();

    if (data.success) {
      // Store token for future requests
      localStorage.setItem('token', data.data.token);
      localStorage.setItem('sessionId', data.data.sessionId);
      console.log('Login successful:', data.data.user);
      return data.data;
    } else {
      console.error('Login failed:', data.message);
      throw new Error(data.message);
    }
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}

// Usage
login('sujeet@gmail.com', 'skysk@123')
  .then(userData => {
    console.log('Logged in as:', userData.user.email);
  })
  .catch(error => {
    console.error('Login error:', error);
  });
```

### 3. Using Axios

```javascript
const axios = require('axios');

async function login(email, password) {
  try {
    const response = await axios.post('http://localhost:4000/api/auth/login', {
      email: email,
      password: password
    });

    if (response.data.success) {
      // Store token
      const token = response.data.data.token;
      const sessionId = response.data.data.sessionId;
      
      // Set default authorization header for future requests
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      return response.data.data;
    }
  } catch (error) {
    if (error.response) {
      // Server responded with error
      console.error('Login error:', error.response.data.message);
    } else {
      // Request failed
      console.error('Network error:', error.message);
    }
    throw error;
  }
}

// Usage
login('sujeet@gmail.com', 'skysk@123');
```

### 4. Using Postman

1. **Method**: Select `POST`
2. **URL**: `http://localhost:4000/api/auth/login`
3. **Headers**: 
   - Key: `Content-Type`, Value: `application/json`
4. **Body**: Select `raw` and `JSON`, then paste:
   ```json
   {
     "email": "sujeet@gmail.com",
     "password": "skysk@123"
   }
   ```
5. Click **Send**

### 5. Using Python (requests)

```python
import requests

def login(email, password):
    url = "http://localhost:4000/api/auth/login"
    headers = {
        "Content-Type": "application/json"
    }
    data = {
        "email": email,
        "password": password
    }
    
    try:
        response = requests.post(url, json=data, headers=headers)
        response.raise_for_status()
        
        result = response.json()
        if result.get('success'):
            token = result['data']['token']
            session_id = result['data']['sessionId']
            print(f"Login successful! Token: {token[:20]}...")
            return result['data']
        else:
            print(f"Login failed: {result.get('message')}")
            return None
    except requests.exceptions.RequestException as e:
        print(f"Error: {e}")
        return None

# Usage
user_data = login('sujeet@gmail.com', 'skysk@123')
```

---

## Using the Token for Authenticated Requests

After successful login, use the token in subsequent API requests:

### Header Format
```
Authorization: Bearer <your-jwt-token>
```

### Example: Get User Profile

```javascript
// Using fetch
const token = localStorage.getItem('token');

fetch('http://localhost:4000/api/auth/profile', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
})
  .then(response => response.json())
  .then(data => console.log(data));
```

```bash
# Using cURL
curl -X GET http://localhost:4000/api/auth/profile \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json"
```

---

## Security Notes

1. **Rate Limiting**: Login endpoint has rate limiting (5 attempts per 15 minutes per IP)
2. **Account Locking**: Account locks after 5 failed login attempts
3. **Token Expiry**: JWT tokens expire after 7 days (configurable)
4. **HTTPS**: Always use HTTPS in production
5. **Token Storage**: Store tokens securely (httpOnly cookies recommended for web)

---

## Common Issues & Solutions

### Issue: "Email is required"
**Solution**: Ensure `email` field is included in request body

### Issue: "Device ID is required"
**Solution**: Device ID is now optional and will be auto-generated if not provided

### Issue: "Invalid email or password"
**Solution**: 
- Verify email and password are correct
- Check if account is locked (too many failed attempts)
- Ensure user exists and is active

### Issue: "Account is locked"
**Solution**: Contact administrator to unlock account

### Issue: "Too many authentication attempts"
**Solution**: Wait 15 minutes before trying again

### Issue: CORS Error
**Solution**: Ensure server CORS is configured to allow your origin

---

## Testing with Sample Data

If you need to test but don't have a user account, you can:

1. **Register a new user** using `/api/auth/register`
2. **Or** create a user directly in the database

Example registration request:
```json
POST /api/auth/register
{
  "travelAgencyId": "uuid-here",
  "branchId": "uuid-here",
  "designationId": "uuid-here",
  "firstName": "Test",
  "lastName": "User",
  "email": "test@example.com",
  "password": "Test123!@#",
  "mobile": "1234567890"
}
```

---

## User Info API

After login, get complete user information including menus and submenus:

### Endpoint
```
GET /api/auth/user_info
```

### Headers
```
Authorization: Bearer <your-token>
Content-Type: application/json
```

### Response (200 OK)

```json
{
  "success": true,
  "message": "User information retrieved successfully",
  "data": {
    "userId": "uuid-here",
    "email": "sujeet@gmail.com",
    "firstName": "Sujeet",
    "lastName": "Kumar",
    "mobile": "1234567890",
    "employeeCode": "EMP001",
    "isActive": true,
    "travelAgency": {
      "travelAgencyId": "uuid-here",
      "name": "Travel Agency Name",
      "email": "agency@example.com",
      "phone": "1234567890",
      "websiteUrl": "https://example.com"
    },
    "branch": {
      "branchId": "uuid-here",
      "branchName": "Main Branch",
      "branchCode": "BR001",
      "phone": "1234567890",
      "email": "branch@example.com",
      "city": {
        "cityId": "uuid-here",
        "name": "Mumbai"
      },
      "state": {
        "stateId": "uuid-here",
        "name": "Maharashtra"
      },
      "country": {
        "countryId": "uuid-here",
        "name": "India"
      }
    },
    "designation": {
      "designationId": "uuid-here",
      "designationCode": "MGR",
      "designationName": "Manager"
    },
    "roles": [
      {
        "roleId": "uuid-here",
        "roleCode": "ADMIN",
        "roleName": "Administrator",
        "description": "Full access"
      }
    ],
    "menus": [
      {
        "menuId": "uuid-here",
        "menuCode": "DASHBOARD",
        "menuName": "Dashboard",
        "displayOrder": 1,
        "icon": "dashboard",
        "subMenus": [
          {
            "subMenuId": "uuid-here",
            "subMenuCode": "DASHBOARD_VIEW",
            "subMenuName": "View Dashboard",
            "routePath": "/dashboard",
            "displayOrder": 1,
            "permissions": [
              {
                "permissionId": "uuid-here",
                "permissionCode": "VIEW",
                "permissionName": "View",
                "description": "View dashboard"
              }
            ]
          }
        ]
      }
    ],
    "permissions": [
      "VIEW",
      "CREATE",
      "EDIT",
      "DELETE"
    ]
  }
}
```

### Example Usage

```javascript
// After login, get user info
const token = loginResponse.data.token;

fetch('http://localhost:4000/api/auth/user_info', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
})
  .then(res => res.json())
  .then(data => {
    console.log('User info:', data.data);
    console.log('Menus:', data.data.menus);
    console.log('Permissions:', data.data.permissions);
  });
```

```bash
# Using cURL
curl -X GET http://localhost:4000/api/auth/user_info \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json"
```

## Logout API

Logout the current session or all sessions for a user.

### Endpoint
```
POST /api/auth/logout
```

### Headers
```
Authorization: Bearer <your-token>
Content-Type: application/json
```

### Query Parameters (Optional)
- `logoutAll=true` - Logout all active sessions for the user

### Optional Headers
- `X-Session-Id` - Specific session ID to logout (optional)
- `X-Device-Id` - Device ID to help identify the session (optional)

### Request Examples

**Logout Current Session:**
```bash
curl -X POST http://localhost:4000/api/auth/logout \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json"
```

**Logout All Sessions:**
```bash
curl -X POST "http://localhost:4000/api/auth/logout?logoutAll=true" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json"
```

**Logout Specific Session:**
```bash
curl -X POST http://localhost:4000/api/auth/logout \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "X-Session-Id: session-uuid-here" \
  -H "Content-Type: application/json"
```

### Response (200 OK)

```json
{
  "success": true,
  "message": "Logged out successfully",
  "data": null
}
```

Or for logout all:
```json
{
  "success": true,
  "message": "All sessions logged out successfully",
  "data": null
}
```

### JavaScript Example

```javascript
// Logout current session
async function logout(token) {
  const response = await fetch('http://localhost:4000/api/auth/logout', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  
  const data = await response.json();
  console.log(data.message); // "Logged out successfully"
  return data;
}

// Logout all sessions
async function logoutAll(token) {
  const response = await fetch('http://localhost:4000/api/auth/logout?logoutAll=true', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  
  const data = await response.json();
  console.log(data.message); // "All sessions logged out successfully"
  return data;
}

// Usage
const token = localStorage.getItem('token');
await logout(token);
// Clear token from storage
localStorage.removeItem('token');
```

### How It Works

1. **Token Invalidation**: 
   - After logout, all active sessions are marked as inactive
   - The authentication middleware checks for active sessions before allowing access
   - **Tokens become invalid immediately after logout** - no need to remember or store them
   - If no active session exists, the token will be rejected even if it's not expired

2. **Current Session Logout**: 
   - If `X-Session-Id` header is provided, logs out that specific session
   - Otherwise, finds the most recent active session for the user (matching by device ID or IP if available)
   - If no matching session found, logs out all active sessions

3. **Logout All Sessions**:
   - When `logoutAll=true` query parameter is provided, logs out all active sessions for the user
   - Useful for security when user suspects unauthorized access
   - **All tokens become invalid immediately**

4. **Session Tracking**:
   - Sessions are tracked in the `app_user_login_session` table
   - Each login creates a new session record
   - Logout marks sessions as inactive and sets logout timestamp
   - Authentication middleware verifies active session on every request
   - **No need to remember tokens** - they're automatically invalidated after logout

## Next Steps After Login

1. **Store the token** securely
2. **Call `/api/auth/user_info`** to get user information with menus
3. **Include token** in all authenticated requests
4. **Handle token expiry** (implement refresh or re-login)
5. **Call `/api/auth/logout`** when user logs out

Example flow:
```javascript
// 1. Login
const loginResponse = await login('sujeet@gmail.com', 'skysk@123');
const token = loginResponse.data.token;
localStorage.setItem('token', token);

// 2. Get user info with menus
const userInfoResponse = await fetch('/api/auth/user_info', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
const userInfo = await userInfoResponse.json();

// 3. Use in subsequent requests
fetch('/api/leads', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

// 4. Logout when done
await logout(token);
localStorage.removeItem('token');
```
