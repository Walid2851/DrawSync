import asyncio
import websockets
import json
import socket
import threading
import time
from typing import Dict, Set

class WebSocketBridge:
    """WebSocket bridge to connect browser WebSockets to Python socket server"""
    
    def __init__(self, socket_host='localhost', socket_port=8001, ws_port=8002):
        self.socket_host = socket_host
        self.socket_port = socket_port
        self.ws_port = ws_port
        self.clients: Dict[str, dict] = {}  # websocket_id -> client_info
        self.socket_connections: Dict[str, socket.socket] = {}  # websocket_id -> socket
        self.running = False
        self.loop = None  # Store the main event loop
        
    async def start(self):
        """Start the WebSocket bridge server"""
        self.running = True
        self.loop = asyncio.get_running_loop()  # Store the main event loop
        print(f"🌉 WebSocket Bridge starting on port {self.ws_port}")
        
        async with websockets.serve(self.handle_websocket, "localhost", self.ws_port):
            print(f"✅ WebSocket Bridge ready on ws://localhost:{self.ws_port}")
            await asyncio.Future()  # run forever
    
    async def handle_websocket(self, websocket, path):
        """Handle a new WebSocket connection"""
        client_id = f"ws_{id(websocket)}"
        print(f"🔌 New WebSocket client connected: {client_id}")
        
        # Create socket connection to Python socket server
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.connect((self.socket_host, self.socket_port))
            sock.setblocking(False)
            
            self.clients[client_id] = {
                'websocket': websocket,
                'socket': sock,
                'buffer': b''
            }
            self.socket_connections[client_id] = sock
            
            # Start reader thread for socket
            reader_thread = threading.Thread(
                target=self._socket_reader,
                args=(client_id, sock),
                daemon=True
            )
            reader_thread.start()
            
            try:
                async for message in websocket:
                    await self._handle_websocket_message(client_id, message)
            except websockets.exceptions.ConnectionClosed:
                print(f"🔌 WebSocket client disconnected: {client_id}")
            finally:
                await self._cleanup_client(client_id)
                
        except Exception as e:
            print(f"❌ Error setting up client {client_id}: {e}")
            await websocket.close()
    
    async def _handle_websocket_message(self, client_id: str, message: str):
        """Handle message from WebSocket client"""
        try:
            # Parse the message
            data = json.loads(message)
            
            # Forward to Python socket server
            client_info = self.clients.get(client_id)
            if client_info and client_info['socket']:
                sock = client_info['socket']
                message_bytes = (json.dumps(data) + '\n').encode('utf-8')
                sock.send(message_bytes)
                print(f"📤 Forwarded message from {client_id}: {data.get('type', 'unknown')}")
                
        except json.JSONDecodeError:
            print(f"❌ Invalid JSON from client {client_id}")
        except Exception as e:
            print(f"❌ Error handling message from {client_id}: {e}")
    
    def _socket_reader(self, client_id: str, sock: socket.socket):
        """Read messages from Python socket server and forward to WebSocket"""
        client_info = self.clients.get(client_id)
        if not client_info:
            return
        
        websocket = client_info['websocket']
        
        while self.running and client_id in self.clients:
            try:
                # Use select to check if socket has data
                import select
                ready_to_read, _, _ = select.select([sock], [], [], 0.1)
                
                if ready_to_read:
                    data = sock.recv(4096)
                    if not data:
                        # Socket closed
                        break
                    
                    # Add to buffer
                    client_info['buffer'] += data
                    
                    # Process complete messages
                    while b'\n' in client_info['buffer']:
                        message_data, client_info['buffer'] = client_info['buffer'].split(b'\n', 1)
                        
                        if message_data:
                            try:
                                message = json.loads(message_data.decode('utf-8'))
                                # Forward to WebSocket using the stored event loop
                                if self.loop and not self.loop.is_closed():
                                    asyncio.run_coroutine_threadsafe(
                                        websocket.send(json.dumps(message)),
                                        self.loop
                                    )
                                    print(f"📥 Forwarded message to {client_id}: {message.get('type', 'unknown')}")
                            except json.JSONDecodeError:
                                print(f"❌ Invalid JSON from socket server")
                            except Exception as e:
                                print(f"❌ Error forwarding message to {client_id}: {e}")
                                break
                                
            except Exception as e:
                print(f"❌ Error reading from socket for {client_id}: {e}")
                break
        
        # Cleanup - use synchronous cleanup since we're in a thread
        self._cleanup_client_sync(client_id)
    
    def _cleanup_client_sync(self, client_id: str):
        """Synchronous cleanup for use in background threads"""
        if client_id in self.clients:
            client_info = self.clients[client_id]
            
            # Close socket
            if client_info['socket']:
                try:
                    client_info['socket'].close()
                except:
                    pass
            
            # Schedule WebSocket close in main event loop
            if self.loop and not self.loop.is_closed():
                asyncio.run_coroutine_threadsafe(
                    self._close_websocket(client_info['websocket']),
                    self.loop
                )
            
            # Remove from tracking
            del self.clients[client_id]
            if client_id in self.socket_connections:
                del self.socket_connections[client_id]
            
            print(f"🧹 Cleaned up client: {client_id}")
    
    async def _close_websocket(self, websocket):
        """Close WebSocket connection"""
        try:
            await websocket.close()
        except:
            pass
    
    async def _cleanup_client(self, client_id: str):
        """Clean up client resources"""
        if client_id in self.clients:
            client_info = self.clients[client_id]
            
            # Close socket
            if client_info['socket']:
                try:
                    client_info['socket'].close()
                except:
                    pass
            
            # Close WebSocket
            if client_info['websocket']:
                try:
                    await client_info['websocket'].close()
                except:
                    pass
            
            # Remove from tracking
            del self.clients[client_id]
            if client_id in self.socket_connections:
                del self.socket_connections[client_id]
            
            print(f"🧹 Cleaned up client: {client_id}")
    
    def stop(self):
        """Stop the WebSocket bridge"""
        self.running = False
        print("🛑 WebSocket Bridge stopped")

# Global bridge instance
websocket_bridge = WebSocketBridge()

async def start_websocket_bridge():
    """Start the WebSocket bridge"""
    await websocket_bridge.start()

if __name__ == "__main__":
    asyncio.run(start_websocket_bridge()) 