# ReachInbox Email Job Scheduler

A full-stack email scheduling system featuring a custom job queue, rate limiting, persistence, and a sleek user interface.

## 🔗 Demo Video
*(Link your max 5-minute video here showing scheduling, dashboard filtering, and restart persistence!)*

---

## 🛠️ How to Run Locally

### Prerequisites
- Node.js (v16+)
- npm or yarn

### 1. Setup Backend
The backend runs on Express, uses a local SQLite database (no external DB required), and features a custom Node.js polling worker.

```bash
cd backend
npm install

# Setup environment variables
cp .env.example .env

# Initialize SQLite database
npx prisma db push

# Start the development server and background worker
npm run dev
```

### 2. Setup Frontend
The frontend is built with React and Vite.

```bash
cd frontend
npm install

# Start the frontend development server
npm run dev
```
Navigate to `http://localhost:5173` in your browser.

---

## ⚙️ Environment Variables & Ethereal Email Setup

Your backend requires a `.env` file to function. 

### Ethereal / Gmail Setup
To configure the SMTP sender, you can use Ethereal (mock email for testing) or a real Gmail account. 

**For Ethereal (Mock):**
Generate credentials at [Ethereal Email](https://ethereal.email/create) and place them in the `.env` file:
```env
SMTP_HOST=smtp.ethereal.email
SMTP_PORT=587
SMTP_USER=your-ethereal-user@ethereal.email
SMTP_PASSWORD=your-ethereal-password
```

**For Gmail (Real emails):**
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=your-gmail@gmail.com
SMTP_PASSWORD=your-app-password
```
*Note: The application has built-in Round-Robin load balancing across multiple SMTP transporters in `mailer.ts` to help bypass strict rate limits!*

---

## 🏗️ Architecture Overview

### How Scheduling Works
1. When a user schedules an email via the Frontend, the Express controller saves an `Email` record to the SQLite database with `status = "SCHEDULED"` and a specific `scheduledAt` timestamp.
2. A custom background worker (`emailWorker.ts`) runs an active `setInterval` loop, polling the database every 2 seconds.
3. It fetches emails where `scheduledAt <= now` and processes them in batches.

### Persistence on Restart
All scheduled jobs are persisted in the SQLite database. If the server crashes or stops, no data is lost. Upon restarting the Node.js server, the background worker boots up, queries the database for any emails still marked as `SCHEDULED` or `QUEUED` that are past their execution time, and immediately processes them.

### Rate Limiting & Concurrency
- **Concurrency**: Governed by `WORKER_CONCURRENCY` (default: 5). The polling worker processes batches of emails concurrently using `Promise.allSettled`.
- **Rate Limiting**: An in-memory rate limiting mechanism tracks how many emails have been sent within the current hour.
  - Limits can be applied **Globally** or **Per-Sender**.
  - If a limit is breached, the worker stops sending, updates the email status to `DELAYED`, and modifies the `delayedUntil` timestamp to the next hour. The worker will automatically retry sending it once the hour rolls over.

---

## ✨ Features Implemented

### Backend
- **Custom Scheduler Worker**: Replaces BullMQ/Redis with a lightweight, database-polled queue architecture.
- **Persistence**: SQLite database ensures scheduled jobs survive server restarts.
- **Rate Limiting**: Advanced global and per-sender hourly limits with auto-rescheduling.
- **Concurrency**: Batch processing utilizing asynchronous connection pooling (`pool: true`) on Nodemailer to prevent socket exhaustion.
- **Action Endpoints**: APIs to Star, Archive, and Delete emails cleanly.
- **Load Balancing**: Round-Robin SMTP transporter swapping to bypass individual provider rate limits.

### Frontend
- **Authentication**: Email/Password login and Google OAuth integration.
- **Dashboard UI**: Modern, glass-morphic dashboard displaying email queues.
- **Email Composer**: Rich-text composer supporting multiple concurrent file attachments.
- **Dynamic Tables**: Live-updating tables differentiating between `Scheduled`, `Sent`, `Delayed`, and `Failed` emails.
- **State Management**: Dynamic sorting (starred emails float to the top) and instant UI updates without page reloads.

---

## ⚖️ Trade-offs, Assumptions, & Shortcuts

### 1. SQLite + Custom Worker vs. BullMQ + Redis
**Shortcut taken:** Instead of using Redis and BullMQ for job scheduling as traditionally recommended, this project uses a custom `setInterval` worker querying a local SQLite database.
**Reasoning:** This is a deliberate trade-off to vastly simplify the local setup process for evaluators. It removes the necessity of installing, configuring, and running a local Redis server, while still effectively demonstrating core queue logic, batch processing, and persistence concepts within a pure Node.js environment.

### 2. In-Memory Rate Limiting
**Shortcut taken:** The rate-limiting counters are held in server memory rather than a persistent distributed cache.
**Reasoning:** Because the architecture is designed as a single-node application for this demonstration, in-memory counting is highly performant and sufficient. In a multi-node production deployment, this would be swapped for Redis.

### 3. File Uploads (Multer)
**Assumption:** Attachments are currently stored locally in an `uploads/` directory on the server disk. In a production environment, this would be refactored to stream directly to an AWS S3 bucket to ensure stateless backend scaling.
