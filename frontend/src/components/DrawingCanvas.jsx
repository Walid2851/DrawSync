import React, { useRef, useEffect, useState, useCallback } from 'react';
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
    if (!isDrawing || !isGameActive || !isCurrentDrawer) return;

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
  }, [isDrawing, isGameActive, isCurrentDrawer, brushColor, brushSize, sendDrawData, addDrawingData, user]);

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
    const pos = getMousePos(e);
    draw(pos.x, pos.y);
  }, [getMousePos, draw]);

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
    const pos = getTouchPos(e);
    draw(pos.x, pos.y);
  }, [getTouchPos, draw]);

  const handleTouchEnd = useCallback((e) => {
    e.preventDefault();
    stopDrawing();
  }, [stopDrawing]);

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        className={`border-2 border-gray-300 rounded-lg bg-white ${
          isCurrentDrawer && isGameActive ? 'cursor-crosshair' : 'cursor-not-allowed'
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
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-lg">
          <p className="text-white text-lg font-medium">
            Game not started yet
          </p>
        </div>
      )}
      
      {isGameActive && !isCurrentDrawer && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 rounded-lg">
          <p className="text-white text-lg font-medium">
            {gameState?.current_drawer_id ? 
              `Waiting for ${gameState.current_drawer_id === user?.id ? 'you' : 'someone'} to draw...` : 
              'Waiting for drawer...'
            }
          </p>
        </div>
      )}

      {/* Drawing controls for current drawer */}
      {isCurrentDrawer && isGameActive && (
        <div className="absolute top-4 left-4 bg-white bg-opacity-90 p-3 rounded-lg shadow-lg">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Color:</label>
              <input
                type="color"
                value={brushColor}
                onChange={(e) => useGameStore.getState().setBrushColor(e.target.value)}
                className="w-8 h-8 border rounded cursor-pointer"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Size:</label>
              <input
                type="range"
                min="1"
                max="20"
                value={brushSize}
                onChange={(e) => useGameStore.getState().setBrushSize(parseInt(e.target.value))}
                className="w-20"
              />
              <span className="text-xs">{brushSize}</span>
            </div>
            <button
              onClick={clearCanvas}
              className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600"
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DrawingCanvas; 