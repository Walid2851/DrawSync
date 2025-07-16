from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.background import BackgroundTasks
import asyncio
import threading
import time
from .database import engine, SessionLocal
from .models import user, game_room, game_session, player_stats
from .api import auth_router, rooms_router, games_router, users_router
from .services.room_service import RoomService
from .config import settings

# Create database tables
user.Base.metadata.create_all(bind=engine)
game_room.Base.metadata.create_all(bind=engine)
game_session.Base.metadata.create_all(bind=engine)
player_stats.Base.metadata.create_all(bind=engine)

# Create FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="A real-time multiplayer drawing game similar to skribbl.io",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_router)
app.include_router(rooms_router)
app.include_router(games_router)
app.include_router(users_router)


def cleanup_rooms_background():
    """Background task to periodically clean up rooms"""
    while True:
        try:
            db = SessionLocal()
            try:
                # Clean up full rooms
                full_rooms_deleted = RoomService.delete_full_rooms(db)
                # Clean up old inactive rooms (older than 24 hours)
                old_rooms_deleted = RoomService.cleanup_inactive_rooms(db, hours_old=24)
                
                if full_rooms_deleted > 0 or old_rooms_deleted > 0:
                    print(f"Background cleanup: {full_rooms_deleted} full rooms, {old_rooms_deleted} old rooms cleaned")
            finally:
                db.close()
        except Exception as e:
            print(f"Error in background room cleanup: {e}")
        
        # Run cleanup every 5 minutes
        time.sleep(300)


@app.on_event("startup")
async def startup_event():
    """Start background tasks on startup"""
    # Start room cleanup in background thread
    cleanup_thread = threading.Thread(target=cleanup_rooms_background, daemon=True)
    cleanup_thread.start()
    print("🚀 Background room cleanup started")


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": f"Welcome to {settings.APP_NAME}",
        "version": settings.APP_VERSION,
        "docs": "/docs",
        "redoc": "/redoc"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": settings.APP_NAME}


@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    """Global HTTP exception handler"""
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail}
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG
    ) 