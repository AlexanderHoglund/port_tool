This is a [Next.js](https://nextjs.org) project with TypeScript, Tailwind CSS, and Supabase integration.

## Prerequisites

Note: This project requires Node.js >= 20.9.0

## Setup

1. Install dependencies:

```bash
npm install
```

2. Configure Supabase:

Copy `.env.example` to `.env.local` and add your Supabase credentials:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

You can get these from your [Supabase project dashboard](https://app.supabase.com/).

## Getting Started

Run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Project Structure

- `/app` - Next.js App Router pages and layouts
- `/utils/supabase` - Supabase client utilities
  - `client.ts` - Client-side Supabase client
  - `server.ts` - Server-side Supabase client
  - `middleware.ts` - Supabase middleware helper
- `middleware.ts` - Next.js middleware for session management

## Using Supabase

### Client Components

```typescript
import { createClient } from '@/utils/supabase/client'

export default function ClientComponent() {
  const supabase = createClient()
  // Use supabase client
}
```

### Server Components

```typescript
import { createClient } from '@/utils/supabase/server'

export default async function ServerComponent() {
  const supabase = await createClient()
  // Use supabase client
}
```

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
