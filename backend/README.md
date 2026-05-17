# DeFi Staking Dashboard — Backend API

Express + TypeScript backend with Prisma ORM, PostgreSQL, and Socket.io for real-time updates.

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Set Up Environment Variables

```bash
cp .env.example .env
# Edit .env with your PostgreSQL connection string and JWT secret
```

### 3. Set Up the Database

```bash
# Generate Prisma Client (TypeScript types from schema)
npx prisma generate

# Run migrations to create database tables
npx prisma migrate dev --name init

# (Optional) Open Prisma Studio to browse your data
npx prisma studio
```

### 4. Run the Server

```bash
# Development with hot reload
npm run dev:watch

# Or one-shot development run
npm run dev
```

The server will start on `http://localhost:3003`.

---

## 📡 API Endpoints

| Method | Endpoint  | Description                               |
| ------ | --------- | ----------------------------------------- |
| GET    | `/`       | Health check — returns `{ status: "ok" }` |
| GET    | `/health` | Detailed health check with timestamp      |

---

## 🗄️ Database (Prisma + PostgreSQL)

### What is Prisma?

Prisma is an ORM (Object-Relational Mapper) — a tool that lets you write database code using JavaScript/TypeScript objects instead of raw SQL.

**Without Prisma (raw SQL):**

```sql
SELECT id, wallet_address, created_at FROM users WHERE wallet_address = '0xabc...';
```

**With Prisma:**

```typescript
const user = await prisma.user.findUnique({
  where: { walletAddress: "0xabc..." },
});
```

Prisma gives you:

- **Type safety** — If you mistype a field, TypeScript catches it before runtime
- **Auto-completion** — Your IDE knows every table and column
- **Migrations** — Change your schema, run `prisma migrate dev`, database updates automatically
- **Query optimization** — Prisma writes efficient SQL for you

### Useful Commands

```bash
# After editing prisma/schema.prisma, apply changes to the database
npx prisma migrate dev --name add_new_field

# Regenerate the Prisma Client (TypeScript types)
npx prisma generate

# Browse your database in a GUI
npx prisma studio
```

---

## 🔌 Socket.io (Real-Time)

Socket.io is configured on the same port as the HTTP server. The frontend can connect to:

```javascript
import { io } from "socket.io-client";
const socket = io("http://localhost:3003");

socket.on("connect", () => {
  console.log("Connected to backend");
});
```

You can emit events from route handlers to push live updates to connected clients.

---

## 📁 Project Structure

```
backend/
├── src/
│   ├── server.ts          # Entry point — Express + Socket.io setup
│   ├── routes/
│   │   ├── health.ts      # Health check endpoints
│   │   └── index.ts       # Route exports
│   ├── middleware/        # Express middleware (auth, validation, etc.)
│   ├── services/          # Business logic
│   └── lib/
│       └── prisma.ts      # Singleton PrismaClient instance
├── prisma/
│   └── schema.prisma      # Database schema definition
├── .env.example           # Environment variable template
├── tsconfig.json          # TypeScript configuration
└── package.json
```

---

## 🛠️ Scripts

| Script               | Description                   |
| -------------------- | ----------------------------- |
| `npm run dev`        | Run server once with ts-node  |
| `npm run dev:watch`  | Run with hot reload (nodemon) |
| `npm run build`      | Compile TypeScript to `dist/` |
| `npm start`          | Run compiled production build |
| `npm run db:migrate` | Run Prisma migrations         |
| `npm run db:studio`  | Open Prisma Studio GUI        |

---

## 🔒 Security Notes

- Never commit `.env` — it contains your database password and JWT secret
- `JWT_SECRET` should be a cryptographically secure random string
- In production, use HTTPS and restrict CORS to your actual frontend domain
