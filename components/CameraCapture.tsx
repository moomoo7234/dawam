import React, { useRef, useState, useEffect } from 'react';
import { Camera, RefreshCw } from 'lucide-react';

interface Props {
  onCapture: (imageData: string) => void;
  onCancel: () => void;
}

const CameraCapture: React.FC<Props> = ({ onCapture, onCancel }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    let stream: MediaStream | null = null;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' },
          audio: false,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Camera access denied:", err);
        setError('لا يمكن الوصول للكاميرا. يرجى التأكد من الصلاحيات.');
      }
    };

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        // Flip horizontally for selfie mirror effect
        context.translate(canvas.width, 0);
        context.scale(-1, 1);
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        onCapture(dataUrl);
      }
    }
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-red-50 rounded-lg text-red-600">
        <p>{error}</p>
        <button onClick={onCancel} className="mt-4 px-4 py-2 bg-gray-200 rounded-full text-gray-700">
          إغلاق
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-90 flex flex-col items-center justify-center p-4">
      <div className="relative w-full max-w-md bg-white rounded-2xl overflow-hidden shadow-2xl">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="w-full h-80 object-cover transform -scale-x-100"
        ></video>
        <canvas ref={canvasRef} className="hidden"></canvas>
        
        <div className="absolute bottom-4 left-0 right-0 flex justify-center items-center gap-6">
          <button
            onClick={onCancel}
            className="p-3 rounded-full bg-gray-200 text-gray-700 hover:bg-gray-300 transition"
          >
            إلغاء
          </button>
          
          <button
            onClick={takePhoto}
            className="p-4 rounded-full bg-primary text-white shadow-lg hover:bg-teal-700 transition ring-4 ring-teal-100"
          >
            <Camera size={32} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default CameraCapture;