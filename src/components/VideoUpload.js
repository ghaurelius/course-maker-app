import React, { useState, useRef } from 'react';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';

const VideoUpload = ({ lessonId, moduleId, onVideoUploaded, existingVideoUrl = null }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [videoUrl, setVideoUrl] = useState(existingVideoUrl);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      uploadVideo(file);
    }
  };

  const uploadVideo = async (file) => {
    // Validate file type
    if (!file.type.startsWith('video/')) {
      setError('Please select a valid video file');
      return;
    }

    // Validate file size (max 100MB)
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      setError('Video file must be less than 100MB');
      return;
    }

    setIsUploading(true);
    setError('');
    setUploadProgress(0);

    try {
      // Create storage reference
      const timestamp = Date.now();
      const fileName = `videos/${moduleId}/${lessonId}/${timestamp}_${file.name}`;
      const storageRef = ref(storage, fileName);

      // Upload file
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          // Update progress
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(Math.round(progress));
        },
        (error) => {
          console.error('Upload error:', error);
          setError('Failed to upload video. Please try again.');
          setIsUploading(false);
        },
        async () => {
          try {
            // Get download URL
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            setVideoUrl(downloadURL);
            setIsUploading(false);
            
            // Notify parent component
            if (onVideoUploaded) {
              onVideoUploaded(downloadURL);
            }
          } catch (error) {
            console.error('Error getting download URL:', error);
            setError('Failed to get video URL. Please try again.');
            setIsUploading(false);
          }
        }
      );
    } catch (error) {
      console.error('Upload error:', error);
      setError('Failed to upload video. Please try again.');
      setIsUploading(false);
    }
  };

  const handleRemoveVideo = () => {
    setVideoUrl(null);
    if (onVideoUploaded) {
      onVideoUploaded(null);
    }
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
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
      <h4 style={{
        margin: '0 0 12px 0',
        color: '#2c3e50',
        fontSize: '16px'
      }}>
        🎥 Video Upload
      </h4>

      {!videoUrl ? (
        <div>
          <p style={{
            fontSize: '14px',
            color: '#666',
            marginBottom: '12px'
          }}>
            Upload a video for this lesson (Max 100MB, MP4/MOV/AVI formats supported)
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            onChange={handleFileSelect}
            disabled={isUploading}
            style={{ display: 'none' }}
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            style={{
              padding: '12px 20px',
              backgroundColor: isUploading ? '#95a5a6' : '#3498db',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: isUploading ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            {isUploading ? '⏳ Uploading...' : '📁 Choose Video File'}
          </button>

          {isUploading && (
            <div style={{ marginTop: '12px' }}>
              <div style={{
                width: '100%',
                height: '8px',
                backgroundColor: '#e9ecef',
                borderRadius: '4px',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: `${uploadProgress}%`,
                  height: '100%',
                  backgroundColor: '#27ae60',
                  transition: 'width 0.3s ease'
                }} />
              </div>
              <p style={{
                fontSize: '12px',
                color: '#666',
                marginTop: '4px',
                textAlign: 'center'
              }}>
                Uploading... {uploadProgress}%
              </p>
            </div>
          )}

          {error && (
            <div style={{
              marginTop: '12px',
              padding: '8px 12px',
              backgroundColor: '#f8d7da',
              color: '#721c24',
              border: '1px solid #f5c6cb',
              borderRadius: '4px',
              fontSize: '14px'
            }}>
              ❌ {error}
            </div>
          )}
        </div>
      ) : (
        <div>
          <div style={{
            marginBottom: '12px',
            padding: '12px',
            backgroundColor: '#d4edda',
            color: '#155724',
            border: '1px solid #c3e6cb',
            borderRadius: '4px',
            fontSize: '14px'
          }}>
            ✅ Video uploaded successfully!
          </div>

          <video
            controls
            style={{
              width: '100%',
              maxWidth: '400px',
              height: 'auto',
              borderRadius: '4px',
              marginBottom: '12px'
            }}
          >
            <source src={videoUrl} type="video/mp4" />
            Your browser does not support the video tag.
          </video>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => window.open(videoUrl, '_blank')}
              style={{
                padding: '8px 16px',
                backgroundColor: '#17a2b8',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              🔗 Open in New Tab
            </button>

            <button
              onClick={handleRemoveVideo}
              style={{
                padding: '8px 16px',
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              🗑️ Remove Video
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoUpload;
