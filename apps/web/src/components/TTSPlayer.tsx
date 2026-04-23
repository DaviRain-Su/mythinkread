import { useState, useEffect, useRef } from 'react'

interface TTSPlayerProps {
  text: string
  bookId?: string
  chapterId?: string
}

interface Voice {
  id: string
  name: string
  language: string
  gender: string
  style: string
}

export default function TTSPlayer({ text, bookId, chapterId }: TTSPlayerProps) {
  const [voices, setVoices] = useState<Voice[]>([])
  const [selectedVoice, setSelectedVoice] = useState('zh-CN-XiaoxiaoNeural')
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [audioUrl, setAudioUrl] = useState('')
  const [progress, setProgress] = useState(0)
  const audioRef = useRef<HTMLAudioElement>(null)

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const progress = (audioRef.current.currentTime / audioRef.current.duration) * 100
      setProgress(progress)
    }
  }

  const handleEnded = () => {
    setIsPlaying(false)
    setProgress(0)
  }

  useEffect(() => {
    const loadVoices = async () => {
      try {
        const res = await fetch('/api/tts/voices')
        if (!res.ok) return
        const data = await res.json()
        setVoices(data.voices || [])
      } catch (err) {
        console.error(err)
      }
    }
    loadVoices()
  }, [])

  useEffect(() => {
    const audio = audioRef.current
    if (audio) {
      audio.addEventListener('timeupdate', handleTimeUpdate)
      audio.addEventListener('ended', handleEnded)
      return () => {
        audio.removeEventListener('timeupdate', handleTimeUpdate)
        audio.removeEventListener('ended', handleEnded)
      }
    }
  }, [audioUrl])

  const handleGenerate = async () => {
    if (!text) return
    setIsLoading(true)
    setError('')
    try {
      const token = localStorage.getItem('mtr_token')
      const res = await fetch('/api/tts/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          book_id: bookId,
          chapter_id: chapterId,
          text: text.slice(0, 5000),
          voice_id: selectedVoice
        })
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `Failed to generate TTS (${res.status})`)
      }
      const data = await res.json()
      setAudioUrl(data.audio_url)
      setIsPlaying(false)
    } catch (err) {
      const msg = err instanceof Error ? err.message : '生成失败'
      setError(msg)
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const handlePlayPause = () => {
    if (!audioRef.current) return
    if (isPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play()
    }
    setIsPlaying(!isPlaying)
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (audioRef.current) {
      const time = (parseFloat(e.target.value) / 100) * audioRef.current.duration
      audioRef.current.currentTime = time
      setProgress(parseFloat(e.target.value))
    }
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: 'white',
      borderTop: '1px solid #e5e7eb',
      padding: '1rem',
      zIndex: 100,
      boxShadow: '0 -4px 6px -1px rgba(0,0,0,0.1)'
    }}>
      <div style={{ maxWidth: '72rem', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        {/* Voice Selector */}
        <select
          value={selectedVoice}
          onChange={(e) => setSelectedVoice(e.target.value)}
          style={{
            padding: '0.5rem',
            border: '1px solid #e5e7eb',
            borderRadius: '0.5rem',
            fontSize: '0.875rem'
          }}
        >
          {voices.map((voice) => (
            <option key={voice.id} value={voice.id}>
              {voice.name} ({voice.style})
            </option>
          ))}
        </select>

        {/* Generate Button */}
        {!audioUrl && (
          <button
            onClick={handleGenerate}
            disabled={isLoading || !text}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: isLoading ? '#9ca3af' : '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '0.5rem',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              fontSize: '0.875rem'
            }}
          >
            {isLoading ? '生成中...' : '生成语音'}
          </button>
        )}

        {/* Audio Controls */}
        {audioUrl && (
          <>
            <button
              onClick={handlePlayPause}
              style={{
                width: '2.5rem',
                height: '2.5rem',
                borderRadius: '50%',
                backgroundColor: '#2563eb',
                color: 'white',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1rem'
              }}
            >
              {isPlaying ? '⏸' : '▶'}
            </button>

            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="range"
                min="0"
                max="100"
                value={progress}
                onChange={handleSeek}
                style={{ flex: 1 }}
              />
              <span style={{ fontSize: '0.75rem', color: '#6b7280', minWidth: '3rem' }}>
                {Math.round(progress)}%
              </span>
            </div>

            <button
              onClick={handleGenerate}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#f3f4f6',
                border: 'none',
                borderRadius: '0.5rem',
                cursor: 'pointer',
                fontSize: '0.875rem'
              }}
            >
              重新生成
            </button>
          </>
        )}
      </div>

      {error && (
        <div style={{
          maxWidth: '72rem',
          margin: '0.5rem auto 0',
          padding: '0.5rem 0.75rem',
          backgroundColor: '#fee2e2',
          color: '#b91c1c',
          borderRadius: '0.375rem',
          fontSize: '0.875rem'
        }}>
          {error}
        </div>
      )}

      {audioUrl && (
        <audio ref={audioRef} src={audioUrl} style={{ display: 'none' }} />
      )}
    </div>
  )
}
