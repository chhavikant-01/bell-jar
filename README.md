# Bell Jar

Bell Jar is a **privacy-focused, real-time movie discussion platform** that allows users to create **anonymous preference profiles** based on chat interactions. The system uses **Next.js, PostgreSQL, Redis, and the TMDB API** to provide personalized recommendations while maintaining user control over their data.

## Core Features

### 1. User Profile & Data Privacy
- **Anonymous Account Creation**: Username & password only, no email required
- Secure **encrypted preference storage**

### 2. Movie Selection & Matching
- **TMDB API Integration** for movie search with autocomplete
- **Real-time User Matching** with Redis Pub/Sub

### 3. Chat System (WebSockets & Redis)
- **Anonymous, real-time chat** with ephemeral messages
- Set of 5 structured discussion questions
- **NLP-based Preference Extraction** (API endpoint included)

### 4. UI/UX Design (Retro-Candy Theme)
- **Glass Morphism** with blurry gradients
- **Retro typography** with neon glow effects
- **Animated UI elements** with framer-motion

## Tech Stack

- **Frontend**: Next.js with App Router + Tailwind CSS + Framer Motion
- **Backend**: Next.js API Routes + Redis Pub/Sub + PostgreSQL
- **Authentication**: Custom JWT implementation
- **Real-time**: Socket.IO with Redis adapter

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database
- Redis server
- TMDB API key

### Environment Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Copy `.env.example` to `.env` and configure:
   - `DATABASE_URL`: PostgreSQL connection URL
   - `REDIS_URL`: Redis server URL
   - `TMDB_API_KEY`: Your TMDB API key
   - `JWT_SECRET`: Random string for JWT signing

### Development

```bash
# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev

# Start development server
npm run dev
```

### Production

```bash
# Build for production
npm run build

# Start production server
npm start
```

## Deployment

This application is designed to be deployed on Vercel, with:
- PostgreSQL database (e.g., Neon, Supabase)
- Redis instance (e.g., Upstash, Redis Labs)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
