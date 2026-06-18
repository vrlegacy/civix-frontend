# Civix (Frontend) 🏛️

Civix is a modern, responsive, and interactive civic engagement web application that bridges the gap between citizens, volunteers, and local authorities. It enables citizens to report community issues (complaints), launch and sign petitions, participate in public polls, and track civic progress.

**Live Application:** [https://civix-zeta.vercel.app/](https://civix-zeta.vercel.app/)

---

## 🌟 Key Features

*   **Interactive Citizen Dashboard:** A unified home page showing engagement stats, active complaints, petition status, and local polls.
*   **Role-Based Dashboards:** Distinct user portals customized for **Citizens**, **Volunteers**, and **Administrators/Officials**.
*   **Smart Geolocation & Map Integration:** Real-time location detection and interactive OpenStreetMap (via Leaflet) to pick coordinates or select addresses during signup and complaint submission.
*   **Visual Reports & Analytics:** Beautiful engagement charts and sentiment analysis visualizations powered by Recharts.
*   **Media Upload & Compression:** On-the-fly client-side image compression before uploading media directly to Cloudinary via the backend.
*   **Petitions Engine:** Create, view, and sign local or global petitions with visual progress bars tracking signature goals and an official response timeline.
*   **Live Polls & Surveys:** Vote in local polls with real-time chart updates showing vote distributions.
*   **Dark Mode Support:** Clean, premium aesthetics featuring beige/warm-sandal tones with full Tailwind CSS dark mode capability.

---

## 🔍 Detailed Feature Walkthrough

### 1. Robust Authentication & Roles
Civix supports role-based views using JWT-secured authentication:
*   **Citizen:** Can submit complaints, create/sign petitions, and vote in local polls.
*   **Volunteer:** Can view complaints/petitions assigned to them by administrators, add progress logs, and update status to *In Review* or *Resolved*.
*   **Admin/Official:** Complete oversight to assign complaints/petitions to volunteers, check engagement reports, and create new community polls.

### 2. Map-Backed Complaint Reporting
Citizens can report community problems (e.g., Infrastructure, Sanitation, Roads) with precision:
*   Add descriptions, select categories, and pinpoint the issue using coordinates or street names.
*   Upload photos showing the issue. To save bandwidth and storage, high-resolution photos are compressed in the browser before upload.

### 3. Petitions & Community Voice
Civix includes a full-featured petitions platform where users can:
*   Initiate petitions targeting local authorities with specific signature goals.
*   Sign petitions, add optional comments, and view signatures count progress in real-time.
*   Track volunteer actions and official comments through status history logs.

### 4. Admin Reporting & Insights
The Admin portal contains data visualizations that summarize civic activity:
*   **Engagement Report:** Graphs tracking complaints, polls, and petitions over time.
*   **Sentiment Analysis:** Evaluates the general consensus of complaints and feedback to gauge community satisfaction.

---

## 🛠️ Technology Stack

*   **Framework:** React 19 + TypeScript + Vite
*   **Styling:** Tailwind CSS + Radix UI + Framer Motion
*   **Icons:** Lucide React
*   **Mapping:** Leaflet & React Leaflet (OpenStreetMap)
*   **Charts:** Recharts
*   **HTTP Client:** Axios
*   **Toasts:** Sonner

---

## 🚀 Installation & Local Setup

Ensure you have [Node.js](https://nodejs.org/) installed on your machine.

### 1. Clone the repository
```bash
git clone git@github-personnel:vrlegacy/civix-frontend.git
cd civix-frontend
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Setup Environment Variables
Copy the `.env.example` file to create your own `.env` file:
```bash
cp .env.example .env
```
Open `.env` and point the `VITE_API_URL` to your backend (e.g., `http://localhost:5000/api` for a local backend, or the production URL).

### 4. Run Development Server
```bash
npm run dev
```
The server will start running on [http://localhost:5173](http://localhost:5173).

### 5. Build for Production
To generate a production-ready bundle inside the `dist` directory:
```bash
npm run build
```
To test the production build locally:
```bash
npm run preview
```
