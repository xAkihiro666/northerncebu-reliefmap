# Admin Panel - Quick Start Guide

## 🚀 Get Started in 3 Steps

### 1️⃣ Enable Firebase Authentication (2 minutes)
```
1. Go to: https://console.firebase.google.com
2. Select project: northern-cebu-relief-public
3. Click: Authentication → Sign-in method
4. Enable: Email/Password
```

### 2️⃣ Create Admin Account (1 minute)
```
1. In Firebase Console: Authentication → Users
2. Click: Add User
3. Email: your-admin@email.com
4. Password: [create strong password]
5. Click: Add User
```

### 3️⃣ Login to Admin Panel
```
1. Open: admin.html in your browser
2. Enter your email and password
3. Click: Login
4. Start managing pins!
```

## 📋 Quick Actions

| Action | How To |
|--------|--------|
| **View all pins** | Dashboard shows all pins automatically |
| **Search pins** | Type in search box (searches name, source, reporter) |
| **Filter by urgency** | Use "Filter by Urgency" dropdown |
| **Sort pins** | Use "Sort by" dropdown |
| **View details** | Click eye icon (👁️) on any pin |
| **Delete pin** | Click trash icon (🗑️) → Confirm |
| **Refresh data** | Click "Refresh" button |
| **View on map** | Click "View Map" or open pin details → "View on Map" |
| **Logout** | Click "Logout" button (top-right) |

## 🎯 Common Tasks

### Delete Spam/Duplicate Pins
1. Search or filter to find the unwanted pin
2. Click trash icon (🗑️)
3. Review details in confirmation dialog
4. Click "Delete Pin"
5. ✅ Pin removed from all devices instantly

### Review Critical Reports
1. Click "Filter by Urgency" → Select "Critical"
2. Review all critical pins
3. Take appropriate action or delete if resolved

### Find Specific Location
1. Type location name in search box
2. Results filter automatically
3. Click eye icon to view full details

## 🔒 Security Notes

- ✅ Only authenticated users can access admin panel
- ✅ All deletions are logged in Firebase
- ✅ Changes sync across all devices in real-time
- ⚠️ Deletions are permanent - cannot be undone!
- 🔐 Keep admin credentials secure

## 📱 Access Points

**Admin Panel**: Open `admin.html` directly  
**From Main Map**: Click "Admin Panel" button in navigation  
**Direct Link**: `https://your-domain.com/admin.html`

## ⚡ Keyboard Shortcuts

- **Tab** - Navigate between fields
- **Enter** - Submit login form
- **Esc** - Close modals
- **Ctrl+F** - Focus search box (browser default)

## 🆘 Troubleshooting

| Problem | Solution |
|---------|----------|
| Can't login | Check email/password, verify Firebase Auth is enabled |
| No pins showing | Click Refresh, check internet connection |
| Can't delete | Ensure logged in, check Firestore rules |
| Slow loading | Check internet speed, Firebase quota limits |

## 📊 Dashboard Stats Explained

- **Critical** - Pins marked as "immediate help needed"
- **Urgent** - Pins marked as "help within 24 hours"
- **Moderate** - Pins marked as "help within few days"
- **Total** - All pins in database

## 🎨 Color Codes

- 🔴 **Red** - Critical urgency
- 🟠 **Orange** - Urgent
- 🟡 **Yellow** - Moderate
- 🔵 **Blue** - Info/Source badges

## 📞 Need Help?

1. Check `ADMIN_SETUP.md` for detailed setup instructions
2. Review Firebase Console for errors
3. Check browser console (F12) for JavaScript errors
4. Verify all Firebase services are enabled

---

**Quick Tip**: Bookmark `admin.html` for easy access! 🔖
