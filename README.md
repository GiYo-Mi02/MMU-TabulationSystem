# Pageant Tabulation System

A professional, real-time tabulation system for pageant scoring built with React, TailwindCSS, and Supabase.

## 🚀 Features

### 🔴 **Real-Time Updates - No Refresh Needed!**

Everything updates automatically across all devices:

- **Live scoring**: See scores appear instantly as judges submit them
- **Real-time rankings**: Leaderboard updates automatically
- **Lock/unlock sync**: Judges' interfaces update instantly
- **Connection indicator**: Green "Live" badge shows real-time status
- **Multi-user**: All admins and judges see changes simultaneously

👉 **[Learn more about real-time features](./REALTIME_FEATURES.md)**

### 🧑‍⚖️ Judge Side (No Login Required)

- **Unique URL per judge** - Each judge gets their own personalized scoring link
- **Beautiful contestant cards** - Clean, professional UI with photos and details
- **Weighted scoring system** - 3 categories with multiple criteria (see scoring details below)
- **Real-time score calculation** - Instant weighted total calculation as you score
- **Progress tracking** - See how many contestants you've scored
- **Auto-save scores** - Scores sync automatically to Supabase
- **Mobile-friendly** - Works perfectly on tablets and phones
- **Live updates** - New contestants appear automatically, lock status updates instantly

👉 **[Learn about the scoring system](./SCORING_SYSTEM.md)**

### 🧑‍💼 Admin Side

- **Judge Management** - Add/remove judges, generate unique URLs, activate/deactivate
- **Contestant Management** - Add/edit/delete contestants with photos
- **Live Scoreboard** - Real-time rankings with average scores per category
- **Lock/Unlock Scoring** - Freeze submissions when rounds end
- **Public Display Mode** - Beautiful full-screen leaderboard for projection
- **Real-time Updates** - Everything updates live as judges submit scores
- **Live indicator** - Visual confirmation of real-time connection status

### 🏆 Public Leaderboard

- **Beautiful podium display** - Stunning top 3 visualization
- **Full rankings** - Complete list with photos and scores
- **Live updates** - Automatically refreshes as new scores come in
- **Projection-ready** - Perfect for displaying during events
- **Connection status** - Shows "Live" indicator in top-right corner

## 🛠️ Tech Stack

- **Frontend**: React 18 + Vite
- **Styling**: TailwindCSS with custom design system
- **Backend**: Supabase (PostgreSQL)
- **Real-time**: Supabase Realtime
- **Routing**: React Router v6
- **Icons**: Lucide React
- **Notifications**: Sonner (toast notifications)

## 📦 Installation

### 1. Clone and Install Dependencies

\`\`\`bash
cd TabulationSystem
npm install
\`\`\`

### 2. Set Up Supabase

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Copy your project URL and anon key
3. Create a `.env` file in the root directory:

\`\`\`env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
\`\`\`

### 3. Run Database Migration

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy the contents of `supabase-schema.sql`
4. Paste and run the SQL script

This will create:

- `judges` table
- `contestants` table
- `scores` table
- `settings` table
- Necessary indexes and triggers

### 4. Start Development Server

\`\`\`bash
npm run dev
\`\`\`

The app will be available at `http://localhost:3000`

## 🌐 LAN/Network Access

To access the system from other devices on your network:

1. Find your computer's local IP address:

   - Windows: `ipconfig` (look for IPv4 Address)
   - Mac/Linux: `ifconfig` or `ip addr`

2. Access the app from other devices using:
   \`http://YOUR_IP_ADDRESS:3000\`

## 📋 Usage Guide

### Setting Up for an Event

1. **Add Judges**

   - Go to Admin Dashboard → Manage Judges
   - Click "Add Judge" and enter their name
   - Copy their unique URL and send it to them

2. **Add Contestants**

   - Go to Admin Dashboard → Manage Contestants
   - Add each contestant with number, name, and optional photo URL
   - Photos can be hosted on any image hosting service

3. **Share Judge Links**

   - Each judge opens their unique URL on their device
   - They can start scoring immediately (no login needed)

4. **Monitor Live Scoreboard**

   - Go to Admin Dashboard → Live Scoreboard
   - Watch real-time updates as judges submit scores
   - See completion rates and rankings

5. **Display Public Leaderboard**

   - Open `/leaderboard` route in a browser
   - Project this on a screen for the audience
   - Rankings update automatically in real-time

6. **Lock Scoring**
   - When the round ends, click "Lock Scoring" in Admin Scoreboard
   - Judges can no longer submit or update scores
   - Unlock anytime to allow changes

## � Scoring System

### Weighted 3-Category System

The system uses a professional weighted scoring approach:

**Category 1 (Weight: 60%)**

- Score 1: 0-60 points
- Score 2: 0-20 points
- Score 3: 0-20 points
- Subtotal: 100 points

**Category 2 (Weight: 20%)**

- Score 1: 0-50 points
- Score 2: 0-50 points
- Subtotal: 100 points

**Category 3 (Weight: 20%)**

- Score 1: 0-40 points
- Score 2: 0-30 points
- Score 3: 0-20 points
- Subtotal: 100 points

**Final Score Formula:**

```
Weighted Total = (Category 1 × 0.6) + (Category 2 × 0.2) + (Category 3 × 0.2)
Maximum: 100 points
```

📖 **[Full Scoring System Documentation](./SCORING_SYSTEM.md)**

## 🎨 Customization

### Scoring Categories

To customize the scoring system:

- **Database Schema**: Edit `supabase-schema.sql` (column names, max values, weights)
- **Judge Interface**: Edit `src/pages/JudgePage.jsx` (slider ranges, labels)
- **Results Display**: Edit `src/components/admin/ResultsBoard.jsx` (table columns)
- **Calculations**: Edit `src/lib/utils.js` (weighted formula)

📋 **[Migration Guide](./SCORING_MIGRATION.md)** - If upgrading from old system

### Colors and Styling

The project uses Tailwind with a custom color palette. Edit `tailwind.config.js` and `src/index.css` to customize.

## 🚀 Deployment

### Deploy to Vercel/Netlify

1. Push your code to GitHub
2. Connect your repository to Vercel or Netlify
3. Add environment variables (Supabase URL and key)
4. Deploy!

### Local Network Deployment

For pageant day, you can run the system on a local computer and access it via LAN:

1. Ensure all devices are on the same network
2. Run `npm run dev` on the host computer
3. Share the local IP address with judges
4. Project the leaderboard on a screen

## 📱 Mobile Optimization

The system is fully responsive and optimized for:

- Tablets (iPad, Android tablets)
- Phones (iPhone, Android)
- Desktop computers

Judges can comfortably score on any device!

## 🔒 Security Notes

- This system uses Supabase Row Level Security (RLS) with permissive policies
- It's designed for trusted, closed environments (pageant events)
- For production use, consider implementing proper authentication
- Judge URLs should be kept private (they act as access tokens)

## 🐛 Troubleshooting

### "Missing Supabase environment variables"

- Make sure `.env` file exists with correct credentials
- Restart the dev server after creating `.env`

### Scores not updating in real-time

- Check your Supabase project is active
- Verify real-time is enabled in Supabase settings
- Check browser console for errors

### Can't access from other devices

- Make sure all devices are on the same network
- Check firewall settings on the host computer
- Try accessing with the correct local IP address

## 📄 License

MIT License - Feel free to use this for your events!

## 🤝 Contributing

Pull requests are welcome! For major changes, please open an issue first.

## ✨ Credits

Built with ❤️ for seamless pageant tabulation

---

**Happy Scoring! 🏆✨**
