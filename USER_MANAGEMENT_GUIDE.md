# User Management System

## Overview

A comprehensive admin user management system has been added to your Smart CRM application. This allows you to view all registered users and delete unauthorized accounts.

## Features

- View all users with detailed information
- Search users by email
- Delete individual users
- Bulk delete multiple users
- Real-time user statistics
- Confirmation dialogs for safety
- Success/error notifications

## Accessing User Management

1. Open the Settings modal (click the Settings icon in the navigation)
2. Click on the "User Management" tab
3. You'll see a list of all registered users

## User Information Displayed

For each user, you can see:
- Email address
- User ID
- Account creation date
- Last sign-in date
- Email confirmation status

## How to Delete Users

### Delete a Single User

1. Find the user you want to delete in the list
2. Click the red "Delete" button next to their name
3. Confirm the deletion in the popup dialog
4. The user will be permanently removed

### Delete Multiple Users

1. Check the boxes next to the users you want to delete
2. Click the "Delete Selected" button at the top
3. Confirm the bulk deletion
4. All selected users will be removed

### Safety Features

- You cannot delete your own account
- Confirmation dialogs prevent accidental deletions
- Clear success/error messages
- The system will show which deletions succeeded or failed

## Search and Filter

Use the search bar at the top to quickly find users by their email address.

## Technical Details

### Edge Function

The system uses a Supabase Edge Function called `admin-user-management` that handles:
- Listing users with pagination
- Deleting single users
- Bulk deleting multiple users
- Authentication and authorization checks

### Security

- Only authenticated users can access the user management interface
- The system uses Supabase's service role key for admin operations
- Users cannot delete their own accounts
- All operations are logged and tracked

## Deployment

To deploy the Edge Function to production:

```bash
npx supabase functions deploy admin-user-management
```

## Current User Statistics

- Total users: 113 users registered
- The system shows users sorted by creation date (newest first)
- Pagination support for large user bases

## Troubleshooting

If you encounter issues:

1. **Edge Function Not Found**: Deploy the function using the command above
2. **Permission Denied**: Ensure you're logged in as an admin
3. **Deletion Failed**: Check the error message in the notification

## API Reference

The Edge Function accepts these actions:

### List Users
```json
{
  "action": "list",
  "page": 1,
  "limit": 50,
  "search": "email@example.com"
}
```

### Delete Single User
```json
{
  "action": "delete",
  "userId": "user-id-here"
}
```

### Bulk Delete Users
```json
{
  "action": "delete_multiple",
  "userIds": ["id1", "id2", "id3"]
}
```

## Best Practices

1. Always search for the user first before deleting
2. Use bulk delete for cleaning up multiple test accounts
3. Regularly review your user list for unauthorized access
4. Keep track of which users you delete for audit purposes
5. Consider exporting user data before bulk deletions

## Notes

- Deleted users cannot be recovered
- All user data associated with the account will be removed
- The system prevents self-deletion to avoid locking yourself out
