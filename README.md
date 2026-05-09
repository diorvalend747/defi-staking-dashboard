## Architecture

┌──────────────┐ REST API / WebSocket ┌──────────────┐
│ Next.js │ ◄──────────────────────────────► │ Express │
│ (Frontend) │ │ (Backend) │
│ wagmi/viem │ │ Prisma/PSQL │
└──────┬───────┘ └──────┬───────┘
│ │
│ Smart Contract Calls │ Event Listener
▼ ▼
┌──────────────┐ ┌──────────────┐
│ Base Sepolia │ │ Base Sepolia │
│ Smart Contract│ │ (Alchemy RPC)│
└──────────────┘ └──────────────┘
