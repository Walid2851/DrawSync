# DrawSync Architecture & Technology Flow

## 🏗️ System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                                    DRAWSYNC ARCHITECTURE                            │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                     │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐                │
│  │   FRONTEND      │    │   BACKEND       │    │   DATABASE      │                │
│  │   (React)       │    │   (FastAPI)     │    │   (SQLite)      │                │
│  │   Port: 3000    │    │   Port: 8000    │    │   File-based    │                │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘                │
│           │                       │                       │                        │
│           │ HTTP/REST API         │                       │                        │
│           │ (Authentication,      │                       │                        │
│           │  Room Management)     │                       │                        │
│           │                       │                       │                        │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐                │
│  │   WebSocket     │    │   WebSocket     │    │   Python Socket │                │
│  │   Client        │◄──►│   Bridge        │◄──►│   Server        │                │
│  │   (Browser)     │    │   Port: 8002    │    │   Port: 8001    │                │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘                │
│           │                       │                       │                        │
│           │ Real-time             │                       │                        │
│           │ Communication         │                       │                        │
│           │ (Drawing, Chat,       │                       │                        │
│           │  Game State)          │                       │                        │
│                                                                                     │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

## 🔄 Detailed Technology Flow

### 1. **User Authentication Flow**
```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Browser   │───►│  FastAPI    │───►│  Database   │───►│   JWT       │
│   (React)   │    │  Server     │    │  (SQLite)   │    │   Token     │
│             │◄───│  Port:8000  │◄───│             │◄───│             │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
       │                   │                   │                   │
       │ 1. Login/Register │ 2. Validate User  │ 3. Store/Retrieve │ 4. Generate Token
       │                   │                   │                   │
       └───────────────────┴───────────────────┴───────────────────┘
```

### 2. **Real-time Communication Flow**
```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Browser   │    │ WebSocket   │    │ Python      │    │   Game      │
│   Client    │    │ Bridge      │    │ Socket      │    │   Logic     │
│   (React)   │    │ Port:8002   │    │ Server      │    │   Engine    │
│             │    │             │    │ Port:8001   │    │             │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
       │                   │                   │                   │
       │ 1. WebSocket      │ 2. Protocol       │ 3. Raw TCP        │ 4. Process
       │    Connection     │    Translation    │    Socket         │    Game Event
       │                   │                   │                   │
       │◄──────────────────│◄──────────────────│◄──────────────────│
       │ 8. Update UI      │ 7. Forward to     │ 6. Send to        │ 5. Broadcast
       │                   │    WebSocket      │    Bridge         │    to Players
```

### 3. **Drawing Data Flow**
```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Canvas    │    │ WebSocket   │    │ Python      │    │   All       │
│   Drawing   │    │ Bridge      │    │ Socket      │    │   Players   │
│   Event     │    │             │    │ Server      │    │   in Room   │
│             │    │             │    │             │    │             │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
       │                   │                   │                   │
       │ 1. Mouse/Touch    │ 2. JSON Message   │ 3. Validate &     │ 4. Real-time
       │    Event          │    Forward        │    Process        │    Broadcast
       │                   │                   │                   │
       │◄──────────────────│◄──────────────────│◄──────────────────│
       │ 8. Update Canvas  │ 7. Forward to     │ 6. Send to        │ 5. Drawing
       │                   │    WebSocket      │    Bridge         │    Data
```

## 🛠️ Technology Stack Details

### **Frontend Layer**
```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React)                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │   React     │  │  React      │  │   Zustand   │            │
│  │   Router    │  │  Hooks      │  │   State     │            │
│  │             │  │             │  │  Management │            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
│         │                 │                 │                  │
│         │                 │                 │                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │   Canvas    │  │   Chat      │  │   Player    │            │
│  │   Drawing   │  │   System    │  │   List      │            │
│  │   Component │  │             │  │             │            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
│         │                 │                 │                  │
│         │                 │                 │                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │   WebSocket │  │   Axios     │  │   Tailwind  │            │
│  │   Client    │  │   HTTP      │  │   CSS       │            │
│  │   Manager   │  │   Client    │  │   Styling   │            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### **Backend Layer**
```
┌─────────────────────────────────────────────────────────────────┐
│                        BACKEND (Python)                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │   FastAPI   │  │   Python    │  │ WebSocket   │            │
│  │   Server    │  │   Socket    │  │   Bridge    │            │
│  │   Port:8000 │  │   Server    │  │   Port:8002 │            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
│         │                 │                 │                  │
│         │                 │                 │                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │   SQLAlchemy│  │   JWT       │  │   Threading │            │
│  │   ORM       │  │   Auth      │  │   & Async   │            │
│  │             │  │             │  │             │            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
│         │                 │                 │                  │
│         │                 │                 │                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │   Pydantic  │  │   Word      │  │   Game      │            │
│  │   Schemas   │  │   Manager   │  │   Logic     │            │
│  │             │  │             │  │   Engine    │            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 🔄 Complete Data Flow Sequence

### **1. User Login Process**
```
┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐
│ Browser │─►│ FastAPI │─►│ Database│─►│ JWT Gen │─►│ Browser │
│         │  │ /auth   │  │ Validate│  │ Token   │  │ Store   │
│         │◄─│ login   │◄─│ User    │◄─│         │◄─│ Token   │
└─────────┘  └─────────┘  └─────────┘  └─────────┘  └─────────┘
```

### **2. Room Creation & Joining**
```
┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐
│ Browser │─►│ FastAPI │─►│ Database│─►│ Room    │─►│ Browser │
│ Create  │  │ /rooms  │  │ Store   │  │ Created │  │ Room ID │
│ Room    │  │ POST    │  │ Room    │  │         │  │         │
│         │◄─│         │◄─│ Data    │◄─│         │◄─│         │
└─────────┘  └─────────┘  └─────────┘  └─────────┘  └─────────┘
```

### **3. Real-time Game Communication**
```
┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐
│ Browser │─►│ WebSocket│─►│ Python  │─►│ Game    │─►│ All     │
│ Draw    │  │ Bridge  │  │ Socket  │  │ Logic   │  │ Players │
│ Event   │  │         │  │ Server  │  │ Process │  │ in Room │
│         │◄─│         │◄─│         │◄─│         │◄─│         │
└─────────┘  └─────────┘  └─────────┘  └─────────┘  └─────────┘
```

## 🎮 Game State Management

### **State Flow in Socket Server**
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Client        │    │   Socket        │    │   Game          │
│   Connection    │    │   Server        │    │   State         │
│                 │    │                 │    │                 │
│ 1. Connect      │───►│ 2. Authenticate │───►│ 3. Join Room    │
│                 │    │                 │    │                 │
│ 4. Ready        │───►│ 5. Update State │───►│ 6. Start Game   │
│                 │    │                 │    │                 │
│ 7. Draw/Chat    │───►│ 8. Broadcast    │───►│ 9. Update Game  │
│                 │    │                 │    │                 │
│ 10. Guess       │───►│ 11. Validate    │───►│ 12. End Round   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🔧 Service Orchestration

### **Startup Sequence**
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Main Script   │    │   FastAPI       │    │   Socket        │
│   start_drawsync│    │   Server        │    │   Services      │
│   .py           │    │   (Port 8000)   │    │   (Port 8001/2) │
│                 │    │                 │    │                 │
│ 1. Start        │───►│ 2. Initialize   │───►│ 3. Start        │
│    Script       │    │    Database     │    │    Socket       │
│                 │    │                 │    │    Server       │
│                 │    │                 │    │                 │
│                 │    │                 │    │ 4. Start        │
│                 │    │                 │    │    WebSocket    │
│                 │    │                 │    │    Bridge       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 📊 Performance Characteristics

### **Latency Comparison**
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Browser       │    │   WebSocket     │    │   Python        │
│   WebSocket     │    │   Bridge        │    │   Socket        │
│   (High Latency)│    │   (Medium       │    │   (Low Latency) │
│                 │    │    Latency)     │    │                 │
│ ~5-10ms         │───►│ ~2-5ms          │───►│ ~0.1-1ms        │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### **Scalability Architecture**
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Load          │    │   Multiple      │    │   Database      │
│   Balancer      │    │   Socket        │    │   Clustering    │
│                 │    │   Servers       │    │                 │
│                 │    │                 │    │                 │
│  ┌─────────┐    │    │  ┌─────────┐    │    │  ┌─────────┐    │
│  │ Server1 │    │    │  │ Socket1 │    │    │  │ Primary │    │
│  └─────────┘    │    │  └─────────┘    │    │  └─────────┘    │
│                 │    │                 │    │                 │
│  ┌─────────┐    │    │  ┌─────────┐    │    │  ┌─────────┐    │
│  │ Server2 │    │    │  │ Socket2 │    │    │  │ Replica │    │
│  └─────────┘    │    │  └─────────┘    │    │  └─────────┘    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🔐 Security Architecture

### **Authentication Flow**
```
┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐
│ Browser │─►│ FastAPI │─►│ JWT     │─►│ Socket  │─►│ Game    │
│ Login   │  │ Auth    │  │ Token   │  │ Server  │  │ Access  │
│         │  │         │  │         │  │ Validate│  │         │
│         │◄─│         │◄─│         │◄─│ Token   │◄─│         │
└─────────┘  └─────────┘  └─────────┘  └─────────┘  └─────────┘
```

## 🎯 Key Benefits of This Architecture

1. **Performance**: Raw TCP sockets provide minimal latency for real-time drawing
2. **Browser Compatibility**: WebSocket bridge enables browser clients
3. **Scalability**: Can scale socket servers independently
4. **Reliability**: Robust error handling and connection management
5. **Flexibility**: Separate concerns between HTTP API and real-time communication
6. **Maintainability**: Clear separation of technologies and responsibilities

This architecture provides the optimal balance between performance, compatibility, and maintainability for a real-time multiplayer drawing game. 