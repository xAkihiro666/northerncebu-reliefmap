# Admin Panel Setup Guide

## Overview
The admin panel allows you to manage and delete unwanted pins from the Northern Cebu Relief Map. It includes Firebase Authentication for secure access.

## Features
✅ **Secure Login** - Email/password authentication via Firebase  
✅ **Real-time Dashboard** - Live statistics and pin counts  
✅ **Advanced Filtering** - Search and filter by urgency, source, reporter  
✅ **Detailed View** - View complete information for each pin  
✅ **Bulk Management** - Sort and manage multiple pins efficiently  
✅ **Delete Functionality** - Remove unwanted or spam pins  
✅ **Responsive Design** - Works on desktop, tablet, and mobile  

## Firebase Authentication Setup

### Step 1: Enable Email/Password Authentication

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project: **northern-cebu-relief-public**
3. Click **Authentication** in the left sidebar
4. Click **Get Started** (if first time)
5. Go to **Sign-in method** tab
6. Click on **Email/Password**
7. Toggle **Enable** to ON
8. Click **Save**

### Step 2: Create Admin User

You have two options to create an admin account:

#### Option A: Using Firebase Console (Recommended)

1. In Firebase Console, go to **Authentication** → **Users** tab
2. Click **Add User**
3. Enter your admin email (e.g., `admin@yourproject.com`)
4. Enter a strong password
5. Click **Add User**

#### Option B: Using Firebase CLI

```bash
# Install Firebase CLI if not already installed
npm install -g firebase-tools

# Login to Firebase
firebase login

# Create admin user (replace with your details)
firebase auth:import admin-users.json --project northern-cebu-relief-public
```

Create `admin-users.json`:
```json
{
  "users": [{
    "email": "admin@yourproject.com",
    "passwordHash": "your-hashed-password",
    "emailVerified": true
  }]
}
```

### Step 3: Security Rules (Optional but Recommended)

To restrict deletion to authenticated users only, update your Firestore rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /relief-locations/{document} {
      // Anyone can read
      allow read: if true;
      
      // Anyone can create (for public reporting)
      allow create: if true;
      
      // Only authenticated users can delete (admins)
      allow delete: if request.auth != null;
      
      // Only authenticated users can update
      allow update: if request.auth != null;
    }
  }
}
```

To apply these rules:
1. Go to **Firestore Database** → **Rules** tab
2. Replace the existing rules with the above
3. Click **Publish**

## Using the Admin Panel

### Accessing the Admin Panel

1. Open your browser and navigate to: `admin.html`
2. Or click the **Admin Panel** button in the main map navigation

### Logging In

1. Enter your admin email address
2. Enter your password
3. Click **Login**

**Default credentials**: Use the email/password you created in Step 2

### Dashboard Features

#### Statistics Cards
- **Critical Reports** - Number of pins marked as critical urgency
- **Urgent Reports** - Number of pins marked as urgent
- **Moderate Reports** - Number of pins marked as moderate
- **Total Locations** - Total number of reported pins

#### Search and Filter
- **Search Box** - Search by location name, source, reporter name, or relief needs
- **Urgency Filter** - Filter by critical, urgent, moderate, or all
- **Sort Options** - Sort by date (newest/oldest), urgency level, or location name

#### Pin Management Table
Each row shows:
- Location name and coordinates
- Urgency level (color-coded badge)
- Source (Facebook, Twitter, etc.)
- Relief needs
- Reporter information
- Date reported
- Action buttons (View Details, Delete)

### Viewing Pin Details

1. Click the **eye icon** (👁️) in the Actions column
2. View complete information including:
   - Full location details
   - All relief needs
   - Reporter contact information
   - Database IDs
3. Click **View on Map** to see the pin on the main map
4. Click **Close** to return to the dashboard

### Deleting Pins

1. Click the **trash icon** (🗑️) in the Actions column
2. Review the pin information in the confirmation dialog
3. Click **Delete Pin** to confirm
4. The pin will be removed from all devices immediately

**Note**: Deletion is permanent and cannot be undone!

### Logging Out

Click the **Logout** button in the top-right corner to sign out securely.

## Troubleshooting

### "Login failed" Error
- **Check credentials**: Ensure email and password are correct
- **Check Firebase**: Verify Email/Password authentication is enabled
- **Check internet**: Ensure you have an active internet connection

### "Failed to load locations"
- **Check Firestore**: Ensure Firestore database is set up correctly
- **Check rules**: Verify Firestore security rules allow read access
- **Check internet**: Ensure stable internet connection

### Pins not appearing
- **Check collection name**: Ensure collection is named `relief-locations`
- **Check data structure**: Verify pins have required fields
- **Refresh**: Click the Refresh button to reload data

### Cannot delete pins
- **Check authentication**: Ensure you're logged in
- **Check rules**: Verify Firestore rules allow delete for authenticated users
- **Check permissions**: Ensure your Firebase project has proper permissions

## Security Best Practices

1. **Strong Passwords**: Use strong, unique passwords for admin accounts
2. **Limited Access**: Only share admin credentials with trusted team members
3. **Regular Audits**: Periodically review deleted pins and admin activity
4. **Firestore Rules**: Keep security rules updated and restrictive
5. **HTTPS Only**: Always access admin panel over HTTPS in production

## Multiple Admin Users

To add more admin users:

1. Go to Firebase Console → Authentication → Users
2. Click **Add User**
3. Enter the new admin's email and password
4. Share credentials securely (use password manager or secure channel)

## Production Deployment

When deploying to production:

1. **Enable HTTPS**: Ensure your domain uses SSL/TLS
2. **Update Firebase Config**: Use production Firebase project
3. **Restrict Access**: Consider IP whitelisting for admin panel
4. **Monitor Usage**: Set up Firebase monitoring and alerts
5. **Backup Data**: Regularly export Firestore data for backups

## Support

For issues or questions:
- Check Firebase Console for error logs
- Review browser console for JavaScript errors
- Verify all setup steps were completed correctly
- Ensure Firebase project has sufficient quota (free tier limits)

## File Structure

```
Webmap/
├── admin.html          # Admin panel HTML
├── admin.js            # Admin panel JavaScript
├── admin-styles.css    # Admin panel CSS
├── index.html          # Main map page
├── script_clean.js     # Main map JavaScript
├── styles.css          # Main map CSS
├── firebase-config.js  # Firebase configuration
└── ADMIN_SETUP.md      # This file
```

## Next Steps

1. ✅ Complete Firebase Authentication setup
2. ✅ Create your first admin user
3. ✅ Test login functionality
4. ✅ Try deleting a test pin
5. ✅ Configure security rules for production
6. ✅ Share admin access with your team

---

**Admin Panel Version**: 1.0  
**Last Updated**: 2025-10-03  
**Compatible with**: Firebase SDK 10.7.0+
