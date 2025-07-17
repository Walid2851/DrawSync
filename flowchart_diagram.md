# DrawSync System Flowchart

## 🎯 Complete System Flow

```mermaid
graph TD
    A[User Opens Browser] --> B[React App Loads]
    B --> C{User Authenticated?}
    
    C -->|No| D[Show Login Page]
    D --> E[User Enters Credentials]
    E --> F[FastAPI /auth/login]
    F --> G[Database Validate User]
    G --> H[JWT Token Generated]
    H --> I[Token Stored in Browser]
    I --> J[Redirect to Dashboard]
    
    C -->|Yes| J
    
    J --> K[User Creates/Joins Room]
    K --> L[FastAPI /rooms/]
    L --> M[Database Store Room]
    M --> N[Room ID Returned]
    N --> O[User Joins Game Room]
    
    O --> P[WebSocket Connection]
    P --> Q[WebSocket Bridge Port:8002]
    Q --> R[Python Socket Server Port:8001]
    R --> S[Authenticate with JWT]
    S --> T[Join Room in Socket Server]
    
    T --> U{Game Started?}
    U -->|No| V[Wait for Players]
    V --> W[Player Ready Status]
    W --> X[All Players Ready?]
    X -->|No| V
    X -->|Yes| Y[Start Game]
    
    U -->|Yes| Y
    
    Y --> Z[Assign Word to Drawer]
    Z --> AA[Start Drawing Timer]
    AA --> BB[Player Draws on Canvas]
    BB --> CC[Canvas Event Handler]
    CC --> DD[WebSocket Send Draw Data]
    DD --> EE[Bridge Forward to Socket]
    EE --> FF[Socket Server Process]
    FF --> GG[Broadcast to All Players]
    GG --> HH[Bridge Forward to WebSocket]
    HH --> II[Browser Update Canvas]
    II --> JJ{Time Remaining?}
    JJ -->|Yes| BB
    JJ -->|No| KK[End Round]
    
    KK --> LL[Calculate Scores]
    LL --> MM[Next Player Turn?]
    MM -->|Yes| Z
    MM -->|No| NN[End Game]
    
    NN --> OO[Show Final Scores]
    OO --> PP[Return to Dashboard]
    PP --> K
```

## 🔄 Real-time Drawing Flow

```mermaid
sequenceDiagram
    participant U as User
    participant C as Canvas
    participant WS as WebSocket Client
    participant WB as WebSocket Bridge
    participant PS as Python Socket Server
    participant O as Other Players
    
    U->>C: Mouse/Touch Event
    C->>WS: sendDrawData(x, y, isDrawing)
    WS->>WB: WebSocket Message
    WB->>PS: TCP Socket Message
    PS->>PS: Validate & Process
    PS->>WB: Broadcast to All Players
    WB->>WS: WebSocket Message
    WS->>C: Update Canvas
    C->>O: Real-time Drawing Display
```

## 💬 Chat & Guessing Flow

```mermaid
sequenceDiagram
    participant U as User
    participant C as Chat Input
    participant WS as WebSocket Client
    participant WB as WebSocket Bridge
    participant PS as Python Socket Server
    participant G as Game Logic
    participant O as Other Players
    
    U->>C: Type Message/Guess
    C->>WS: sendChatMessage() / sendGuess()
    WS->>WB: WebSocket Message
    WB->>PS: TCP Socket Message
    PS->>G: Process Message
    G->>G: Validate Guess/Word
    G->>PS: Result
    PS->>WB: Broadcast Result
    WB->>WS: WebSocket Message
    WS->>C: Display Result
    PS->>O: Notify Other Players
```

## 🔐 Authentication Flow

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant API as FastAPI
    participant DB as Database
    participant JWT as JWT Service
    participant WS as WebSocket
    
    U->>F: Login Credentials
    F->>API: POST /auth/login
    API->>DB: Validate User
    DB->>API: User Data
    API->>JWT: Generate Token
    JWT->>API: JWT Token
    API->>F: Token Response
    F->>F: Store Token
    F->>WS: Connect with Token
    WS->>API: Validate Token
    API->>WS: Authentication Result
```

## 🎮 Game State Management Flow

```mermaid
stateDiagram-v2
    [*] --> Lobby
    Lobby --> Waiting: Join Room
    Waiting --> Ready: All Players Ready
    Ready --> Drawing: Start Game
    Drawing --> Guessing: Word Assigned
    Guessing --> Drawing: Next Turn
    Guessing --> RoundEnd: Time Up
    RoundEnd --> Drawing: More Rounds
    RoundEnd --> GameEnd: All Rounds Done
    GameEnd --> Lobby: Return to Lobby
    
    state Drawing {
        [*] --> Active
        Active --> Paused: Pause
        Paused --> Active: Resume
        Active --> [*]: End Round
    }
    
    state Guessing {
        [*] --> Open
        Open --> Correct: Right Guess
        Open --> [*]: Time Up
        Correct --> [*]: All Guessed
    }
```

## 🔧 Service Startup Flow

```mermaid
graph TD
    A[Start DrawSync] --> B[Main Script]
    B --> C[Start FastAPI Server]
    C --> D[Initialize Database]
    D --> E[Load Models & Schemas]
    E --> F[Start Socket Services]
    F --> G[Start Python Socket Server]
    G --> H[Initialize Socket Handler]
    H --> I[Start WebSocket Bridge]
    I --> J[Bridge Ready]
    J --> K[All Services Running]
    
    C --> L[Port 8000 Active]
    G --> M[Port 8001 Active]
    I --> N[Port 8002 Active]
    
    L --> O[HTTP API Ready]
    M --> P[Socket Server Ready]
    N --> Q[WebSocket Bridge Ready]
    
    O --> R[System Ready]
    P --> R
    Q --> R
```

## 📊 Data Flow Architecture

```mermaid
graph LR
    subgraph "Frontend Layer"
        A[React App]
        B[Canvas Component]
        C[Chat Component]
        D[WebSocket Manager]
    end
    
    subgraph "Transport Layer"
        E[WebSocket Bridge]
        F[Protocol Translation]
    end
    
    subgraph "Backend Layer"
        G[Python Socket Server]
        H[Game Logic Engine]
        I[FastAPI Server]
    end
    
    subgraph "Data Layer"
        J[SQLite Database]
        K[Word Manager]
        L[JWT Service]
    end
    
    A --> E
    B --> E
    C --> E
    D --> E
    E --> F
    F --> G
    G --> H
    H --> I
    I --> J
    I --> K
    I --> L
    
    G --> F
    F --> E
    E --> A
    E --> B
    E --> C
    E --> D
```

## 🚀 Performance Optimization Flow

```mermaid
graph TD
    A[Browser Request] --> B{Request Type?}
    
    B -->|HTTP API| C[FastAPI Server]
    B -->|Real-time| D[WebSocket Bridge]
    
    C --> E[Database Query]
    E --> F[Response]
    
    D --> G[Protocol Translation]
    G --> H[Python Socket Server]
    H --> I[In-Memory Processing]
    I --> J[Broadcast to Clients]
    J --> K[WebSocket Response]
    
    F --> L[Browser Update]
    K --> L
    
    subgraph "Optimization Points"
        M[Connection Pooling]
        N[Message Buffering]
        O[Select-based I/O]
        P[Thread Management]
    end
    
    H --> M
    H --> N
    H --> O
    H --> P
```

## 🔄 Error Handling Flow

```mermaid
graph TD
    A[System Operation] --> B{Error Occurs?}
    
    B -->|No| C[Continue Normal Flow]
    B -->|Yes| D{Error Type?}
    
    D -->|Connection Lost| E[Reconnect Logic]
    D -->|Authentication Failed| F[Redirect to Login]
    D -->|Game Error| G[Reset Game State]
    D -->|System Error| H[Log & Notify]
    
    E --> I[Attempt Reconnection]
    I --> J{Reconnect Success?}
    J -->|Yes| K[Restore Session]
    J -->|No| L[Show Error Message]
    
    F --> M[Clear Tokens]
    M --> N[Redirect to Login]
    
    G --> O[Reset Room State]
    O --> P[Notify Players]
    
    H --> Q[Error Logging]
    Q --> R[User Notification]
    
    K --> C
    L --> C
    N --> C
    P --> C
    R --> C
```

This comprehensive flowchart shows how all the technologies in your DrawSync project work together, from user interaction to real-time communication, authentication, and error handling. The architecture provides a robust foundation for a multiplayer drawing game with optimal performance and reliability. 