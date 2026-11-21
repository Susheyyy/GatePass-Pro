# GatePass Pro

GatePass Pro is a full-stack smart community security and resident management platform. It enables gate security officers, community administrators, and residents to coordinate pre-approved guest passes, manage vehicle directories, broadcast system-wide security alerts, verify visitors using expiring single-use passcodes, and monitor real-time distress status.

### ⚝ Features
- **Visitor Passcode Verification**: Enforce secure 6-digit passcodes for guest entry, verified at the gate.
- **Passcode Rate Limiting & Lockout**: Prevent brute-force attempts with rate limiting and a 15-minute lockout for any flat after 3 consecutive failed verification attempts.
- **Single-Use Passcodes**: Passcodes are invalidated instantly upon the guest's first check-in to prevent unauthorized reuse.
- **15-Minute OTP Expiration**: Verification OTPs sent to residents automatically expire after 15 minutes.
- **Delivery Entry**: Standalone page for gate guards to quickly check-in parcel and courier deliveries with generic, clean input fields.
- **Daily Reports**: A dedicated admin-only reports panel displaying today's visitor counts, logs, search capabilities, and direct CSV exporting.
- **Today's Gate Analytics & Traffic Summary**: Dynamic dashboard widgets displaying Deliveries Logged Today, Average Guest Visit Duration, Peak Entry Window, and Busiest Entry Hours.
- **Vehicle Directory**: Searchable directory matching both resident vehicle plates and currently checked-in guest vehicle plates to locate owners blocking driveways.
- **Off-Canvas Sidebar**: Sidebar defaults to collapsed (hidden) on load, toggled via a hamburger menu in the header to maximize screen space.
- **Real-Time Notifications**: Instantly notify residents via sockets when visitors check in or check out.
- **Emergency Distress Deck**: Residents can trigger distress alerts, sending instant audio alarms and notifications to administrators and guard stations.
- **System Command Deck**: Admin broadcasts alerts directly to tablet guards.
- **Community Forum**: An announcement board where residents can publish posts and comment on community discussions.
- **Local Storage Fallback**: Explicit demo sessions simulate operations in isolated tab-local storage. Real sessions reject network/API errors and never record gate entry locally.

### ⚝ Tech Stack
- Frontend: React.js, Vite, Custom Vanilla CSS, Lucide Icons, Socket.io-client
- Backend: Node.js, Express, Socket.io, Express-rate-limit
- Database: MongoDB, Mongoose ORM
- Communication: Sockets for real-time alerts, Resend API for account activation OTPs and administrative notifications

### ⚝ System Architecture
GatePass Pro is built for real-time security updates, access validation, and community management. The system is divided into five high-level areas:
- Frontend: A responsive React application with customized CSS design and fallback handlers. It serves three roles: Admin, Security (Gate guards), and Residents.
- Real-Time Socket Layer: Coordinates instant distress alert sounds, system broadcasts, and notifications between the guard cabin, residents, and admins.
- Security & Rate Limit Layer: Middleware protecting verification routes by IP rate limiting (Express-rate-limit) and custom flat-level lockout counts.
- Database: Mongoose models storing residents, approved visitor schedules, posts, and real-time distress records.
- Mailer Service: Relays registered account OTP codes and approvals via the Resend API.

```
GatePass-Pro/
├── backend/                  # Node.js + Express backend
│   ├── config/
│   │   ├── db.js             # MongoDB database connection configuration
│   │   └── mailer.js         # Resend API integration configuration
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
│   │   │   ├── DeliveryEntry.jsx # Standalone courier delivery logging panel
│   │   │   ├── DailyReport.jsx # Admin-only visitor logs reporting panel
│   │   │   ├── Login.jsx
│   │   │   ├── Profile.jsx    # Resident account preferences
│   │   │   ├── Register.jsx
│   │   │   ├── ResidentDashboard.jsx # Resident pre-approvals, members, and distress alerts
│   │   │   ├── Residents.jsx  # Resident master table and registration request deck
│   │   │   ├── Vehicles.jsx   # Vehicle owner directory and plate search interface
│   │   │   └── Visitors.jsx   # Gate pass check-in panel and entry log lists
│   │   ├── services/
│   │   │   ├── api.js         # API requests with isolated demo simulation and fail-closed real sessions
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
   RESEND_API_KEY=your_resend_api_key_here
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

### ⚝ Live Demo
https://gate-pass-pro.vercel.app/

The login page includes **Admin demo**, **Guard demo**, and **Resident demo** buttons. No credentials are required. Each starts fictional, tab-local data without contacting the backend or sending live alerts. Exit the demo to switch roles or sign in normally. Try guard entry for **A-101** with passcode **123456**.

See [PRODUCT_REVIEW.md](PRODUCT_REVIEW.md) for the prioritized product readiness review. Run `npm test` in `frontend` to check demo isolation.
<br><br>
If you have feedback or ideas, feel free to reach out! <br>
If you like this project, consider giving it a star!


### Security configuration and P0 upgrade
Read [P0_UPGRADE.md](P0_UPGRADE.md) before deployment. Use backend/.env.example as the configuration template. JWT_SECRET and MONGO_URI are mandatory; privileged accounts have no default passwords. Existing installations must rotate credentials and use the dedicated account activation/recovery flow. Run npm test in each app, and run the backend integration suite with TEST_MONGO_URI pointing to a disposable MongoDB instance.
