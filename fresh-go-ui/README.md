# FreshFood UI

A shared UI workspace for the FreshFood MVP.

- `apps/customer`: Expo React Native customer app
- `apps/admin`: Next.js + TypeScript operations dashboard
- `apps/delivery`: Next.js + TypeScript mobile-first partner portal
- `packages/design-tokens`: shared colors, spacing, and order types
- `packages/ui`: universal cross-platform UI component library (React Native + Next.js via react-native-web)

## Run

```bash
npm install
npm run dev:admin
npm run dev:delivery
npm run dev:customer
```

The web apps use ports 3002 (admin) and 3001 (delivery) by default. The Expo app runs through the Expo CLI.
