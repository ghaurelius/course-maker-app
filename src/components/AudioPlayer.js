import React, { useState, useRef, useEffect } from 'react';

const AudioPlayer = ({ content, title }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const audioRef = useRef(null);
  const synthRef = useRef(null);

  // Clean content for speech synthesis (remove HTML tags)
  const cleanContent = content.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

  useEffect(() => {
    return () => {
      // Cleanup speech synthesis on unmount
      if (synthRef.current) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handlePlay = async () => {
    if (isPlaying) {
      // Pause
      window.speechSynthesis.pause();
      setIsPlaying(false);
    } else {
      // Play
      setIsLoading(true);
      
      try {
        // Cancel any existing speech
        window.speechSynthesis.cancel();
        
        // Create new speech synthesis utterance
        const utterance = new SpeechSynthesisUtterance(cleanContent);
        
        // Configure speech settings
        utterance.rate = playbackRate;
        utterance.pitch = 1;
        utterance.volume = 1;
        
        // Get available voices and prefer English voices
        const voices = window.speechSynthesis.getVoices();
        const englishVoice = voices.find(voice => 
          voice.lang.startsWith('en') && voice.localService
        ) || voices[0];
        
        if (englishVoice) {
          utterance.voice = englishVoice;
        }

        // Set up event handlers
        utterance.onstart = () => {
          setIsLoading(false);
          setIsPlaying(true);
        };

        utterance.onend = () => {
          setIsPlaying(false);
          setCurrentTime(0);
        };

        utterance.onerror = (error) => {
          console.error('Speech synthesis error:', error);
          setIsLoading(false);
          setIsPlaying(false);
        };

        // Store reference and start speech
        synthRef.current = utterance;
        window.speechSynthesis.speak(utterance);
        
      } catch (error) {
        console.error('Error starting audio playback:', error);
        setIsLoading(false);
        setIsPlaying(false);
      }
    }
  };

  const handleStop = () => {
    window.speechSynthesis.cancel();
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleRateChange = (newRate) => {
    setPlaybackRate(newRate);
    if (isPlaying) {
      // Restart with new rate
      handleStop();
      setTimeout(() => handlePlay(), 100);
    }
  };

  return (
    <div style={{
      backgroundColor: '#f8f9fa',
      border: '1px solid #e9ecef',
      borderRadius: '8px',
      padding: '16px',
      marginBottom: '20px'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '12px'
      }}>
        <h4 style={{
          margin: 0,
          color: '#2c3e50',
          fontSize: '16px'
        }}>
          🎵 Audio Playback: {title}
        </h4>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ fontSize: '14px', color: '#666' }}>Speed:</label>
          <select
            value={playbackRate}
            onChange={(e) => handleRateChange(parseFloat(e.target.value))}
            style={{
              padding: '4px 8px',
              borderRadius: '4px',
              border: '1px solid #ddd',
              fontSize: '12px'
            }}
          >
            <option value={0.5}>0.5x</option>
            <option value={0.75}>0.75x</option>
            <option value={1}>1x</option>
            <option value={1.25}>1.25x</option>
            <option value={1.5}>1.5x</option>
            <option value={2}>2x</option>
          </select>
        </div>
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
        <button
          onClick={handlePlay}
          disabled={isLoading}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            backgroundColor: isPlaying ? '#e74c3c' : '#27ae60',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            opacity: isLoading ? 0.6 : 1
          }}
        >
          {isLoading ? (
            <>⏳ Loading...</>
          ) : isPlaying ? (
            <>⏸️ Pause</>
          ) : (
            <>▶️ Play</>
          )}
        </button>

        <button
          onClick={handleStop}
          disabled={!isPlaying && !isLoading}
          style={{
            padding: '8px 16px',
            backgroundColor: '#95a5a6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: (!isPlaying && !isLoading) ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            opacity: (!isPlaying && !isLoading) ? 0.6 : 1
          }}
        >
          ⏹️ Stop
        </button>

        <div style={{
          fontSize: '12px',
          color: '#666',
          marginLeft: 'auto'
        }}>
          {isPlaying ? 'Playing...' : 'Ready to play'}
        </div>
      </div>

      <div style={{
        marginTop: '12px',
        padding: '8px',
        backgroundColor: '#fff',
        borderRadius: '4px',
        fontSize: '12px',
        color: '#666',
        maxHeight: '60px',
        overflow: 'hidden',
        textOverflow: 'ellipsis'
      }}>
        <strong>Content preview:</strong> {cleanContent.substring(0, 150)}...
      </div>
    </div>
  );
};

export default AudioPlayer;
