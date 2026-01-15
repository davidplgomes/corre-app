# Corre App

A React Native + Expo + Supabase running/fitness community app with authentication, multi-language support, membership tiers, QR-based loyalty cards, event calendar with geolocation check-ins, and gamification.

## Features

- ✅ User authentication (signup, login, profile)
- ✅ Multi-language support (English, Portuguese, Spanish)
- ✅ Membership tiers: Free (5%), Basico (10%), Baixa Pace (15%), Parceiros (20%)
- ✅ Loyalty card with unique QR code per user
- ✅ Merchant mode for scanning QR codes
- ✅ Events calendar (create, view, join events)
- ✅ Geolocation-based check-ins (300m radius, 30min window)
- ✅ Points system: Routine=3pts, Special=5pts, Race=10pts
- ✅ Monthly leaderboard
- ✅ Tier upgrade: 12 points/month → discount to 17.5 euros

## Prerequisites

- Node.js 18+
- npm or yarn
- Expo CLI
- Supabase account with project credentials

## Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/davidplgomes/corre-app.git
   cd corre-app
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create `.env` file from template:
   ```bash
   cp .env.example .env
   ```

4. Add your Supabase credentials to `.env`:
   ```
   SUPABASE_URL=https://your-project-id.supabase.co
   SUPABASE_ANON_KEY=your-anon-key-here
   ```

5. Set up Supabase database:
   - Go to your Supabase project dashboard
   - Navigate to SQL Editor
   - Run the migrations in `supabase/migrations/` in order:
     - `001_initial_schema.sql`
     - `002_rls_policies.sql`
     - `003_functions.sql`

6. Start the development server:
   ```bash
   npm start
   ```

7. Run on your device or simulator:
   - Press `i` for iOS simulator
   - Press `a` for Android emulator
   - Scan QR code with Expo Go app on your phone

## Project Structure

```
corre-app/
├── src/
│   ├── components/          # Reusable UI components
│   ├── screens/             # Screen components
│   ├── navigation/          # Navigation setup
│   ├── services/            # Business logic & API calls
│   ├── contexts/            # React contexts
│   ├── hooks/               # Custom hooks
│   ├── types/               # TypeScript types
│   ├── constants/           # App constants
│   ├── locales/             # Translation files
│   └── utils/               # Utility functions
├── supabase/                # Database migrations
├── assets/                  # Images, icons, fonts
└── App.tsx                  # Root component
```

## Tech Stack

- **Frontend**: React Native with Expo
- **Backend**: Supabase (PostgreSQL + Auth + Real-time)
- **Navigation**: React Navigation
- **Internationalization**: react-i18next
- **QR Codes**: react-native-qrcode-svg, expo-barcode-scanner
- **Location**: expo-location
- **Maps**: react-native-maps
- **Calendar**: react-native-calendars

## License

MIT

## Contributors

Built with ❤️ by the Corre App team
