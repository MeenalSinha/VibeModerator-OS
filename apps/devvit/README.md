# 🛡️ VibeModerator OS

VibeModerator OS is an AI-powered moderation operating system built to protect and manage Reddit communities at scale.

## ✨ Features

- **Automated AI Moderation**: Scans new posts and comments using state-of-the-art AI to detect toxicity, spam, and rule violations.
- **Smart Actions**: Automatically removes rule-breaking content based on your community's specific guidelines.
- **Moderator Dashboard**: A centralized web dashboard for configuring rules, monitoring traffic, and reviewing flagged content.
- **On-Demand Evaluation**: Moderators can instantly evaluate any post or comment via the `Evaluate Content` menu action.
- **Live Status Reporting**: Easily share your community's active protection status with users via the `Post VibeMod Status Update` menu action.

## 🚀 Getting Started

To get the most out of VibeModerator OS, you need to connect this app to your backend cloud infrastructure.

1. Install the app on your subreddit.
2. Go to your subreddit's **Mod Tools** -> **VibeModerator OS** -> **Settings**.
3. Configure the following Installation Settings:
   - **VibeModerator OS Backend URL:** The URL of your Render API backend (e.g. `https://vibemoderator-os.onrender.com`)
   - **VibeModerator OS Dashboard URL:** The URL of your Vercel frontend (e.g. `https://vibe-moderator-os-web.vercel.app`)
4. Configure the **API Secret** globally via the Devvit CLI: `npx devvit settings set VIBEMOD_API_SECRET <your-secret>`
5. Set up your subreddit's custom AI rules in your dashboard!

## 🔒 Privacy & Data

VibeModerator OS only reads the content that triggers its moderation queue and communicates directly with your configured backend. For more details, please review our [Privacy Policy](#) and [Terms of Service](#).
