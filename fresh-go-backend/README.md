# FreshGo Backend API

A production-grade, concurrency-safe, modular backend for the **FreshGo** hyperlocal fresh seafood and meat delivery platform.

Serving:
1. **Customer Mobile App** (React Native / Expo)
2. **Delivery Partner App** (React Native / Next.js)
3. **Admin & Dark Store Dispatch Control Tower** (Next.js)

---

## 🛠 Tech Stack

- **Framework**: [NestJS 10](https://nestjs.com) (Node.js, TypeScript)
- **Database**: PostgreSQL 16
- **ORM**: [Prisma ORM](https://www.prisma.io)
- **In-Memory & Cache**: Redis 7 ([ioredis](https://github.com/redis/ioredis))
- **Background Jobs**: [BullMQ](https://docs.bullmq.io)
- **Real-Time Gateway**: [Socket.io](https://socket.io) (`transports: ['websocket']` with Handshake JWT Auth)
- **Payments**: Cash on Delivery (COD) + [Razorpay](https://razorpay.com)
- **Third-Party Integrations**:
  - **SMS/OTP**: MSG91 (with development mock fallback)
  - **Push Notifications**: Firebase Cloud Messaging (FCM)
  - **Maps**: Google Maps Distance Matrix & Geocoding (with Haversine fallback)
  - **Storage**: Cloudflare R2 / AWS S3

---

## 🏗 Key Domain Architectures Implemented

1. **Concurrency-Safe Inventory Deduction**:
   - Uses raw PostgreSQL row-level locks:
     ```sql
     SELECT id, "productId", "remainingQuantityKg", "version"
     FROM "InventoryBatch"
     WHERE "productId" = $1 AND "isActive" = true AND "freshnessStatus" = 'FRESH'
     FOR UPDATE;
     ```
   - Concurrent checkout attempts that exceed remaining batch inventory are rejected with `409 Conflict` ("Stock changed, please review your cart").

2. **Strict Request Idempotency**:
   - `POST /api/v1/orders` and `POST /api/v1/payments/webhook` enforce `Idempotency-Key` headers.
   - Redis caches `idempotency:{key}` with 24-hour TTL to short-circuit repeated requests and double charges.

3. **Order State Machine & Audit History**:
   - Explicit `ALLOWED_TRANSITIONS` map in `OrdersService` prevents illegal jumps (`PLACED` → `DELIVERED`).
   - Every status transition writes a row to the `OrderStatusEvent` table recording actor, timestamp, and notes.

4. **Variable Weight Pricing & In-App Wallet Shortfall Refunds**:
   - Gross intake weight (e.g. 700g whole fish equivalent) vs. Net dressed yield (500g).
   - When hub staff packs and scales the actual product, any shortfall is automatically credited to the customer's in-app `Wallet` (`WEIGHT_SHORTFALL_CREDIT`) with zero gateway transaction fees.

5. **Delivery Partner COD Limit Enforcement & Cash Settlements**:
   - If a rider's `codCashInHand >= ₹2,500`, the dispatch engine **strictly blocks** auto-assigning new orders.
   - Hub managers record physical cash deposits via `POST /api/v1/delivery/settlements` (`CashSettlement` model) to decrement balance with full audit receipts.

6. **BullMQ Background Queues**:
   - 45-second dispatch acceptance window (`dispatch-queue`).
   - 15-minute stale unpaid order cancellation (`order-timeout-queue`).
   - Recurring batch freshness and spoilage monitoring (`batch-expiry-queue`).

7. **Debounced GPS Persistence**:
   - Real-time rider location streams over Redis + Socket.io for smooth map navigation.
   - Database writes to `DeliveryPartnerProfile` are debounced to persist once every 10 seconds.

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js >= 18.0.0
- Docker & Docker Compose

### 2. Start PostgreSQL & Redis
```bash
docker compose up -d
```

### 3. Install Dependencies & Generate Prisma Client
```bash
npm install
npx prisma generate
```

### 4. Run Database Migrations
```bash
npx prisma migrate dev --name init
```

### 5. Seed Initial Data
Seeds dark stores, delivery zones, categories (Fish, Meat, Veggies), fresh seafood batches, test users, and promo codes:
```bash
npm run seed
```

### 6. Start Development Server
```bash
npm run start:dev
```
- API Endpoint: `http://localhost:4000/api/v1`
- Swagger Interactive Documentation: `http://localhost:4000/api/docs`
- Socket.io Tracking Gateway: `ws://localhost:4000/tracking`

---

## 🧪 Running Automated Tests

```bash
# Run unit tests (pricing math, weight variance refund calculation, state machine matrix)
npm test

# Run integration & E2E tests (idempotency, concurrency race conditions, order lifecycle)
npm run test:e2e
```

---

## 📡 WebSocket Events Reference (`/tracking`)

| Event | Direction | Description |
| :--- | :--- | :--- |
| `subscribe:order` | Client → Server | Joins room `order:{orderId}` (Customer or assigned partner) |
| `subscribe:admin:dispatch` | Client → Server | Joins dark store control room (Admins & Dispatchers only) |
| `partner:location:update` | Client → Server | Partner sends live `{ lat, lng, heading, speed, orderId }` |
| `partner:location` | Server → Client | Emitted to `order:{orderId}` and `admin:dispatch` |
| `order:status:changed` | Server → Client | Emitted when order status progresses |
| `partner:order:new` | Server → Client | 45-second delivery offer emitted to partner's phone |

---

## 📋 Key REST API Endpoints

### 🔐 Authentication (`/api/v1/auth`)
- `POST /auth/otp/send`: Request 6-digit phone OTP
- `POST /auth/otp/verify`: Verify OTP and obtain JWT tokens
- `GET /auth/me`: Current authenticated user

### 🛒 Catalog & Cart (`/api/v1/catalog`, `/api/v1/cart`)
- `GET /catalog/categories`: All active product categories
- `GET /catalog/products`: Filterable catalog with live batch stock & freshness metadata
- `GET /catalog/products/:slug`: Product specifications, cuts, and catch origin
- `GET /cart`: Active Redis cart with price breakdown
- `POST /cart/items`: Add/update/remove items

### 📦 Orders & Payments (`/api/v1/orders`, `/api/v1/payments`)
- `POST /orders` (`Idempotency-Key` header supported): Concurrency-safe checkout
- `GET /orders/my`: Customer order history
- `GET /orders/:id`: Detailed order timeline and tracking info
- `PUT /orders/:id/status`: Transition state machine (e.g. `CUTTING_PREPARING`, `PACKED`)
- `POST /payments/create-order`: Create Razorpay payment order
- `POST /payments/verify`: Verify payment HMAC signature
- `POST /payments/webhook`: Razorpay webhook listener

### 🛵 Delivery & Dispatch (`/api/v1/delivery`, `/api/v1/dispatch`)
- `GET /delivery/dashboard`: Partner earnings, active trip, and COD cash balance
- `POST /delivery/orders/:orderId/accept`: Accept order offer (enforces ₹2,500 limit)
- `PUT /delivery/trips/:tripId/phase`: Advance trip (`ACCEPTED` → `AT_PICKUP` → `ON_THE_WAY` → `DELIVERED`)
- `POST /delivery/settlements`: Hub manager deposits partner COD cash
- `POST /delivery/issues`: Report delays, customer unreachable, vehicle breakdown
- `GET /dispatch/tower`: Admin control tower with fulfillment queue and online partners
- `POST /dispatch/orders/:orderId/assign`: Dispatch order with 45s timer

### 📍 Zones, Coupons, Wallet, & Reviews
- `POST /zones/check-serviceability`: Check address GPS coordinates & delivery fees
- `POST /coupons/validate`: Validate discount code
- `GET /wallet`: Customer wallet balance & weight shortfall refund credits
- `POST /reviews`: Submit customer product review
- `POST /refunds/orders/:orderId/cancel`: Cancel order and issue payment refund
