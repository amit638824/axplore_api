# Error Handling Guide

## "Field Already Exists" Error

This error occurs when trying to create a record with a value that violates a unique constraint in the database.

### Error Response Format

```json
{
  "success": false,
  "message": "Email already exists. Please use a different value.",
  "field": "email"
}
```

### Common Fields That May Cause This Error

1. **Email** - When registering a user with an email that already exists
2. **Mobile** - When mobile number already exists
3. **Employee Code** - When employee code already exists for a travel agency
4. **Corporate Code** - When corporate code already exists
5. **Branch Code** - When branch code already exists
6. **Role Code** - When role code already exists
7. **Permission Code** - When permission code already exists
8. **Menu Code** - When menu code already exists
9. **Sub Menu Code** - When sub menu code already exists
10. **Hub Code** - When pickup hub code already exists
11. **Designation Code** - When designation code already exists
12. **Segment Code** - When lead segment code already exists
13. **Status Code** - When lead status code already exists
14. **Category Code** - When service category code already exists
15. **Service Type Code** - When service type code already exists
16. **Level Code** - When service level code already exists

### How to Handle This Error

#### In Frontend/Client Code

```javascript
try {
  const response = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData)
  });
  
  const data = await response.json();
  
  if (!data.success) {
    if (data.message.includes('already exists')) {
      // Handle duplicate field error
      const field = data.field || 'field';
      alert(`${field} is already taken. Please use a different value.`);
    } else {
      alert(data.message);
    }
  }
} catch (error) {
  console.error('Error:', error);
}
```

#### Example: Handling Email Already Exists

```javascript
async function registerUser(userData) {
  try {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    
    const result = await response.json();
    
    if (!result.success) {
      if (result.field === 'email') {
        // Show email-specific error message
        showError('This email is already registered. Please use a different email or try logging in.');
      } else if (result.field === 'employee_code') {
        showError('Employee code already exists for this travel agency.');
      } else {
        showError(result.message);
      }
      return null;
    }
    
    return result.data;
  } catch (error) {
    console.error('Registration error:', error);
    showError('An error occurred during registration. Please try again.');
    return null;
  }
}
```

### Prevention Tips

1. **Check Before Creating**: Always validate uniqueness before attempting to create a record
2. **Show Clear Messages**: Display user-friendly error messages that indicate which field has the conflict
3. **Provide Alternatives**: Suggest alternative values when possible
4. **Handle Gracefully**: Don't show technical database errors to end users

### Error Codes

- **409 Conflict**: Field already exists (unique constraint violation)
- **400 Bad Request**: Invalid reference to related record (foreign key constraint)
- **404 Not Found**: Record not found

### Prisma Error Codes

- **P2002**: Unique constraint violation (field already exists)
- **P2003**: Foreign key constraint violation
- **P2025**: Record not found

### Best Practices

1. **Validate Early**: Check for duplicates before attempting database operations
2. **User-Friendly Messages**: Convert technical field names to user-friendly labels
3. **Field-Specific Handling**: Handle each unique field appropriately
4. **Error Recovery**: Provide clear guidance on how to fix the issue

### Example: Complete Error Handling

```javascript
function handleApiError(error, response) {
  if (!response || !response.success) {
    const message = response?.message || 'An error occurred';
    const field = response?.field;
    
    switch (response?.code || '') {
      case 'P2002': // Unique constraint
        if (field === 'email') {
          return 'This email is already registered. Please use a different email.';
        } else if (field === 'mobile') {
          return 'This mobile number is already registered.';
        } else {
          return `${field} already exists. Please use a different value.`;
        }
      
      case 'P2003': // Foreign key constraint
        return 'Invalid reference. Please check your input.';
      
      case 'P2025': // Not found
        return 'The requested record was not found.';
      
      default:
        return message;
    }
  }
  
  return 'An unexpected error occurred. Please try again.';
}
```

### Testing for Duplicate Fields

Before creating a record, you can check if a value already exists:

```javascript
// Check if email exists
async function checkEmailExists(email) {
  const response = await fetch(`/api/users/check-email?email=${email}`);
  const data = await response.json();
  return data.exists;
}

// Use before registration
const emailExists = await checkEmailExists(userData.email);
if (emailExists) {
  showError('Email already registered');
  return;
}
```

---

## Other Common Errors

### Validation Errors (400)

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

### Authentication Errors (401)

```json
{
  "success": false,
  "message": "Invalid email or password"
}
```

### Authorization Errors (403)

```json
{
  "success": false,
  "message": "You do not have permission to perform this action"
}
```

### Not Found Errors (404)

```json
{
  "success": false,
  "message": "Record not found"
}
```

---

## Debugging Tips

1. **Check Error Response**: Always log the full error response to see field and code
2. **Verify Database Constraints**: Check your Prisma schema for unique constraints
3. **Test with Different Values**: Try with unique values to confirm the issue
4. **Check Case Sensitivity**: Some fields may be case-sensitive
5. **Verify Data Format**: Ensure data matches expected format (e.g., email format)
