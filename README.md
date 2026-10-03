# Real-Time Collaborative Whiteboard Application

A production-quality, full-stack real-time collaborative whiteboard application engineered with Next.js, React, TypeScript, HTML5 Canvas API, Tailwind CSS, Node.js, Express, Socket.IO, PostgreSQL, Prisma ORM, and Google Gemini AI.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue)
![Next.js](https://img.shields.io/badge/Next.js-14%2F15-black)
![Socket.IO](https://img.shields.io/badge/Socket.IO-4.7-black)
![Prisma](https://img.shields.io/badge/Prisma-5.19-emerald)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-blue)
![AI Whiteboard Assistant](https://img.shields.io/badge/AI-Whiteboard%20Assistant-purple)

> 📘 **Production Architecture Documentation**: See [`PRODUCTION_ARCHITECTURE.md`](file:///d:/myprojects/Real-Time%20Whiteboard%20App/PRODUCTION_ARCHITECTURE.md) for full architectural design and cloud deployment strategy.  
> 📊 **User Management & Audit Report**: See [`USER_MANAGEMENT_AND_DEPLOYMENT_REPORT.md`](file:///d:/myprojects/Real-Time%20Whiteboard%20App/USER_MANAGEMENT_AND_DEPLOYMENT_REPORT.md) for complete compliance matrix and Vercel/Node.js step-by-step deployment guide.

---

## 🚀 Key Features

- **⚡ Sub-20ms Real-Time Synchronization**: Multi-user freehand drawing powered by Socket.IO WebSocket channels.
- **🎨 HTML5 Canvas Engine**: Dual-layer canvas architecture supporting brush tools, erasers, color pickers, custom stroke sizes, sub-pixel high-DPI scaling (`window.devicePixelRatio`), and smooth quadratic bezier path interpolation.
- **📱 Multi-Device Vector Normalization**: Stroke points are normalized to `0.0 - 1.0` coordinate ratios, guaranteeing identical rendering across mobile, tablet, and high-resolution desktop viewports.
- **👥 Live User Presence & Partner Cursors**: Dynamic online collaborator badges with avatar indicators and real-time remote cursor positioning badges.
- **🚪 Room Isolation Architecture**: Isolated Socket.IO room namespaces (`/whiteboard/[roomCode]`). Events in Room A are never leaked to Room B.
- **💾 State Persistence & Late-Join Sync**: PostgreSQL database backing via Prisma ORM. Late-joining participants instantly receive complete historical stroke state upon entering a room.
- **↩️ Collaborative Undo / Redo & Clear Board**: Synchronized stroke history manipulation across all connected room participants with safety confirmation modals.
- **✨ AI Whiteboard Assistant (`✨ Ask AI`)**: General-purpose multimodal AI assistant that dynamically detects whiteboard content context (Mathematics, Education, Software Architecture, Science/Diagrams, Business Workflows, Project Planning, or General Sketches) and provides targeted action modes (Summarize, Explain, Solve Step-by-Step, Find Mistakes, Generate Quiz Questions, Create Study Notes, Optimize) alongside custom natural language Q&A.
- **📸 High-Resolution Export**: One-click PNG/JPEG whiteboard snapshot export.
- **📱 Touch & Pointer Support**: Unified Pointer Events API (`onPointerDown`, `onPointerMove`, `onPointerUp`) supporting mouse, touch screen, and stylus pen seamlessly.

---

## 🏗️ Architecture Overview

```mermaid
graph TD
    subgraph Client ["Frontend Client (Next.js 14 / React 18)"]
        UI["React UI Components (Toolbar, Header, Badges)"]
        CanvasEngine["HTML5 Canvas Engine (useCanvas)"]
        StateMgr["Whiteboard State Manager (useWhiteboardState)"]
        SocketClient["Socket.IO Client Helper (socket.ts)"]
        AIPanel["✨ Whiteboard AI Side Panel (AIAnalysisPanel)"]
    end

    subgraph Network ["WebSocket / REST Layer"]
        WSS["Socket.IO Engine (Port 4000)"]
        REST["Express REST API (/api/rooms)"]
        AIRoute["Express AI API (/api/ai/whiteboard)"]
    end

    subgraph Server ["Backend Server (Node.js / Express / TS)"]
        RoomHandler["Room Handler (roomHandler.ts)"]
        DrawingHandler["Drawing Event Handler (drawingHandler.ts)"]
        CursorHandler["Cursor Handler (cursorHandler.ts)"]
        StrokeService["Stroke Sync & Batch Persistence Service"]
        AIService["Multimodal AI Whiteboard Service (aiService.ts)"]
    end

    subgraph External ["Database & AI Models"]
        PrismaORM["Prisma ORM Client"]
        PostgresDB[("PostgreSQL Database")]
        GeminiAPI["Google Gemini Multimodal API"]
    end

    CanvasEngine -->|Throttled Point Segments (~16ms)| SocketClient
    SocketClient <-->|WebSocket Full-Duplex| WSS
    UI <--> REST
    AIPanel -->|Vector Strokes + Canvas PNG| AIRoute
    AIRoute -->|IP Rate Limit + Zod Validation| AIService
    AIService <-->|Secure API Key| GeminiAPI
    WSS --> RoomHandler
    WSS --> DrawingHandler
    WSS --> CursorHandler
    DrawingHandler --> StrokeService
    StrokeService --> PrismaORM
    PrismaORM <--> PostgresDB
```

---

## 📂 Project Structure

```
Real-Time Whiteboard App/
├── client/                     # Next.js 14 App Router Frontend
│   ├── app/
│   │   ├── page.tsx            # SaaS Landing Page (Create / Join room)
│   │   ├── whiteboard/[roomCode]/page.tsx  # Whiteboard Studio Workplace
│   │   ├── layout.tsx
│   │   └── globals.css         # Tailwind directives & custom CSS
│   ├── components/
│   │   └── whiteboard/
│   │       ├── Canvas.tsx      # Dual-layer canvas container
│   │       ├── Toolbar.tsx     # Floating glassmorphic control bar with ✨ Ask AI
│   │       ├── AIAnalysisPanel.tsx # ✨ Whiteboard AI Assistant side panel
│   │       ├── UserPresence.tsx# Online collaborator badge bar
│   │       ├── CursorOverlay.tsx# Live remote collaborator cursors
│   │       ├── RoomHeader.tsx  # Header bar with shareable link & room code
│   │       └── ConfirmClearModal.tsx # Confirmation modal dialog
│   ├── hooks/
│   │   ├── useCanvas.ts        # Pointer capture, DPI scaling, batching
│   │   ├── useSocket.ts        # Socket.IO connection & event handlers
│   │   └── useWhiteboardState.ts # Local stroke state & undo/redo manager
│   ├── lib/
│   │   ├── canvas-utils.ts     # Path smoothing & vector normalization
│   │   ├── socket.ts           # Socket.IO client singleton
│   │   └── utils.ts            # Helper functions (cn, room code generator)
│   ├── types/
│   │   ├── whiteboard.ts       # Shared frontend TypeScript interfaces
│   │   └── ai.ts               # Whiteboard AI result & action TypeScript interfaces
│   └── package.json
│
├── server/                     # Node.js + Express + Socket.IO Backend
│   ├── src/
│   │   ├── server.ts           # Server entry point & HTTP listener
│   │   ├── app.ts              # Express configuration & CORS
│   │   ├── socket/
│   │   │   ├── index.ts        # Socket.IO server initialization
│   │   │   ├── roomHandler.ts  # Room join/leave & presence lifecycle
│   │   │   ├── drawingHandler.ts # Real-time stroke broadcasts & undo/redo
│   │   │   └── cursorHandler.ts  # Cursor positioning broadcasts
│   │   ├── services/
│   │   │   ├── roomService.ts  # In-memory user presence & DB room lookup
│   │   │   ├── strokeService.ts# Active stroke buffers & Prisma DB persistence
│   │   │   └── aiService.ts    # Multimodal AI Whiteboard Assistant engine & fallbacks
│   │   ├── controllers/
│   │   │   ├── roomController.ts # REST API controllers
│   │   │   └── aiController.ts   # AI Whiteboard Assistant controller
│   │   ├── routes/
│   │   │   ├── roomRoutes.ts   # Express REST routes
│   │   │   └── aiRoutes.ts     # Express AI routes (/api/ai/whiteboard)
│   │   ├── validators/
│   │   │   ├── socketSchemas.ts# Zod WebSocket schemas
│   │   │   └── aiSchemas.ts    # Zod AI request & response schemas
│   │   ├── types/
│   │   │   └── index.ts        # Server TypeScript event contracts
│   │   └── lib/
│   │       └── prisma.ts       # Prisma Client singleton
│   ├── prisma/
│   │   └── schema.prisma       # PostgreSQL schema models
│   ├── package.json
│   └── .env
│
├── README.md
└── .env.example
```

---

## ⚡ Technical Challenges & Solutions

### 1. Real-Time Drawing Optimization & Throttling
- **Challenge**: Sending raw pointer move events on every browser pixel event (~120-240Hz on high refresh rate displays) overloads WebSocket buffers and causes network congestion.
- **Solution**: Implemented point sampling throttling. Points are accumulated in `pendingPointsRef` and emitted in 16ms batches (~60fps). Local canvas drawing uses imperative 2D context operations (`drawStroke`) to render immediately without waiting for React re-render loops.

### 2. Resolution & Cross-Device Coordinate Normalization
- **Challenge**: Users join from screens with different resolutions (e.g., 4K desktop vs 1080p laptop vs mobile). Absolute pixel coordinates (`x: 450, y: 300`) break positioning across different viewports.
- **Solution**: All raw pointer coordinates are normalized relative to canvas bounding box:
  $$\text{Normalized } x = \frac{x_{\text{client}} - \text{rect.left}}{\text{rect.width}}$$
  $$\text{Normalized } y = \frac{y_{\text{client}} - \text{rect.top}}{\text{rect.height}}$$
  Receiving clients denormalize points using their own canvas width and height, preserving exact vector proportions.

### 3. Smooth Freehand Curve Interpolation
- **Challenge**: Drawing straight lines between raw sampled points produces jagged, polygon-like paths.
- **Solution**: Implemented quadratic bezier curve path interpolation in `canvas-utils.ts`:
  ```typescript
  for (let i = 1; i < pts.length - 1; i++) {
    const midX = (pts[i].x + pts[i + 1].x) / 2;
    const midY = (pts[i].y + pts[i + 1].y) / 2;
    ctx.quadraticCurveTo(pts[i].x, pts[i].y, midX, midY);
  }
  ```

### 4. Multimodal Grounding & Strict Separation of Facts vs Inferences
- **Challenge**: Generative AI models can hallucinate or force generic software architecture interpretations on classroom mathematics notes, biology sketches, or business flowcharts.
- **Solution**: The server-side master system prompt enforces strict output separation into:
  - `observations`: Only visible facts detected on the canvas (text, stroke coordinates, shapes).
  - `inferences`: Derived logical interpretations.
  - `uncertainties`: Low-confidence or ambiguous items.
  Outputs are parsed through Zod schemas before being returned to the UI.

---

## 🗄️ Database Schema (`prisma/schema.prisma`)

```prisma
model Room {
  id        String   @id @default(uuid())
  roomCode  String   @unique
  name      String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  strokes Stroke[]
  users   User[]
}

model User {
  id        String   @id @default(uuid())
  socketId  String?  @unique
  name      String
  color     String   @default("#3b82f6")
  roomId    String?
  room      Room?    @relation(fields: [roomId], references: [id], onDelete: SetNull)
  createdAt DateTime @default(now())
  strokes   Stroke[]
}

model Stroke {
  id        String   @id @default(uuid())
  roomId    String
  room      Room     @relation(fields: [roomId], references: [id], onDelete: Cascade)
  userId    String?
  user      User?    @relation(fields: [userId], references: [id], onDelete: SetNull)
  tool      String   @default("brush")
  color     String   @default("#000000")
  size      Int      @default(4)
  points    Json     // Array of normalized point vectors
  isDeleted Boolean  @default(false)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

---

## 🛠️ Local Development Setup

### Prerequisites
- **Node.js**: v18.0+ or v20.0+
- **NPM**: v9.0+
- **PostgreSQL / SQLite**: Database instance

### 1. Clone & Configure Environment Variables
Copy `.env.example` to `server/.env` and `client/.env.local`:

```bash
# In server/.env
PORT=4000
NODE_ENV=development
CLIENT_ORIGIN=http://localhost:3000
DATABASE_URL="file:./dev.db"
AI_API_KEY="YOUR_GEMINI_API_KEY"
AI_MODEL="gemini-flash-latest"
```

### 2. Install Dependencies & Push Database Schema

```bash
# Install server dependencies
cd server
npm install
npx prisma db push

# Install client dependencies
cd ../client
npm install
```

### 3. Start Server & Client

```bash
# Terminal 1: Backend Server (Port 4000)
cd server
npm run dev

# Terminal 2: Frontend Client (Port 3000)
cd client
npm run dev
```

Open `http://localhost:3000` in multiple browser windows or devices to test real-time collaboration.

---

## ⌨️ Keyboard Shortcuts

- `B`: Switch to Brush Tool
- `E`: Switch to Eraser Tool
- `Ctrl + Z` / `Cmd + Z`: Undo Stroke
- `Ctrl + Y` / `Cmd + Shift + Z`: Redo Stroke

---

## ✨ AI Whiteboard Assistant (`✨ Ask AI`)

### Overview
The **AI Whiteboard Assistant** upgrades the whiteboard into an intelligent collaborative workspace. Users can draw anything—classroom lecture notes, mathematical equations, physics/biology/chemistry diagrams, flowcharts, software architecture, business workflows, or mind maps—and click **`✨ Ask AI`**.

### Core Capabilities
1. **Dynamic Context Detection**: Automatically classifies board content into Mathematics, Education, Science, Software, Business, Planning, or General Sketches with confidence scoring.
2. **Action Chips**:
   - `📝 Summarize`: Concise summary of board contents.
   - `💡 Explain`: Contextual explanation tailored to detected subject.
   - `🧠 Solve Steps`: Step-by-step mathematical/logical problem resolution.
   - `🔍 Find Mistakes`: Bug, error, or bottleneck detection.
   - `📚 Study Notes`: Key takeaways and flashcard-style revision notes.
   - `❓ Quiz Questions`: 3–5 practice/quiz questions generated from board concepts.
   - `🚀 Improve This`: Recommendations and structural enhancements.
3. **Custom Q&A Bar**: Ask arbitrary natural language questions about the whiteboard content (e.g. *"Where should Redis go?"*, *"Explain this equation to a 10 year old"*).

---

## 📜 License

Distributed under the MIT License. Built for portfolio & software engineering evaluation.
