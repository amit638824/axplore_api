# Debugging Guide - "Field Already Exists" Error

## How to Identify Which Field is Causing the Error

### 1. Check the Error Response

The error response includes the field name:

```json
{
  "success": false,
  "message": "Email already exists. Please use a different value.",
  "field": "email",
  "code": "P2002"
}
```

### 2. Check Server Logs

When this error occurs, the server logs will show:

```
Prisma Unique Constraint Error: {
  code: 'P2002',
  field: 'email',
  target: ['email'],
  model: 'AppUser',
  ...
}
```

### 3. Common Scenarios

#### Registration (POST /api/auth/register)
- **Email**: If email already exists in `app_user` table
- **Employee Code**: If employee code already exists for the same travel agency

#### Creating Leads
- Check for unique constraints on lead-related fields

#### Creating Master Data
- **Corporate Code**: If corporate code already exists
- **Branch Code**: If branch code already exists
- **Role Code**: If role code already exists
- **Permission Code**: If permission code already exists
- **Menu Code**: If menu code already exists
- **Sub Menu Code**: If sub menu code already exists
- **Hub Code**: If pickup hub code already exists
- **Designation Code**: If designation code already exists
- **Segment Code**: If lead segment code already exists
- **Status Code**: If lead status code already exists
- **Category Code**: If service category code already exists
- **Service Type Code**: If service type code already exists
- **Level Code**: If service level code already exists

### 4. Check Database Constraints

Run this query to see all unique constraints:

```sql
SELECT 
    tc.table_name, 
    kcu.column_name, 
    tc.constraint_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
WHERE tc.constraint_type = 'UNIQUE'
ORDER BY tc.table_name, kcu.column_name;
```

### 5. Check Prisma Schema

Look for `@unique` annotations in `prisma/schema.prisma`:

```prisma
model AppUser {
  email String? @unique
  // ...
}
```

### 6. Debug Steps

1. **Check the error response** - Look for `field` property
2. **Check server console** - Look for detailed Prisma error logs
3. **Check the request body** - Verify what data you're sending
4. **Check database** - Query the table to see if the value already exists
5. **Check unique constraints** - Verify database constraints match your expectations

### 7. Example Debugging

```javascript
// In your frontend code
try {
  const response = await fetch('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(userData)
  });
  
  const data = await response.json();
  
  if (!data.success) {
    console.error('Error Details:', {
      message: data.message,
      field: data.field,      // This tells you which field
      model: data.model,       // This tells you which table
      code: data.code,         // P2002 = unique constraint
      meta: data.meta          // Full Prisma error details
    });
    
    // Handle based on field
    if (data.field === 'email') {
      alert('Email already registered');
    } else if (data.field === 'employee_code') {
      alert('Employee code already exists');
    }
  }
} catch (error) {
  console.error('Request failed:', error);
}
```

### 8. Quick Fix

If you know which field is causing the issue:

1. **Check if value exists**:
   ```sql
   SELECT * FROM app_user WHERE email = 'user@example.com';
   ```

2. **Use a different value**:
   - Change the email/employee code/etc. to a unique value

3. **Or update existing record**:
   - If you want to update instead of create, use PUT/PATCH endpoint

### 9. Prevention

Before creating a record, check if it exists:

```javascript
// Check email before registration
async function checkEmailExists(email) {
  // You can create a check endpoint or query directly
  const response = await fetch(`/api/users/check-email?email=${email}`);
  return response.json().exists;
}

// Use before registration
const emailExists = await checkEmailExists(userData.email);
if (emailExists) {
  showError('Email already registered');
  return;
}
```

### 10. Common Issues

- **Case Sensitivity**: Some databases are case-sensitive
- **Null Values**: NULL values might not be considered duplicates
- **Composite Unique Constraints**: Multiple fields together form unique constraint
- **Soft Deletes**: Deleted records might still have unique constraints

### 11. Get More Details

Enable development mode to see full error details:

```bash
NODE_ENV=development npm run dev
```

This will show:
- Full error stack
- Prisma meta information
- Request body
- Field and model names
