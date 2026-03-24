# SmartDeskAssistant

This is an Expo React Native project. The instructions below show how to install dependencies and run the app on Android, web, or a physical device. They also include troubleshooting tips for common errors (for example `fetch failed` when starting Expo).

## Prerequisites
- Node.js (LTS recommended). This project used Node 20.x during development. Some dependencies may warn if your Node is a different patch (e.g., `>=20.19.4`).
- npm (or yarn)
- Android Studio + AVD (to run Android emulator) if you want to run on Android from Linux
- Expo Go (Android device) if you want to run on a physical device

## Quick start
Open a terminal and run these commands from the project root (where this `README.md` and `package.json` live):

```bash
cd SmartDeskAssistant

# Install dependencies (npm or yarn)
npm install
# or
yarn

# Ensure Expo-native navigation dependencies are installed with SDK-compatible versions
npx expo install react-native-gesture-handler react-native-reanimated

# Start Expo dev server
npm start

# If QR scan fails from another network or shared/live workspace, use tunnel mode
npx expo start --tunnel

# Alternative: start in offline mode and clear Metro cache (useful if the CLI fails fetching remote metadata)
npx expo start --offline -c

# Open on Android emulator / connected device
npm run android

# Open in browser (web)
npm run web
```

## Common issues & fixes

- "ConfigError: The expected package.json path ... does not exist"
  - This happens if you run `expo` or `npm start` from a directory that does not contain the project's `package.json`. Make sure you `cd` into `SmartDeskAssistant` before starting.

- "TypeError: fetch failed" when running `expo start`
  - This is usually a network call the Expo CLI tries to make while validating package versions. A reliable workaround is to run Expo in offline mode and clear Metro cache:

    ```bash
    npx expo start --offline -c
    ```

- Engine warnings like `Unsupported engine` for Node
  - Some packages require a minimum Node patch (for example `>=20.19.4`). If you see warnings but the server runs, you can usually continue. If you encounter runtime errors in Metro or build tools, update Node to the required patch using `nvm`:

    ```bash
    # install nvm (if needed)
    curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.4/install.sh | bash

    # install and use a specific Node version
    nvm install 20.19.4
    nvm use 20.19.4
    node -v
    ```

## Running on a physical Android device
1. Install Expo Go from Google Play.
2. Connect your phone to the same Wi-Fi network as your computer.
3. Run `npm start` and scan the QR code printed by Expo DevTools with the Expo Go app (or the Camera app if supported).

If the app still does not open after scanning QR:
1. Update Expo Go to the latest version from Play Store/App Store.
2. Run `npx expo start --tunnel -c` instead of plain `npm start`.
3. Make sure dependencies are SDK-compatible by running `npx expo install` commands above.
4. If your phone is on mobile data/VPN and your computer is on Wi-Fi, disable VPN or use the same network.

## Useful Expo CLI keybindings
- a : open Android
- w : open web
- r : reload app
- c or --clear : clear Metro cache

## If you want me to...
- Start the Expo server in a background terminal and keep it running here, I can do that and share logs.
- Add a short troubleshooting script or GitHub Actions workflow to validate local environment.

---
Generated on: 2025-10-08
