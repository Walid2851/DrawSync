import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Palette, Eraser, RotateCcw, Settings } from 'lucide-react';
import useGameStore from '../store/gameStore';
import useAuthStore from '../store/authStore';

const DrawingCanvas = ({ width = 800, height = 600 }) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastX, setLastX] = useState(0);
  const [lastY, setLastY] = useState(0);
  const [currentStroke, setCurrentStroke] = useState([]);
  const [lastDrawingDataLength, setLastDrawingDataLength] = useState(0);

  const { user } = useAuthStore();
  const {
    isDrawingMode,
    brushColor,
    brushSize,
    drawingData,
    addDrawingData,
    sendDrawData,
    currentDrawer,
    isGameActive,
    gameState,
    clearDrawing,
    sendClearCanvas,
  } = useGameStore();

  // Check if current user is the drawer
  const isCurrentDrawer = gameState?.current_drawer_id === user?.id || false;

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Set canvas size
    canvas.width = width;
    canvas.height = height;
    
    // Set default styles
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, width, height);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, [width, height]);

  // Clear canvas when game starts new round or drawing data is cleared
  useEffect(() => {
    if (isGameActive && gameState?.current_round) {
      clearCanvas();
      clearDrawing();
    }
  }, [gameState?.current_round, isGameActive]);

  // Clear canvas when drawing data is cleared
  useEffect(() => {
    if (drawingData.length === 0 && isGameActive) {
      clearCanvas();
    }
  }, [drawingData.length, isGameActive]);

  // Improved drawing data processing - redraw entire canvas for proper synchronization
  useEffect(() => {
    if (drawingData.length > 0) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      // Clear canvas first
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, width, height);
      
      // Group drawing data by user to handle strokes properly
      const strokesByUser = {};
      
      drawingData.forEach((data) => {
        if (!strokesByUser[data.user_id]) {
          strokesByUser[data.user_id] = [];
        }
        strokesByUser[data.user_id].push(data);
      });
      
      // Draw each user's strokes
      Object.values(strokesByUser).forEach((userStrokes) => {
        if (userStrokes.length === 0) return;
        
        // Sort strokes by timestamp
        const sortedStrokes = userStrokes.sort((a, b) => {
          return (a.timestamp || 0) - (b.timestamp || 0);
        });
        
        // Draw the stroke
        ctx.strokeStyle = sortedStrokes[0].color || '#000000';
        ctx.lineWidth = sortedStrokes[0].brush_size || 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        
        let isFirstPoint = true;
        
        for (let i = 0; i < sortedStrokes.length; i++) {
          const stroke = sortedStrokes[i];
          
          if (stroke.is_drawing) {
            if (isFirstPoint || stroke.is_first_point) {
              ctx.moveTo(stroke.x, stroke.y);
              isFirstPoint = false;
            } else {
              ctx.lineTo(stroke.x, stroke.y);
            }
          } else {
            // End the current stroke
            ctx.stroke();
            ctx.beginPath();
            isFirstPoint = true;
          }
        }
        
        // Stroke the final path
        if (!isFirstPoint) {
          ctx.stroke();
        }
      });
      
      setLastDrawingDataLength(drawingData.length);
    }
  }, [drawingData, width, height]);

  const getMousePos = useCallback((e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }, []);

  const getTouchPos = useCallback((e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (touch.clientX - rect.left) * scaleX,
      y: (touch.clientY - rect.top) * scaleY,
    };
  }, []);

  const startDrawing = useCallback((x, y) => {
    if (!isGameActive || !isCurrentDrawer) return;
    
    setIsDrawing(true);
    setLastX(x);
    setLastY(y);
    setCurrentStroke([{ x, y, is_drawing: true }]);
    
    // Send first point with is_first_point flag
    const drawData = {
      x,
      y,
      is_drawing: true,
      is_first_point: true,
      color: brushColor,
      brush_size: brushSize,
    };

    sendDrawData(drawData);
    
    // Add user info to local drawing data
    const localDrawData = {
      ...drawData,
      user_id: user?.id,
      username: user?.username,
      timestamp: Date.now()
    };
    addDrawingData(localDrawData);
  }, [isGameActive, isCurrentDrawer, brushColor, brushSize, sendDrawData, addDrawingData, user]);

  const draw = useCallback((x, y) => {
    if (!isGameActive || !isCurrentDrawer || !isDrawing) return;

    // Add to current stroke
    setCurrentStroke(prev => [...prev, { x, y, is_drawing: true }]);

    // Send drawing data to server
    const drawData = {
      x,
      y,
      is_drawing: true,
      is_first_point: false,
      color: brushColor,
      brush_size: brushSize,
    };

    sendDrawData(drawData);
    
    // Add user info to local drawing data
    const localDrawData = {
      ...drawData,
      user_id: user?.id,
      username: user?.username,
      timestamp: Date.now()
    };
    addDrawingData(localDrawData);

    setLastX(x);
    setLastY(y);
  }, [isGameActive, isCurrentDrawer, isDrawing, brushColor, brushSize, sendDrawData, addDrawingData, user]);

  const stopDrawing = useCallback(() => {
    if (!isGameActive || !isCurrentDrawer) return;
    
    setIsDrawing(false);
    
    // Send stop drawing signal
    const drawData = {
      x: lastX,
      y: lastY,
      is_drawing: false,
      color: brushColor,
      brush_size: brushSize,
    };

    sendDrawData(drawData);
    
    // Add user info to local drawing data
    const localDrawData = {
      ...drawData,
      user_id: user?.id,
      username: user?.username,
      timestamp: Date.now()
    };
    addDrawingData(localDrawData);
    
    setCurrentStroke([]);
  }, [isGameActive, isCurrentDrawer, lastX, lastY, brushColor, brushSize, sendDrawData, addDrawingData, user]);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, width, height);
    setLastDrawingDataLength(0);
    
    // Send clear canvas request to server
    if (isGameActive && isCurrentDrawer) {
      sendClearCanvas();
    }
  }, [width, height, isGameActive, isCurrentDrawer, sendClearCanvas]);

  // Mouse events
  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    const pos = getMousePos(e);
    startDrawing(pos.x, pos.y);
  }, [getMousePos, startDrawing]);

  const handleMouseMove = useCallback((e) => {
    e.preventDefault();
    if (!isDrawing) return; // Only draw if mouse button is pressed
    const pos = getMousePos(e);
    draw(pos.x, pos.y);
  }, [getMousePos, draw, isDrawing]);

  const handleMouseUp = useCallback((e) => {
    e.preventDefault();
    stopDrawing();
  }, [stopDrawing]);

  const handleMouseLeave = useCallback((e) => {
    e.preventDefault();
    stopDrawing();
  }, [stopDrawing]);

  // Touch events
  const handleTouchStart = useCallback((e) => {
    e.preventDefault();
    const pos = getTouchPos(e);
    startDrawing(pos.x, pos.y);
  }, [getTouchPos, startDrawing]);

  const handleTouchMove = useCallback((e) => {
    e.preventDefault();
    if (!isDrawing) return; // Only draw if touch is active
    const pos = getTouchPos(e);
    draw(pos.x, pos.y);
  }, [getTouchPos, draw, isDrawing]);

  const handleTouchEnd = useCallback((e) => {
    e.preventDefault();
    stopDrawing();
  }, [stopDrawing]);

  // Add document-level mouse up handler to stop drawing when mouse is released outside canvas
  useEffect(() => {
    const handleDocumentMouseUp = () => {
      if (isDrawing) {
        stopDrawing();
      }
    };

    document.addEventListener('mouseup', handleDocumentMouseUp);
    return () => {
      document.removeEventListener('mouseup', handleDocumentMouseUp);
    };
  }, [isDrawing, stopDrawing]);

  return (
    <div className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        className={`w-full h-full rounded-2xl shadow-2xl border-2 border-slate-200 bg-white transition-all duration-200 ${
          isCurrentDrawer && isGameActive 
            ? 'cursor-crosshair hover:border-blue-300' 
            : 'cursor-not-allowed opacity-90'
        }`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          width: `${width}px`,
          height: `${height}px`,
          maxWidth: '100%',
          maxHeight: '100%',
        }}
      />
      
      {!isGameActive && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm rounded-2xl">
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-slate-400 to-slate-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Palette className="w-8 h-8 text-white" />
            </div>
            <p className="text-white text-lg font-semibold">
              Game not started yet
            </p>
            <p className="text-slate-300 text-sm mt-1">
              Wait for the game to begin to start drawing
            </p>
          </div>
        </div>
      )}

      {/* Drawing controls for current drawer */}
      {isCurrentDrawer && isGameActive && (
        <div className="absolute top-4 left-4 glass-card p-4 rounded-2xl shadow-xl">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <Palette className="w-4 h-4 text-slate-600" />
              <label className="text-sm font-semibold text-slate-700">Color:</label>
              <input
                type="color"
                value={brushColor}
                onChange={(e) => useGameStore.getState().setBrushColor(e.target.value)}
                className="w-8 h-8 border-2 border-slate-200 rounded-lg cursor-pointer hover:scale-110 transition-transform duration-200"
              />
            </div>
            
            <div className="flex items-center gap-3">
              <Settings className="w-4 h-4 text-slate-600" />
              <label className="text-sm font-semibold text-slate-700">Size:</label>
              <input
                type="range"
                min="1"
                max="20"
                value={brushSize}
                onChange={(e) => useGameStore.getState().setBrushSize(parseInt(e.target.value))}
                className="w-20 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer slider"
              />
              <span className="text-xs font-semibold text-slate-700 min-w-[20px]">{brushSize}</span>
            </div>
            
            <button
              onClick={clearCanvas}
              className="flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-red-500 to-pink-500 text-white text-sm font-semibold rounded-xl hover:from-red-600 hover:to-pink-600 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              <RotateCcw className="w-4 h-4" />
              Clear Canvas
            </button>
          </div>
        </div>
      )}

      {/* Drawing indicator */}
      {isCurrentDrawer && isGameActive && (
        <div className="absolute top-4 right-4 glass-card px-4 py-2 rounded-xl">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-semibold text-slate-700">Drawing Mode</span>
          </div>
        </div>
      )}

      {/* Brush preview */}
      {isCurrentDrawer && isGameActive && (
        <div className="absolute bottom-4 right-4 glass-card p-3 rounded-xl">
          <div 
            className="rounded-full border-2 border-slate-300"
            style={{
              width: `${brushSize * 2}px`,
              height: `${brushSize * 2}px`,
              backgroundColor: brushColor,
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
            }}
          />
        </div>
      )}
    </div>
  );
};

export default DrawingCanvas; 