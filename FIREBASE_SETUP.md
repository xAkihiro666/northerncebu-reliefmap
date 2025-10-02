# Firebase Setup Guide for Northern Cebu Relief Map - PUBLIC SERVER

This guide will help you set up Firebase Firestore to create a **PUBLIC SERVER** where everyone who opens your website can see the pins and changes in real-time, without any authentication required.

## Public Server Features

- **No login required** - Anyone can view and add relief locations
- **Real-time sync** - Changes appear instantly across all devices
- **Cross-device access** - Works on phones, tablets, computers
- **Community-driven** - Anyone can contribute to the relief efforts

## Prerequisites

- A Google account
- Access to the Firebase Console

## Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click "Create a project" or "Add project"
3. Enter project name: `northern-cebu-relief-public`
4. **DISABLE Google Analytics** (not needed for public map)
5. Click "Create project"

## Step 2: Set up Firestore Database

1. In your Firebase project console, click "Firestore Database" in the left sidebar
2. Click "Create database"
3. **Choose "Start in production mode"** (we'll set public rules)
4. Select location: **asia-southeast1** (Singapore - closest to Philippines)
5. Click "Done"

## Step 3: Configure PUBLIC ACCESS RULES

**IMPORTANT**: Set up public rules BEFORE getting your config to avoid connection issues.

1. In Firebase console, go to "Firestore Database"
2. Click on "Rules" tab
3. Replace the rules with this PUBLIC ACCESS configuration:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Public relief locations - anyone can read and write
    match /relief-locations/{document} {
      allow read, write: if true;
    }
    
    // Optional: Add rate limiting (uncomment if needed)
    // match /relief-locations/{document} {
    //   allow read: if true;
    //   allow write: if request.time > resource.data.lastWrite + duration.value(10, 's');
    // }
  }
}
```

4. Click "Publish"
5. **Confirm** that you want to make the database publicly accessible

## Step 4: Get your Firebase Configuration

1. In the Firebase console, click the gear icon (⚙️) next to "Project Overview"
2. Select "Project settings"
3. Scroll down to "Your apps" section
4. Click "Add app" and select the web icon (</>) 
5. Register your app with nickname: **"Northern Cebu Public Relief Map"**
6. **DO NOT** check "Set up Firebase Hosting" (we're using your own server)
7. Copy the entire `firebaseConfig` object

## Step 5: Update your Configuration

1. Open `firebase-config.js` in your project
2. Replace the placeholder values with your actual Firebase config:

```javascript
const firebaseConfig = {
    apiKey: "AIzaSyExample123-your-actual-api-key",
    authDomain: "northern-cebu-relief-public.firebaseapp.com", 
    projectId: "northern-cebu-relief-public",
    storageBucket: "northern-cebu-relief-public.appspot.com",
    messagingSenderId: "123456789012",
    appId: "1:123456789012:web:abcdef123456"
};
```

**Example of what your config should look like:**
```javascript
const firebaseConfig = {
    apiKey: "AIzaSyDxVlWA-cE_OfAShL62I-llxYsSVxHVXnI",
    authDomain: "northern-cebu-relief-public.firebaseapp.com",
    projectId: "northern-cebu-relief-public", 
    storageBucket: "northern-cebu-relief-public.appspot.com",
    messagingSenderId: "987654321098",
    appId: "1:987654321098:web:abc123def456ghi789"
};
```

## Step 6: Test the Public Server

### Quick Test:
1. Open your web application
2. Check browser console - should see "Firebase SDK loaded successfully"
3. Look for sync status: should show "Syncing across devices" (green)

### Full Test:
1. **Add a test location** - click "Report Location" and add a pin
2. **Open in another browser/device** - the pin should appear automatically
3. **Test real-time sync** - add pins from different devices simultaneously
4. **Share the URL** - anyone with the link can see and add pins

## Going Live - Making it Truly Public

### Option 1: GitHub Pages (Free)
1. Create a GitHub repository
2. Upload your files
3. Enable GitHub Pages
4. Share the public URL: `https://yourusername.github.io/repository-name`

### Option 2: Netlify (Free)
1. Go to [Netlify](https://netlify.com)
2. Drag and drop your project folder
3. Get instant public URL
4. Share the URL with anyone

### Option 3: Firebase Hosting (Free)
1. In Firebase console, click "Hosting"
2. Click "Get started"
3. Follow the setup instructions
4. Deploy with: `firebase deploy`

## Usage Limits (Free Tier)

- **50,000 reads per day** (viewing pins)
- **20,000 writes per day** (adding pins)
- **1 GB storage** (plenty for location data)
- **10 GB bandwidth per month**

This should handle hundreds of users reporting locations daily.

## Security Considerations

### What's Protected:
- Firebase handles DDoS protection
- Data is encrypted in transit
- Automatic backups

### What to Monitor:
- Spam reports (consider adding simple validation)
- Inappropriate content (community moderation)
- Usage spikes (monitor Firebase console)

### Optional Security Enhancements:
```javascript
// Add to Firestore rules for basic validation
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /relief-locations/{document} {
      allow read: if true;
      allow write: if 
        // Validate required fields
        request.resource.data.keys().hasAll(['name', 'coords', 'reliefNeeds']) &&
        // Limit location name length
        request.resource.data.name.size() < 100 &&
        // Ensure coordinates are in Philippines area
        request.resource.data.coords[0] > 4.0 && request.resource.data.coords[0] < 21.0 &&
        request.resource.data.coords[1] > 116.0 && request.resource.data.coords[1] < 127.0;
    }
  }
}
```

## Troubleshooting

### "Permission denied" errors
- Check Firestore rules are published
- Verify rules allow `read, write: if true`
- Wait 1-2 minutes after publishing rules

### "Firebase not connecting"
- Verify all config values are correct (no quotes missing)
- Check internet connection
- Look for typos in project ID

### "Data not syncing across devices"
- Test in incognito/private browsing mode
- Clear browser cache
- Check Firebase console for data

### "Quota exceeded"
- Monitor usage in Firebase console
- Consider upgrading to Blaze plan ($0.06 per 100K reads)

## Emergency Deployment

If you need to get this live immediately:

1. **Complete Steps 1-5 above** (15 minutes)
2. **Test locally** - open `index.html` in browser
3. **Quick deploy to Netlify**:
   - Go to [netlify.com](https://netlify.com)
   - Drag your project folder to deploy
   - Get instant public URL
   - Share with relief coordinators

## 🌟 Success Indicators

✅ **Working correctly when:**
- Sync status shows "Syncing across devices" (green)
- Pins appear on multiple devices instantly
- Anyone can access the URL and see/add pins
- No authentication required
- Data persists across browser sessions

## 📱 Sharing Your Public Relief Map

Once deployed, share the URL via:
- Facebook groups
- WhatsApp/Messenger
- Local government websites
- Relief organization networks
- Community bulletin boards

**Example message:**
> 🆘 Northern Cebu Earthquake Relief Map - Help us locate areas needing assistance! 
> Anyone can view and report locations: [YOUR-URL-HERE]
> No login required - works on all devices 📱💻

## 🚀 Next Steps After Setup

1. **Follow the setup guide** - Complete Steps 1-5 (takes ~15 minutes)
2. **Test locally** - Open `index.html` in your browser
3. **Deploy publicly** - Use Netlify, GitHub Pages, or Firebase Hosting
4. **Share the URL** - Distribute to relief coordinators and community
5. **Monitor usage** - Check Firebase console for activity

## 📞 Support

If you encounter issues:
1. Check the browser console for error messages
2. Verify your Firebase configuration matches exactly
3. Ensure Firestore rules are correctly set and published
4. Test with a simple write operation in Firebase console
5. Try the troubleshooting steps above

**Need immediate help?** The setup should take 15-20 minutes total. Most issues are resolved by double-checking the Firebase config values and ensuring the Firestore rules are published.

If you encounter issues:
1. Check the browser console for error messages
2. Verify all configuration steps
3. Test with a simple Firebase example first
4. Check Firebase Console for quota/billing issues

---

**Your relief map now supports real-time cross-device synchronization! 🎉**
