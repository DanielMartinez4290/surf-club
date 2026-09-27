# Wakesurf Club

Expo/React Native app for Austin's wake &amp; surf outing club. Built from Wave's codebase, carrying over auth, events (repurposed as club outings), messaging, profile editing, and the admin dashboard — swiping/matching, likes, Stories, and Wall Posts were intentionally dropped.

## Setup

```bash
cp .env.example .env   # fill in EXPO_PUBLIC_API_URL and, once you have it, the Stripe publishable key
npm install
npx expo start
```

Point `EXPO_PUBLIC_API_URL` at the [surf-club-atx-api](../surf-club-atx-api) backend. If testing on a physical device (not a simulator), use your computer's LAN IP instead of `localhost` — a phone can't reach your computer's localhost.

This app has native modules (Stripe, image picker, location, etc.) that Expo Go does not support — run it with a development build:

```bash
npx expo run:ios       # or: eas build --profile development --platform ios
npx expo run:android
```

## Dependency choices

Picked deliberately to avoid the App Store/Play Store submission issues the old app hit — see the root project's plan for the full rationale. In short: Expo-managed modules wherever possible, no client-side cloud credentials (uploads go through the backend), no background location, no camera module this round, and a single current version of React Navigation.

## What's not built yet

- Stories/camera, Wall Posts, and paid-organizer Stripe Connect payouts were out of scope for this first pass.
- `eas.json` / EAS project ID still need to be set up (`eas init`) before a real store build.
- App icon/splash are still Expo's defaults — swap `assets/icon.png` etc. before shipping.
