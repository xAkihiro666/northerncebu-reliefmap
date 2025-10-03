# Create Admin User - Step by Step Guide

## 🔐 Admin Credentials
- **Email**: charleszoiyana@gmail.com
- **Password**: zoilo14344

## 📋 Setup Steps

### Method 1: Using Firebase Console (Recommended - 2 minutes)

#### Step 1: Go to Firebase Console
1. Open browser and go to: https://console.firebase.google.com
2. Login with your Google account
3. Select project: **northern-cebu-relief-public**

#### Step 2: Enable Email/Password Authentication
1. Click **Authentication** in left sidebar
2. Click **Get Started** (if first time)
3. Go to **Sign-in method** tab
4. Click on **Email/Password** provider
5. Toggle **Enable** to ON
6. Click **Save**

#### Step 3: Create Admin User
1. Go to **Users** tab in Authentication
2. Click **Add User** button
3. Enter email: `charleszoiyana@gmail.com`
4. Enter password: `zoilo14344`
5. Click **Add User**

✅ **Done!** You can now login to the admin panel.

---

### Method 2: Using Firebase CLI (Advanced)

#### Prerequisites
```bash
# Install Node.js if not installed
# Download from: https://nodejs.org

# Install Firebase CLI
npm install -g firebase-tools
```

#### Steps
```bash
# 1. Login to Firebase
firebase login

# 2. Select your project
firebase use northern-cebu-relief-public

# 3. Create admin user using Firebase Auth REST API
# (See script below)
```

---

### Method 3: Using REST API (Automated)

Create a file `create-admin.js`:

```javascript
const https = require('https');

const API_KEY = 'AIzaSyBsjSzG7OP76PIYr40SY6H8CoXoOPQ5Xck';
const email = 'charleszoiyana@gmail.com';
const password = 'zoilo14344';

const data = JSON.stringify({
  email: email,
  password: password,
  returnSecureToken: true
});

const options = {
  hostname: 'identitytoolkit.googleapis.com',
  path: `/v1/accounts:signUp?key=${API_KEY}`,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = https.request(options, (res) => {
  let body = '';
  
  res.on('data', (chunk) => {
    body += chunk;
  });
  
  res.on('end', () => {
    if (res.statusCode === 200) {
      console.log('✅ Admin user created successfully!');
      console.log('Email:', email);
      console.log('You can now login to admin.html');
    } else {
      console.log('❌ Error creating user:', body);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Request failed:', error);
});

req.write(data);
req.end();
```

Run it:
```bash
node create-admin.js
```

---

## 🔒 Update Firestore Security Rules

After creating the admin user, update your Firestore rules to allow authenticated users to delete:

### Step 1: Go to Firestore Rules
1. Firebase Console → **Firestore Database**
2. Click **Rules** tab

### Step 2: Update Rules
Replace existing rules with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /relief-locations/{document} {
      // Anyone can read (public map)
      allow read: if true;
      
      // Anyone can create (public reporting)
      allow create: if true;
      
      // Only authenticated users can delete (admin only)
      allow delete: if request.auth != null;
      
      // Only authenticated users can update (admin only)
      allow update: if request.auth != null;
    }
  }
}
```

### Step 3: Publish Rules
1. Click **Publish** button
2. Wait for confirmation

---

## ✅ Verify Setup

### Test Login
1. Open `admin.html` in browser
2. Enter email: `charleszoiyana@gmail.com`
3. Enter password: `zoilo14344`
4. Click **Login**
5. Should redirect to dashboard

### Test Delete
1. In dashboard, find a test pin
2. Click trash icon (🗑️)
3. Confirm deletion
4. Pin should be removed from all devices

---

## 🚨 Important Security Notes

### Password Security
⚠️ **IMPORTANT**: The password `zoilo14344` is now documented in this file. Consider:

1. **Change password after first login**:
   - Login to admin panel
   - Use Firebase Console to reset password
   - Or implement password change feature

2. **Use stronger password**:
   - Minimum 12 characters
   - Mix of uppercase, lowercase, numbers, symbols
   - Example: `Cebu@Relief2025!Admin`

3. **Enable 2FA** (if available):
   - Firebase Console → Authentication → Settings
   - Enable multi-factor authentication

### Access Control
- ✅ Only share admin credentials with trusted team members
- ✅ Create separate admin accounts for each person
- ✅ Regularly review admin users in Firebase Console
- ✅ Remove access for users who no longer need it

### Monitoring
- ✅ Monitor Firebase Authentication logs
- ✅ Check Firestore usage regularly
- ✅ Set up alerts for unusual activity
- ✅ Review deleted pins periodically

---

## 🔄 Add More Admin Users

To add additional administrators:

### Firebase Console Method
1. Go to Authentication → Users
2. Click **Add User**
3. Enter new admin email
4. Enter strong password
5. Click **Add User**

### Recommended Admin Emails
- Primary: charleszoiyana@gmail.com ✅
- Backup: [backup-admin@example.com]
- Team Lead: [teamlead@example.com]
- Emergency: [emergency@example.com]

---

## 📱 Quick Access

### Admin Panel URL
- Local: `file:///c:/MobileApps/Webmap/admin.html`
- Production: `https://your-domain.com/admin.html`

### Bookmark This
Add to browser bookmarks for quick access:
- Name: "Relief Map Admin"
- URL: [your admin panel URL]

---

## 🆘 Troubleshooting

### "Email already exists" error
**Solution**: User already created. Try logging in directly.

### "Invalid email" error
**Solution**: Check email format. Must be valid email address.

### "Weak password" error
**Solution**: Firebase requires minimum 6 characters. Current password is fine.

### Can't login after creating user
**Solutions**:
1. Wait 1-2 minutes for Firebase to sync
2. Check email spelling (no typos)
3. Verify Authentication is enabled
4. Check browser console for errors

### Can't delete pins
**Solutions**:
1. Verify you're logged in (check user email in header)
2. Check Firestore rules allow delete for authenticated users
3. Verify internet connection
4. Check Firebase Console for errors

---

## ✅ Setup Checklist

- [ ] Firebase Authentication enabled
- [ ] Email/Password sign-in method enabled
- [ ] Admin user created (charleszoiyana@gmail.com)
- [ ] Firestore security rules updated
- [ ] Rules published
- [ ] Test login successful
- [ ] Test delete successful
- [ ] Password changed to stronger one (recommended)
- [ ] Backup admin created (recommended)
- [ ] Team members trained

---

## 🎯 Next Steps

1. ✅ Create admin user (follow steps above)
2. ✅ Test login to admin.html
3. ✅ Try deleting a test pin
4. ✅ Verify real-time sync works
5. ✅ Change password to stronger one
6. ✅ Create backup admin account
7. ✅ Train team members
8. ✅ Start managing relief map!

---

**Status**: Ready to create admin user  
**Estimated Time**: 2-5 minutes  
**Difficulty**: Easy  

**Let's get started! 🚀**
