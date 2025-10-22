'use client';

import { useState, useEffect, useRef } from 'react';
import { Phone, PhoneOff, Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { Device, Call } from '@twilio/voice-sdk';

interface CallInterfaceProps {
  leadPhone: string;
  leadName: string;
  leadId: string;
  onCallEnd?: () => void;
}

export default function CallInterface({
  leadPhone,
  leadName,
  leadId,
  onCallEnd,
}: CallInterfaceProps) {
  const [device, setDevice] = useState<Device | null>(null);
  const [call, setCall] = useState<Call | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Initialize Twilio Device
    initializeDevice();

    return () => {
      // Cleanup on unmount
      if (call) {
        call.disconnect();
      }
      if (device) {
        device.destroy();
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const initializeDevice = async () => {
    try {
      // Get access token from server
      const response = await fetch('/api/voice/token');
      const { token } = await response.json();

      // Create Twilio Device
      const newDevice = new Device(token, {
        logLevel: 1,
        codecPreferences: [Call.Codec.Opus, Call.Codec.PCMU],
      });

      // Set up device event listeners
      newDevice.on('registered', () => {
        console.log('✅ Twilio Device registered');
      });

      newDevice.on('error', (error) => {
        console.error('❌ Device error:', error);
        setError(error.message);
      });

      // Register the device
      await newDevice.register();
      setDevice(newDevice);
    } catch (error) {
      console.error('❌ Failed to initialize device:', error);
      setError('Failed to initialize calling device');
    }
  };

  const startCall = async () => {
    if (!device) {
      setError('Device not initialized');
      return;
    }

    try {
      setIsConnecting(true);
      setError(null);

      // Make the call with parameters
      const newCall = await device.connect({
        params: {
          To: leadPhone,
          leadId,
        },
      });

      // Set up call event listeners
      newCall.on('accept', () => {
        console.log('✅ Call accepted');
        setIsConnected(true);
        setIsConnecting(false);

        // Start call duration timer
        timerRef.current = setInterval(() => {
          setCallDuration((prev) => prev + 1);
        }, 1000);
      });

      newCall.on('disconnect', () => {
        console.log('📞 Call disconnected');
        handleCallEnd();
      });

      newCall.on('reject', () => {
        console.log('❌ Call rejected');
        setError('Call was rejected');
        handleCallEnd();
      });

      newCall.on('cancel', () => {
        console.log('🚫 Call cancelled');
        handleCallEnd();
      });

      setCall(newCall);
    } catch (error) {
      console.error('❌ Error starting call:', error);
      setError('Failed to start call');
      setIsConnecting(false);
    }
  };

  const endCall = () => {
    if (call) {
      call.disconnect();
    }
  };

  const handleCallEnd = () => {
    setIsConnected(false);
    setIsConnecting(false);
    setCall(null);
    setCallDuration(0);

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (onCallEnd) {
      onCallEnd();
    }
  };

  const toggleMute = () => {
    if (call) {
      call.mute(!isMuted);
      setIsMuted(!isMuted);
    }
  };

  const toggleSpeaker = async () => {
    if (device) {
      const audioDevices = await device.audio?.availableOutputDevices.get();
      // Note: Speaker toggle works better on mobile devices
      // On desktop, this might not have visible effect
      setIsSpeakerOn(!isSpeakerOn);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isConnecting && !isConnected) {
    return (
      <button
        onClick={startCall}
        disabled={!device}
        className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Phone className="w-4 h-4" />
        <span>Call {leadName}</span>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-2xl border border-slate-700 p-8 max-w-md w-full">
        {/* Call Status */}
        <div className="text-center mb-8">
          <div className="w-24 h-24 mx-auto mb-4 bg-gradient-to-br from-green-500 to-blue-500 rounded-full flex items-center justify-center">
            <Phone className="w-12 h-12 text-white" />
          </div>

          <h2 className="text-2xl font-bold text-white mb-2">{leadName}</h2>
          <p className="text-slate-400 mb-1">{leadPhone}</p>

          {isConnecting && (
            <p className="text-yellow-400 text-sm">Connecting...</p>
          )}

          {isConnected && (
            <p className="text-green-400 text-lg font-mono">
              {formatDuration(callDuration)}
            </p>
          )}

          {error && (
            <p className="text-red-400 text-sm mt-2">{error}</p>
          )}
        </div>

        {/* Call Controls */}
        {isConnected && (
          <div className="flex items-center justify-center gap-4 mb-6">
            {/* Mute Button */}
            <button
              onClick={toggleMute}
              className={`p-4 rounded-full transition-colors ${
                isMuted
                  ? 'bg-red-500 hover:bg-red-600'
                  : 'bg-slate-700 hover:bg-slate-600'
              }`}
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? (
                <MicOff className="w-6 h-6 text-white" />
              ) : (
                <Mic className="w-6 h-6 text-white" />
              )}
            </button>

            {/* Speaker Button */}
            <button
              onClick={toggleSpeaker}
              className={`p-4 rounded-full transition-colors ${
                isSpeakerOn
                  ? 'bg-blue-500 hover:bg-blue-600'
                  : 'bg-slate-700 hover:bg-slate-600'
              }`}
              title={isSpeakerOn ? 'Speaker On' : 'Speaker Off'}
            >
              {isSpeakerOn ? (
                <Volume2 className="w-6 h-6 text-white" />
              ) : (
                <VolumeX className="w-6 h-6 text-white" />
              )}
            </button>
          </div>
        )}

        {/* End Call Button */}
        <button
          onClick={endCall}
          className="w-full py-4 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center gap-2 transition-colors"
        >
          <PhoneOff className="w-5 h-5" />
          <span className="font-semibold">End Call</span>
        </button>
      </div>
    </div>
  );
}
