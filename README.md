# TRAFFIQ: Intelligent Traffic Management Ecosystem 🚦

TRAFFIQ is India's premier intelligent traffic management ecosystem designed under the Digital India Mission. It modernizes urban mobility and safety by integrating AI-driven coordination with emergency response infrastructure.

## 🌟 Key Features

*   **Adaptive Traffic Control**: AI-driven signal synchronization that responds to real-time traffic density.
*   **Emergency Green Corridor**: Immediate signal preemption for ambulances, fire engines, and other emergency vehicles.
*   **Precision Analytics**: Advanced data insights for urban planners to identify bottlenecks and optimize city planning.
*   **Public Safety Alerts**: Real-time incident reporting and broadcasting to commuters.
*   **Multi-Role Dashboards**: Dedicated interfaces for Admins, Citizens, and Drivers.
*   **Multi-lingual Support**: Available in English, Hindi, Marathi, Tamil, and Telugu.
*   **Accessibility First**: Features like High Contrast mode and adjustable font sizes for inclusive access.

## 🛠️ Technology Stack

**Frontend:**
*   React 18 + Vite
*   TypeScript
*   Tailwind CSS
*   Shadcn UI (Radix UI)
*   Framer Motion (Animations)
*   Recharts (Data Visualization)
*   Google Maps API

**Backend & Data:**
*   Supabase (Authentication, Database, Realtime capabilities)
*   React Query (Data Fetching & Caching)

**Machine Learning (ML Models):**
*   Route Risk Prediction
*   Traffic Congestion Prediction
*   Traffic & ETA Prediction

## 📁 Project Structure

```text
TRAFFIQ/
├── src/                # React Frontend Code
│   ├── components/     # Reusable UI components & Layouts
│   ├── pages/          # Application pages (Dashboards, Landing, etc.)
│   ├── hooks/          # Custom React hooks (e.g., useAuth)
│   ├── lib/            # Utility functions
│   └── ...
├── ML models/          # Jupyter notebooks for Traffic & ETA prediction models
├── supabase/           # Supabase configurations and migrations
├── public/             # Static assets
└── package.json        # Project dependencies and scripts
```

## 🚀 Getting Started

### Prerequisites
*   Node.js (v18 or higher recommended)
*   npm or yarn
*   Supabase account (for backend services)

### Installation

1.  **Clone the repository** (if applicable):
    ```bash
    git clone <repository-url>
    cd TRAFFIQ
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Set up environment variables**:
    Create a `.env` file in the root directory and add your Supabase and Google Maps API keys:
    ```env
    VITE_SUPABASE_URL=your_supabase_url
    VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
    VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
    ```
    *(Note: Ensure your `.env` values correspond to the actual environment variables required by the project).*

4.  **Run the development server**:
    ```bash
    npm run dev
    ```
    The application will be available at `http://localhost:5173`.

## 🧪 Machine Learning Models
The `ML models/` directory contains Jupyter notebooks used to train and test predictive models based on historical traffic and accident data. Key datasets include `traffic.csv` and `road_accidents.csv`.
To explore the models, you can run the notebooks using Jupyter Lab or Google Colab.

## 📜 Copyright
© 2026 Ministry of Urban Development · Government of India. Designed under the Digital India Initiative.
