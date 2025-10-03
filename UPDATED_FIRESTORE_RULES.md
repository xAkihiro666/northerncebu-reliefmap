# 🔒 Updated Firestore Security Rules

## ✅ New Delete Permissions

Users can now delete their own pins! Here are the updated rules:

---

## 📋 Firestore Rules (Copy and Paste)

Go to Firebase Console → Firestore Database → Rules and replace with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Relief locations collection
    match /relief-locations/{document} {
      // Anyone can read
      allow read: if true;
      
      // Anyone can create (add pins)
      allow create: if true;
      
      // Delete permissions:
      allow delete: if request.auth != null && (
        // Master admin can delete everything
        request.auth.token.email == 'charleszoiyana@gmail.com'
        ||
        // Users can delete their own pins
        resource.data.userId == request.auth.uid
      );
      
      // Update permissions:
      allow update: if request.auth != null && (
        // Master admin can update anything
        request.auth.token.email == 'charleszoiyana@gmail.com'
        ||
        // Regular users can update reached status only
        request.resource.data.diff(resource.data).affectedKeys()
          .hasOnly(['reached', 'reachedAt', 'reachedBy'])
        ||
        // Users can update their own pins
        resource.data.userId == request.auth.uid
      );
    }
    
    // Users collection
    match /users/{userId} {
      allow read: if true;
      allow create: if request.auth != null && request.auth.uid == userId;
      allow update: if request.auth != null && request.auth.uid == userId;
      allow delete: if false;
    }
  }
}
```

---

## 🔐 What These Rules Allow:

### **Delete Permissions:**
1. ✅ **Master Admin** (charleszoiyana@gmail.com) → Can delete ALL pins
2. ✅ **Pin Creator** → Can delete their own pins only
3. ❌ **Others** → Cannot delete pins they didn't create

### **Update Permissions:**
1. ✅ **Master Admin** → Can update anything
2. ✅ **Regular Admins** → Can update reached status
3. ✅ **Pin Creator** → Can update their own pins
4. ❌ **Others** → Cannot update pins they didn't create

### **Create Permissions:**
- ✅ **Everyone** → Can add new pins

### **Read Permissions:**
- ✅ **Everyone** → Can view all pins

---

## 🎯 How It Works:

### Example 1: User Creates and Deletes Their Pin
```
1. User logs in as: user@example.com (uid: abc123)
2. Creates pin → Saved with userId: "abc123"
3. Clicks delete on their pin
4. Firestore checks: resource.data.userId == request.auth.uid
5. "abc123" == "abc123" ✅ ALLOWED
6. Pin deleted successfully
```

### Example 2: User Tries to Delete Someone Else's Pin
```
1. User A logged in as: userA@example.com (uid: abc123)
2. Tries to delete User B's pin (userId: xyz789)
3. Firestore checks: resource.data.userId == request.auth.uid
4. "xyz789" == "abc123" ❌ DENIED
5. Delete rejected
```

### Example 3: Master Admin Deletes Any Pin
```
1. Master admin: charleszoiyana@gmail.com
2. Tries to delete any pin
3. Firestore checks: request.auth.token.email == 'charleszoiyana@gmail.com'
4. Match! ✅ ALLOWED
5. Pin deleted (regardless of who created it)
```

---

## ✅ Summary:

| User Type | Can Delete | Condition |
|-----------|------------|-----------|
| **Master Admin** | ALL pins | Email = charleszoiyana@gmail.com |
| **Pin Creator** | Own pins only | userId matches auth.uid |
| **Other Users** | Nothing | ❌ Denied |
| **Not Logged In** | Nothing | ❌ Denied |

---

## 🔧 How to Apply:

1. Go to: https://console.firebase.google.com
2. Select: **northern-cebu-relief-public**
3. Click: **Firestore Database** → **Rules** tab
4. **Copy the rules above**
5. **Paste** into the editor
6. Click: **Publish**
7. Wait for confirmation

---

**After updating rules, users will be able to delete their own pins!** 🎉
