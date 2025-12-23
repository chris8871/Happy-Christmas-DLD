import React, { useEffect, useRef, useState } from 'react';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { useAppStore } from '../store';
import { AppState, HandGesture } from '../types';

const HandManager: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { setGesture, setHandPosition, setRotationY, appState, setAppState, setSelectedPhotoIndex } = useAppStore();
  const [loaded, setLoaded] = useState(false);
  const lastVideoTime = useRef(-1);
  const requestRef = useRef<number>(0);

  useEffect(() => {
    let handLandmarker: HandLandmarker | null = null;

    const setupMediaPipe = async () => {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
      );
      handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
          delegate: "GPU"
        },
        runningMode: "VIDEO",
        numHands: 1
      });
      setLoaded(true);
      startWebcam();
    };

    const startWebcam = async () => {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.addEventListener('loadeddata', predictWebcam);
        }
      }
    };

    const predictWebcam = () => {
      if (!handLandmarker || !videoRef.current) return;

      let startTimeMs = performance.now();
      if (videoRef.current.currentTime !== lastVideoTime.current) {
        lastVideoTime.current = videoRef.current.currentTime;
        const results = handLandmarker.detectForVideo(videoRef.current, startTimeMs);
        
        processResults(results);
      }
      requestRef.current = requestAnimationFrame(predictWebcam);
    };

    setupMediaPipe();

    return () => {
      if(requestRef.current) cancelAnimationFrame(requestRef.current);
      if(handLandmarker) handLandmarker.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const processResults = (results: any) => {
    if (results.landmarks && results.landmarks.length > 0) {
      const landmarks = results.landmarks[0];
      
      // 1. Calculate Centroid (Hand Position)
      // Landmarks are normalized [0,1]. x is left-right, y is top-bottom.
      // We invert X because webcam is mirrored.
      const cx = 1 - landmarks[9].x; 
      const cy = landmarks[9].y;
      
      setHandPosition({ x: cx, y: cy });

      // 2. Gesture Detection
      // Basic classification from MediaPipe if available, or heuristics
      // We will use heuristics for better control over "Pinch" vs "Fist"
      
      const thumbTip = landmarks[4];
      const indexTip = landmarks[8];
      const middleTip = landmarks[12];
      const ringTip = landmarks[16];
      const pinkyTip = landmarks[20];
      const wrist = landmarks[0];

      // Distance between thumb and index
      const pinchDist = Math.hypot(thumbTip.x - indexTip.x, thumbTip.y - indexTip.y);
      
      // Is fist? (Fingertips close to wrist)
      const isFist = [indexTip, middleTip, ringTip, pinkyTip].every(tip => {
        return Math.hypot(tip.x - wrist.x, tip.y - wrist.y) < 0.3; // heuristic threshold
      });

      let currentGesture = HandGesture.UNKNOWN;

      if (isFist) {
        currentGesture = HandGesture.CLOSED_FIST;
      } else if (pinchDist < 0.05) {
        currentGesture = HandGesture.PINCH;
      } else {
        currentGesture = HandGesture.OPEN_PALM;
      }

      setGesture(currentGesture);

      // 3. State Machine Logic based on Gestures
      
      // FIST -> Form the tree
      if (currentGesture === HandGesture.CLOSED_FIST) {
        setAppState(AppState.FORMED);
        setSelectedPhotoIndex(null); // Deselect photos
      }
      
      // OPEN PALM -> Explode
      if (currentGesture === HandGesture.OPEN_PALM && appState !== AppState.CHAOS) {
         // Only switch to chaos if not focusing on a photo, or if we want to "release"
         if (appState === AppState.FORMED) {
             setAppState(AppState.CHAOS);
         }
      }

      // PINCH -> In Chaos mode, grab a photo? 
      // Simplified: If pinching in Chaos, we might "rotate" or "select".
      // Let's implement Rotation in Chaos Mode
      if (appState === AppState.CHAOS && currentGesture === HandGesture.OPEN_PALM) {
         // Map X position to rotation
         // 0 -> -PI, 1 -> PI
         const targetRot = (cx - 0.5) * Math.PI * 2; 
         setRotationY(targetRot);
      }
    }
  };

  return (
    <div className="fixed bottom-4 right-4 w-32 h-24 bg-black/50 border border-gold-500 rounded-lg overflow-hidden z-50 pointer-events-none">
       {/* Hidden video for processing */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover opacity-50 transform scale-x-[-1]"
      />
      {!loaded && <div className="absolute inset-0 flex items-center justify-center text-xs text-gold-400">视觉模型加载中...</div>}
    </div>
  );
};

export default HandManager;