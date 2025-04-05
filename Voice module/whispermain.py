import tkinter as tk
from tkinter import messagebox
import sounddevice as sd
from scipy.io.wavfile import write
from resemblyzer import VoiceEncoder, preprocess_wav
from scipy.spatial.distance import cosine
import numpy as np
import threading
import webrtcvad
import queue
import time

# Constants
SIMILARITY_THRESHOLD = 0.7  # Tune between 0.7–0.85
samplerate = 16000
vad = webrtcvad.Vad(2)
q = queue.Queue()
encoder = VoiceEncoder()

# Functions

def record_reference():
    try:
        duration = 4  # seconds
        messagebox.showinfo("Recording", "Recording reference voice for 5 seconds...")
        recording = sd.rec(int(duration * samplerate), samplerate=samplerate, channels=1)
        sd.wait()
        write("student_reference.wav", samplerate, recording)
        messagebox.showinfo("Success", "Reference voice saved successfully!")
    except Exception as e:
        messagebox.showerror("Error", str(e))

def is_same_speaker(reference_path, test_path, threshold=SIMILARITY_THRESHOLD):
    ref_wav = preprocess_wav(reference_path)
    test_wav = preprocess_wav(test_path)

    emb_ref = encoder.embed_utterance(ref_wav)
    emb_test = encoder.embed_utterance(test_wav)

    similarity = 1 - cosine(emb_ref, emb_test)
    print(f"🔍 Voice similarity: {similarity:.2f}")
    return similarity >= threshold

def detect_voice():
    try:
        def callback(indata, frames, time_info, status):
            if status:
                print(status)
            q.put(bytes(indata))

        print("🟢 Voice detection started...")
        with sd.RawInputStream(samplerate=samplerate, blocksize=160, dtype='int16',
                               channels=1, callback=callback):
            audio_buffer = b""
            frames_collected = 0
            frame_limit = int(2 * samplerate / 160)  # ~2 seconds of voice

            while True:
                audio_bytes = q.get()

                if vad.is_speech(audio_bytes, samplerate):
                    audio_buffer += audio_bytes
                    frames_collected += 1

                    if frames_collected >= frame_limit:
                        audio_array = np.frombuffer(audio_buffer, dtype=np.int16)
                        write("live_audio.wav", samplerate, audio_array)

                        if is_same_speaker("student_reference.wav", "live_audio.wav"):
                            print("✅ Same speaker detected.")
                        else:
                            print("⚠️ Different speaker detected!")

                        # Reset for next utterance
                        audio_buffer = b""
                        frames_collected = 0
                        time.sleep(2)  # Cooldown before next check
                else:
                    audio_buffer = b""
                    frames_collected = 0

    except Exception as e:
        messagebox.showerror("Error", str(e))

def start_detection():
    threading.Thread(target=detect_voice, daemon=True).start()

# GUI Setup
root = tk.Tk()
root.title("WhisperGuard: Voice Monitor")
root.geometry("400x300")
root.config(bg="#1e1e2f")

font_style = ("Segoe UI", 12)

label = tk.Label(root, text="🎧 WhisperGuard", font=("Segoe UI", 16, "bold"), bg="#1e1e2f", fg="white")
label.pack(pady=20)

btn_record = tk.Button(root, text="Register Student Voice", font=font_style, command=record_reference, bg="#0066cc", fg="white", padx=10, pady=5)
btn_record.pack(pady=10)

btn_start = tk.Button(root, text="Start Voice Detection", font=font_style, command=start_detection, bg="#28a745", fg="white", padx=10, pady=5)
btn_start.pack(pady=10)

root.mainloop()
