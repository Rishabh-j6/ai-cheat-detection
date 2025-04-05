import cv2
import numpy as np
import pygetwindow as gw
import time
from collections import deque
from ultralytics import YOLO
import mss
import mss.tools


class EProctor:
    def __init__(self):
        # Initializing the model
        try:
            self.face_m = YOLO('yolov8n-face.pt')
        except:
            try:
                self.face_m = YOLO('yolov8n.pt')
                print("Using standard YOLOv8 model (face-specific model not found)")
            except Exception as e:
                raise RuntimeError(f"Failed to load YOLO model: {str(e)}")

        # Monitoring parameters
        self.face_detection_interval = 0.5  # seconds
        self.max_look_away_time = 5
        self.max_absence_time = 10
        self.gaze_change_threshold = 0.4
        self.screen_check_interval = 2
        self.allowed_applications = ['Exam Client', 'Calculator', 'Exam Proctoring System']  # Added "Exam Proctoring System"
        self.forbidden_keywords = ['Google', 'Wikipedia', 'ChatGPT']

        # Tracking variables
        self.last_face_time = time.time()
        self.last_look_away_time = None
        self.last_screen_check = 0
        self.face_positions = deque(maxlen=30)
        self.gaze_directions = deque(maxlen=30)
        self.screen_activity_log = []

        # Alert system
        self.active_alerts = {}  # Dictionary to store active alerts and their start time
        self.alert_display_duration = 5  # seconds to display an alert
        self.last_face_box = None
        self.last_alert_display_time = time.time()

    def detect_faces(self, frame):
        """Detect faces in the frame with confidence and size filtering"""
        try:
            results = self.face_m(frame, verbose=False, conf=0.7)  # Set confidence threshold to 0.7
            faces = []

            for result in results:
                if result.boxes is None:
                    continue

                boxes = result.boxes.xyxy.cpu().numpy()
                confidences = result.boxes.conf.cpu().numpy() if result.boxes.conf is not None else [1.0] * len(boxes)
                landmarks = None
                if hasattr(result, 'keypoints') and result.keypoints is not None:
                    try:
                        landmarks = result.keypoints.xy.cpu().numpy()
                    except:
                        landmarks = None

                for i, (box, conf) in enumerate(zip(boxes, confidences)):
                    try:
                        if conf < 0.7:  # Skip low-confidence detections
                            continue
                        box = [float(x) for x in box]
                        width = box[2] - box[0]
                        height = box[3] - box[1]
                        if width * height < 5000:  # Minimum area threshold to filter small detections
                            continue
                        center = ((box[0] + box[2]) / 2, (box[1] + box[3]) / 2)
                        faces.append({
                            'box': box,
                            'center': center,
                            'landmarks': landmarks[i] if landmarks is not None and i < len(landmarks) else None,
                            'confidence': conf
                        })
                    except Exception as e:
                        print(f"Invalid face coordinates: {e}")
                        continue

            print(f"Detected {len(faces)} faces with confidences: {[f['confidence'] for f in faces]}")  # Debug print
            return faces

        except Exception as e:
            print(f"Face detection error: {str(e)}")
            return []

    def estimate_gaze(self, landmarks):
        """Estimate gaze direction from landmarks"""
        try:
            if landmarks is None or len(landmarks) < 3:
                return (0, 0)

            left_eye = [float(x) for x in landmarks[0]]
            right_eye = [float(x) for x in landmarks[1]]
            nose = [float(x) for x in landmarks[2]]

            eye_center = ((left_eye[0] + right_eye[0]) / 2,
                          (left_eye[1] + right_eye[1]) / 2)
            direction = (nose[0] - eye_center[0], nose[1] - eye_center[1])

            magnitude = np.sqrt(direction[0] ** 2 + direction[1] ** 2)
            if magnitude > 0:
                direction = (direction[0] / magnitude, direction[1] / magnitude)

            return direction

        except:
            return (0, 0)

    def analyze_gaze_patterns(self):
        """Analyze gaze patterns for suspicious activity"""
        if len(self.gaze_directions) < 10:
            return False

        try:
            changes = []
            for i in range(1, len(self.gaze_directions)):
                prev = self.gaze_directions[i - 1]
                curr = self.gaze_directions[i]
                change = np.sqrt((curr[0] - prev[0]) ** 2 + (curr[1] - prev[1]) ** 2)
                changes.append(change)

            avg_change = np.mean(changes) if changes else 0
            return avg_change > self.gaze_change_threshold

        except:
            return False

    def check_screen_activity(self):
        """Check for unauthorized screen activity"""
        try:
            windows = gw.getAllTitles()
            current_window = gw.getActiveWindow()

            for window in windows:
                if window:
                    for keyword in self.forbidden_keywords:
                        if keyword.lower() in window.lower():
                            return f"Forbidden application: {window}"

            if current_window:
                allowed = any(app.lower() in current_window.title.lower()
                              for app in self.allowed_applications)
                if not allowed:
                    return f"Unauthorized app: {current_window.title}"

            # Periodic screen capture
            if time.time() - self.last_screen_check > 30:
                self.capture_screen()
                self.last_screen_check = time.time()

            return None

        except Exception as e:
            print(f"Screen monitoring error: {str(e)}")
            return None

    def capture_screen(self):
        """Capture screen for manual review"""
        try:
            with mss.mss() as sct:
                monitor = sct.monitors[1]
                screenshot = sct.grab(monitor)
                timestamp = time.strftime("%Y%m%d_%H%M%S")
                filename = f"screen_capture_{timestamp}.png"
                mss.tools.to_png(screenshot.rgb, screenshot.size, output=filename)
                self.screen_activity_log.append(filename)
        except Exception as e:
            print(f"Screen capture failed: {str(e)}")

    def update_alerts(self, alert_type, alert_message):
        """Update alert system with new alerts"""
        current_time = time.time()

        # If this is a new alert or the existing one needs refreshing
        if alert_type not in self.active_alerts or current_time - self.active_alerts[alert_type]['start_time'] > self.alert_display_duration:
            self.active_alerts[alert_type] = {
                'message': alert_message,
                'start_time': current_time
            }

        # Remove expired alerts
        to_remove = [k for k, v in self.active_alerts.items()
                     if current_time - v['start_time'] > self.alert_display_duration]
        for key in to_remove:
            del self.active_alerts[key]

    def clear_alert(self, alert_type):
        """Clear a specific alert"""
        if alert_type in self.active_alerts:
            del self.active_alerts[alert_type]

    def draw_alerts(self, frame):
        """Draw all active alerts on the frame"""
        current_time = time.time()
        y_position = 50

        for alert in self.active_alerts.values():
            # Only draw if not expired
            if current_time - alert['start_time'] <= self.alert_display_duration:
                cv2.putText(frame, alert['message'], (20, y_position),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)
                y_position += 30  # Move down for next alert

    def process_webcam_frame(self, frame):
        """Process webcam frame for monitoring"""
        current_time = time.time()
        faces = []

        if current_time - self.last_face_time >= self.face_detection_interval:
            self.last_face_time = current_time
            faces = self.detect_faces(frame)

            # Absence detection
            if len(faces) == 0:
                if current_time - self.last_face_time > self.max_absence_time:
                    self.update_alerts('absence', "STUDENT MISSING")
                else:
                    self.clear_alert('absence')
            else:
                self.clear_alert('absence')

            # Multiple people detection
            if len(faces) > 1:
                self.update_alerts('multiple', "MULTIPLE PEOPLE DETECTED")
            else:
                self.clear_alert('multiple')  # Clear multiple people alert if 0 or 1 face detected

            # Single face processing
            if len(faces) == 1:
                face = faces[0]
                self.last_face_box = face['box']

                # Gaze estimation
                gaze = self.estimate_gaze(face.get('landmarks'))
                if gaze:
                    self.gaze_directions.append(gaze)

                    # Check if looking away
                    if abs(gaze[0]) > 0.5:  # Looking left/right
                        if self.last_look_away_time is None:
                            self.last_look_away_time = current_time
                        elif current_time - self.last_look_away_time > self.max_look_away_time:
                            self.update_alerts('gaze', "LOOKING AWAY FROM SCREEN")
                    else:
                        self.last_look_away_time = None
                        self.clear_alert('gaze')

                    # Gaze analysis
                    if self.analyze_gaze_patterns():
                        self.update_alerts('patterns', "SUSPICIOUS GAZE PATTERNS")
                    else:
                        self.clear_alert('patterns')

        # Screen monitoring (independent of face detection)
        if current_time - self.last_screen_check >= self.screen_check_interval:
            screen_alert = self.check_screen_activity()
            if screen_alert:
                if "Forbidden" in screen_alert:
                    self.update_alerts('forbidden', screen_alert)
                else:
                    self.update_alerts('unauthorized', screen_alert)
            else:
                self.clear_alert('forbidden')
                self.clear_alert('unauthorized')
            self.last_screen_check = current_time

    def run_proctoring(self):
        """Main proctoring loop"""
        try:
            cap = cv2.VideoCapture(0)
            if not cap.isOpened():
                raise RuntimeError("ERROR: Could not open webcam")

            print("Proctoring system started. Press 'q' to quit.")

            while True:
                ret, frame = cap.read()
                if not ret:
                    print("Error reading frame")
                    break

                frame = cv2.flip(frame, 1)

                # Process frame and update alerts
                self.process_webcam_frame(frame)

                # Draw face box if available
                if self.last_face_box is not None:
                    try:
                        x1, y1, x2, y2 = map(int, self.last_face_box)
                        cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
                    except:
                        pass

                # Draw all active alerts
                self.draw_alerts(frame)

                # Show frame
                cv2.imshow('Exam Proctoring System', frame)
                if cv2.waitKey(1) & 0xFF == ord('q'):
                    break

        except Exception as e:
            print(f"Fatal error: {str(e)}")
        finally:
            cap.release()
            cv2.destroyAllWindows()
            print("Proctoring session ended")


if __name__ == "__main__":
    proctor = EProctor()
    proctor.run_proctoring()