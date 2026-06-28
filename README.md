# GatePass Pro

GatePass Pro is a full-stack smart community security and resident management platform. It enables gate security officers, community administrators, and residents to coordinate pre-approved guest passes, manage vehicle directories, broadcast system-wide security alerts, verify visitors using expiring single-use passcodes, and monitor real-time distress status.

### ⚝ Features
- **Visitor Passcode Verification**: Enforce secure 6-digit passcodes for guest entry, verified at the gate.
- **Passcode Rate Limiting & Lockout**: Prevent brute-force attempts with rate limiting and a 15-minute lockout for any flat after 3 consecutive failed verification attempts.
- **Single-Use Passcodes**: Passcodes are invalidated instantly upon the guest's first check-in to prevent unauthorized reuse.
- **24-Hour Expiration (TTL)**: Guest passes automatically expire 24 hours after creation.
- **Vehicle Directory**: Residents register their vehicle plates so security and neighbors can search and contact owners blocking driveways.
- **Real-Time Notifications**: Instantly notify residents via sockets when visitors check in or check out.
- **Emergency Distress Deck**: Residents can trigger distress alerts, sending instant audio alarms and notifications to administrators and guard stations.
- **System Command deck**: Admin broadcasts alerts directly to tablet guards.
- **Community Forum**: An announcement board where residents can publish posts and comment on community discussions.
- **Local Storage Fallback**: A fully functioning offline mode allowing check-ins, lockout logic, and data updates to work seamlessly via LocalStorage when the backend is offline.

### ⚝ Tech Stack
- Frontend: React.js, Vite, Custom Vanilla CSS, Lucide Icons, Socket.io-client
- Backend: Node.js, Express, Socket.io, Express-rate-limit
- Database: MongoDB, Mongoose ORM
- Communication: Sockets for real-time alerts, Nodemailer for registration OTPs

### ⚝ System Architecture <br>
GatePass Pro is built for real-time security updates, access validation, and community management. The system is divided into five high-level areas:
- Frontend: A responsive React application with customized CSS design and fallback handlers. It serves three roles: Admin, Security (Gate guards), and Residents.
- Real-Time Socket Layer: Coordinates instant distress alert sounds, system broadcasts, and notifications between the guard cabin, residents, and admins.
- Security & Rate Limit Layer: Middleware protecting verification routes by IP rate limiting (Express-rate-limit) and custom flat-level lockout counts.
- Database: Mongoose models storing residents, approved visitor schedules, posts, and real-time distress records.
- Mailer Service: Relays registered account OTP codes and approvals via SMTP.

```
GatePass-Pro/
├── backend/                  # Node.js + Express backend
│   ├── config/
│   │   └── db.js             # MongoDB database connection configuration
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── notificationController.js
│   │   ├── postController.js
│   │   ├── residentController.js
│   │   └── visitorController.js # Verification logic, single-use, TTL, and lockout attempts
│   ├── middleware/
│   │   ├── authMiddleware.js
│   │   └── visitorLimiter.js # IP rate limiter for passcode checks
│   ├── models/
│   │   ├── Notification.js
│   │   ├── Post.js
│   │   ├── Resident.js       # Resident info, vehicle listings, and distress logs
│   │   └── Visitor.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── notificationRoutes.js
│   │   ├── postRoutes.js
│   │   ├── residentRoutes.js
│   │   └── visitorRoutes.js
│   ├── server.js             # Main server entry point initializing Express, Sockets, and routes
│   └── package.json          # Backend dependencies
├── frontend/                 # React + Vite frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── FormComponents.jsx
│   │   │   ├── Layout.jsx    # Real-time socket listener, sidebar, and distress alarm banner
│   │   │   └── ProtectedRoute.jsx
│   │   ├── context/
│   │   │   └── ToastContext.jsx
│   │   ├── pages/
│   │   │   ├── Community.jsx  # Community post announcement board
│   │   │   ├── Dashboard.jsx  # Admin control deck with real-time stats
│   │   │   ├── Login.jsx
│   │   │   ├── Profile.jsx    # Resident account preferences
│   │   │   ├── Register.jsx
│   │   │   ├── ResidentDashboard.jsx # Resident pre-approvals, members, and distress alerts
│   │   │   ├── Residents.jsx  # Resident master table and registration request deck
│   │   │   ├── Vehicles.jsx   # Vehicle owner directory and plate search interface
│   │   │   └── Visitors.jsx   # Gate pass check-in panel and entry log lists
│   │   ├── services/
│   │   │   ├── api.js         # API request layer with complete LocalStorage fallback
│   │   │   └── socket.js      # Socket client helper
│   │   ├── App.css
│   │   ├── App.jsx           # Client routes
│   │   ├── index.css
│   │   └── main.jsx
│   ├── package.json          # Frontend dependencies
│   └── vite.config.js        # Vite configurations
└── README.md                 # Project documentation
```

### ⚝ Installation & Setup
1. Clone the Repository
   ```bash
   git clone https://github.com/Susheyyy/GatePass-Pro.git
   cd GatePass-Pro
   ```
2. Backend Setup
   ```bash
   cd backend
   npm install
   ```
   Create a .env file in the /backend folder:
   ```env
   PORT=5000
   MONGO_URI=your_mongodb_connection_uri
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_MAIL=your_email@gmail.com
   SMTP_PASSWORD=your_app_specific_password_here
   FRONTEND_URL=http://localhost:5173
   ```
   Run the backend server:
   ```bash
   npm run dev
   ```
3. Frontend Setup
   ```bash
   cd ../frontend
   npm install
   npm run dev
   ```

### ⚝ How to Use
- Pre-Approve Visitors: Residents log into the Resident Dashboard, select "New Entry Pass", input visitor details, and generate a secure 6-digit passcode.
- Gate Check-In: The guard/security officer uses the "Gate Pass Verification" panel on the Visitors page, inputs the destination flat number and passcode, and checks in the visitor.
- Search Vehicles: Look up any blocking vehicle number in the "Vehicle Directory" to instantly find the owner's flat and phone number.
- Broadcast System Alerts: Administrators use the "System Command Deck" to push instant broadcast messages to all tablet guards.
- Trigger Distress: If an emergency occurs, the resident triggers distress in their panel, setting off a system-wide audio alarm for administrators.
