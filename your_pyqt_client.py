import sys
import socket
import threading
import json
from PyQt5.QtWidgets import QApplication, QWidget, QVBoxLayout, QHBoxLayout, QLabel, QLineEdit, QPushButton, QTextEdit, QDialog, QMessageBox
from PyQt5.QtCore import Qt, QPoint, QTimer
from PyQt5.QtGui import QPainter, QPen, QImage

class NicknameDialog(QDialog):
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setWindowTitle("Enter Nickname")
        layout = QVBoxLayout()
        label = QLabel("Choose a nickname:")
        self.nickname_entry = QLineEdit()
        ok_button = QPushButton("OK")
        ok_button.clicked.connect(self.accept)
        layout.addWidget(label)
        layout.addWidget(self.nickname_entry)
        layout.addWidget(ok_button)
        self.setLayout(layout)

class DrawingArea(QWidget):
    def __init__(self):
        super().__init__()
        self.setAttribute(Qt.WA_StaticContents)
        self.setMinimumSize(500, 500)
        self.image = QImage(self.size(), QImage.Format_RGB32)
        self.image.fill(Qt.white)
        self.last_pos = None
        self.drawing = False
        self.enabled = False
        self.brush_size = 3
        self.brush_color = Qt.black

    def mousePressEvent(self, event):
        if event.button() == Qt.LeftButton and self.enabled:
            self.drawing = True
            self.last_pos = event.pos()

    def mouseMoveEvent(self, event):
        if event.buttons() & Qt.LeftButton and self.drawing and self.enabled:
            painter = QPainter(self.image)
            painter.setPen(QPen(self.brush_color, self.brush_size, Qt.SolidLine, Qt.RoundCap, Qt.RoundJoin))
            painter.drawLine(self.last_pos, event.pos())
            self.send_draw_message(self.last_pos, event.pos())
            self.last_pos = event.pos()
            self.update()

    def mouseReleaseEvent(self, event):
        if event.button() == Qt.LeftButton:
            self.drawing = False

    def paintEvent(self, event):
        painter = QPainter(self)
        painter.drawImage(self.rect(), self.image, self.image.rect())

    def send_draw_message(self, start, end):
        message = {
            'type': 'draw',
            'x': end.x(),
            'y': end.y(),
            'is_drawing': True,
            'is_first_point': False,
            'color': '#000000',
            'brush_size': self.brush_size,
            'timestamp': int(time.time() * 1000)
        }
        client.send(json.dumps(message).encode('utf-8') + b'\n')

class App(QWidget):
    def __init__(self):
        super().__init__()
        self.initUI()
        self.nickname = None
        self.room_id = 1
        self.is_drawer = False
        self.current_word = ''
        self.time_remaining = 60
        self.game_started = False
        self.players = []
        
        # Start receiver thread
        threading.Thread(target=self.receive, daemon=True).start()
        
        # Timer for time updates
        self.timer = QTimer()
        self.timer.timeout.connect(self.update_timer)
        self.timer.start(1000)

    def initUI(self):
        self.setWindowTitle("DrawSync - Fixed Version")
        layout = QHBoxLayout(self)
        
        # Left panel
        left_layout = QVBoxLayout()
        layout.addLayout(left_layout)
        
        # Drawing area
        self.drawing_area = DrawingArea()
        layout.addWidget(self.drawing_area)
        
        # Game info
        self.game_state_label = QLabel("Waiting for other players to join", self)
        self.game_state_label.setMaximumWidth(200)
        self.game_state_label.setAlignment(Qt.AlignCenter)
        self.game_state_label.setWordWrap(True)
        
        # Control buttons
        self.start_button = QPushButton("Start Game", self)
        self.start_button.clicked.connect(self.start_game)
        self.start_button.setEnabled(False)
        
        self.ready_button = QPushButton("Ready", self)
        self.ready_button.clicked.connect(self.toggle_ready)
        self.ready_button.setEnabled(False)
        
        self.skip_button = QPushButton("Skip Turn", self)
        self.skip_button.clicked.connect(self.skip_turn)
        self.skip_button.setEnabled(False)
        
        self.clear_button = QPushButton("Clear Board", self)
        self.clear_button.clicked.connect(self.clear_board)
        self.clear_button.setEnabled(False)
        
        self.leave_button = QPushButton("Leave Room", self)
        self.leave_button.clicked.connect(self.leave_room)
        
        # Add buttons to left layout
        left_layout.addWidget(self.game_state_label)
        left_layout.addWidget(self.start_button)
        left_layout.addWidget(self.ready_button)
        left_layout.addWidget(self.skip_button)
        left_layout.addWidget(self.clear_button)
        left_layout.addWidget(self.leave_button)
        
        # Right panel
        right_layout = QVBoxLayout()
        
        # Chat area
        self.text_area = QTextEdit()
        self.text_area.setReadOnly(True)
        right_layout.addWidget(self.text_area)
        
        # Message input
        self.msg_entry = QLineEdit()
        self.msg_entry.returnPressed.connect(self.send_message)
        send_button = QPushButton("Send")
        send_button.clicked.connect(self.send_message)
        
        msg_layout = QHBoxLayout()
        msg_layout.addWidget(self.msg_entry)
        msg_layout.addWidget(send_button)
        right_layout.addLayout(msg_layout)
        
        layout.addLayout(right_layout)
        
        # Get nickname first
        self.get_nickname()

    def get_nickname(self):
        dialog = NicknameDialog(self)
        if dialog.exec_() == QDialog.Accepted:
            self.nickname = dialog.nickname_entry.text()
            if self.nickname:
                # Authenticate with fake token
                auth_message = {
                    'type': 'authenticate',
                    'token': f'fake_token_{self.nickname}'
                }
                client.send(json.dumps(auth_message).encode('utf-8') + b'\n')
                
                # Join room after authentication
                threading.Timer(1.0, self.join_room).start()

    def join_room(self):
        join_message = {
            'type': 'join_room',
            'room_id': self.room_id
        }
        client.send(json.dumps(join_message).encode('utf-8') + b'\n')

    def start_game(self):
        start_message = {
            'type': 'start_game'
        }
        client.send(json.dumps(start_message).encode('utf-8') + b'\n')

    def toggle_ready(self):
        ready_message = {
            'type': 'ready',
            'ready': True
        }
        client.send(json.dumps(ready_message).encode('utf-8') + b'\n')

    def skip_turn(self):
        skip_message = {
            'type': 'skip_turn'
        }
        client.send(json.dumps(skip_message).encode('utf-8') + b'\n')

    def clear_board(self):
        self.drawing_area.image.fill(Qt.white)
        self.drawing_area.update()
        
        clear_message = {
            'type': 'clear_canvas'
        }
        client.send(json.dumps(clear_message).encode('utf-8') + b'\n')

    def leave_room(self):
        leave_message = {
            'type': 'leave_room'
        }
        client.send(json.dumps(leave_message).encode('utf-8') + b'\n')
        client.close()
        self.close()

    def send_message(self):
        message_text = self.msg_entry.text().strip()
        if message_text:
            message = {
                'type': 'chat_message',
                'message': message_text
            }
            client.send(json.dumps(message).encode('utf-8') + b'\n')
            self.msg_entry.clear()

    def update_timer(self):
        if self.game_started and self.time_remaining > 0:
            self.time_remaining -= 1
            self.update_game_state()

    def update_game_state(self):
        if self.game_started:
            if self.is_drawer:
                status = f"Your turn to draw! Word: {self.current_word} | Time: {self.time_remaining}s"
            else:
                status = f"Waiting for drawing... Word: {self.current_word} | Time: {self.time_remaining}s"
        else:
            status = f"Players: {len(self.players)} | Waiting to start..."
        
        self.game_state_label.setText(status)

    def receive(self):
        buffer = b''
        while True:
            try:
                data = client.recv(4096)
                if not data:
                    break
                
                buffer += data
                
                # Process complete messages
                while b'\n' in buffer:
                    message_data, buffer = buffer.split(b'\n', 1)
                    
                    if message_data:
                        try:
                            message = json.loads(message_data.decode('utf-8'))
                            self.handle_message(message)
                        except json.JSONDecodeError as e:
                            print(f"Error decoding JSON: {e}")
                            continue
            except Exception as e:
                print(f"Error receiving data: {e}")
                break

    def handle_message(self, message):
        message_type = message.get('type')
        
        if message_type == 'authenticated':
            print(f"Authenticated as {self.nickname}")
            
        elif message_type == 'room_joined':
            self.players = message.get('players', [])
            self.ready_button.setEnabled(True)
            self.start_button.setEnabled(len(self.players) >= 2)
            self.update_game_state()
            self.text_area.append(f"Joined room {message.get('room_id')}")
            
        elif message_type == 'player_joined':
            username = message.get('username')
            self.text_area.append(f"{username} joined the room")
            
        elif message_type == 'player_left':
            username = message.get('username')
            self.text_area.append(f"{username} left the room")
            
        elif message_type == 'game_started':
            self.game_started = True
            self.drawing_area.enabled = False
            self.start_button.setEnabled(False)
            self.ready_button.setEnabled(False)
            self.text_area.append("Game started!")
            
        elif message_type == 'round_started':
            round_num = message.get('round')
            drawer = message.get('drawer')
            self.time_remaining = message.get('time_remaining', 60)
            self.text_area.append(f"Round {round_num} started! {drawer} is drawing")
            
        elif message_type == 'word_assigned':
            self.current_word = message.get('word', '')
            msg = message.get('message', '')
            self.text_area.append(msg)
            
            # Check if this client is the drawer
            if self.current_word and self.current_word != '_' * len(self.current_word):
                self.is_drawer = True
                self.drawing_area.enabled = True
                self.clear_button.setEnabled(True)
                self.skip_button.setEnabled(True)
            else:
                self.is_drawer = False
                self.drawing_area.enabled = False
                self.clear_button.setEnabled(False)
                self.skip_button.setEnabled(False)
            
            self.update_game_state()
            
        elif message_type == 'draw_data':
            data = message.get('data', {})
            if not self.is_drawer:  # Only draw if not the drawer
                x = data.get('x')
                y = data.get('y')
                if x is not None and y is not None:
                    painter = QPainter(self.drawing_area.image)
                    painter.setPen(QPen(Qt.black, 3, Qt.SolidLine, Qt.RoundCap, Qt.RoundJoin))
                    painter.drawPoint(x, y)
                    self.drawing_area.update()
            
        elif message_type == 'chat_message':
            username = message.get('username', 'Unknown')
            msg = message.get('message', '')
            self.text_area.append(f"{username}: {msg}")
            
        elif message_type == 'correct_guess':
            username = message.get('username', 'Unknown')
            word = message.get('word', '')
            self.text_area.append(f"🎉 {username} guessed '{word}' correctly!")
            
        elif message_type == 'round_ended':
            round_num = message.get('round')
            word = message.get('word', '')
            self.text_area.append(f"Round {round_num} ended! Word was: {word}")
            self.drawing_area.enabled = False
            self.clear_button.setEnabled(False)
            self.skip_button.setEnabled(False)
            self.is_drawer = False
            
        elif message_type == 'game_ended':
            final_scores = message.get('final_scores', {})
            self.text_area.append("Game ended!")
            self.text_area.append(f"Final scores: {final_scores}")
            self.game_started = False
            self.drawing_area.enabled = False
            self.clear_button.setEnabled(False)
            self.skip_button.setEnabled(False)
            self.start_button.setEnabled(True)
            self.ready_button.setEnabled(True)
            
        elif message_type == 'time_update':
            self.time_remaining = message.get('time_remaining', 0)
            self.update_game_state()
            
        elif message_type == 'canvas_cleared':
            self.drawing_area.image.fill(Qt.white)
            self.drawing_area.update()
            self.text_area.append("Canvas cleared")
            
        elif message_type == 'room_deleted':
            self.text_area.append("Room has been deleted")
            client.close()
            self.close()
            
        elif message_type == 'error':
            error_msg = message.get('message', 'Unknown error')
            self.text_area.append(f"Error: {error_msg}")

if __name__ == '__main__':
    import time
    
    app = QApplication(sys.argv)
    
    # Create socket connection
    client = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    client.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    
    try:
        host = '127.0.0.1'
        port = 8001
        client.connect((host, port))
        print(f"Connected to {host}:{port}")
        
        ex = App()
        ex.show()
        sys.exit(app.exec_())
        
    except Exception as e:
        print(f"Failed to connect: {e}")
        QMessageBox.critical(None, "Connection Error", f"Failed to connect to server: {e}")
        sys.exit(1) 