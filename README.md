# My Slack Bot

A Slack bot built with TypeScript and Node.js using Slack Bolt framework.

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy `.env.example` to `.env` and fill in your Slack app credentials:
   ```bash
   cp .env.example .env
   ```

4. Build the project:
   ```bash
   npm run build
   ```

5. Start the bot:
   ```bash
   npm start
   ```

## Development

Run in development mode with hot reload:
```bash
npm run dev
```

## Scripts

- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start the production server
- `npm run dev` - Start development server with hot reload
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues automatically
- `npm run typecheck` - Run TypeScript type checking
- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode

## Project Structure

```
src/
├── slack/          # Slack-related functionality
├── utils/          # Utility functions
├── types/          # TypeScript type definitions
└── index.ts        # Main entry point
```

## Environment Variables

See `.env.example` for required environment variables.