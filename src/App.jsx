import React, { useState, useRef, useEffect } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, Float, Sparkles, Text } from '@react-three/drei';

const playSFX = (type) => {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;
    if (type === 'success') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.setValueAtTime(659.25, now + 0.1);
      osc.frequency.setValueAtTime(783.99, now + 0.2);
      osc.frequency.setValueAtTime(1046.5, now + 0.3);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
      osc.start(now);
      osc.stop(now + 0.6);
    } else if (type === 'error') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.linearRampToValueAtTime(140, now + 0.25);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    } else {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
    }
  } catch (e) {}
};

const LESSONS = {
  fruits: {
    title: '🍎 Fruits',
    items: [
      { word: 'apple', color: '#ff3b30', shape: 'sphere', pos: [-2.2, 0.7, 0] },
      { word: 'banana', color: '#ffcc00', shape: 'capsule', pos: [0, 0.7, 1.2] },
      { word: 'blueberry', color: '#007aff', shape: 'dodecahedron', pos: [2.2, 0.7, 0] },
    ],
  },
  colors: {
    title: '🎨 Colors',
    items: [
      { word: 'red', color: '#ff2d55', shape: 'box', pos: [-2.2, 0.7, 0] },
      { word: 'green', color: '#34c759', shape: 'box', pos: [0, 0.7, 1.2] },
      { word: 'purple', color: '#af52de', shape: 'box', pos: [2.2, 0.7, 0] },
    ],
  },
  space: {
    title: '🚀 Space',
    items: [
      { word: 'sun', color: '#ff9500', shape: 'sphere', pos: [-2.2, 0.7, 0] },
      { word: 'moon', color: '#e5e5ea', shape: 'dodecahedron', pos: [0, 0.7, 1.2] },
      { word: 'star', color: '#ffd60a', shape: 'octahedron', pos: [2.2, 0.7, 0] },
    ],
  },
};

const useTutorStore = create(
  persist(
    (set, get) => ({
      stars: 0,
      currentCategory: 'fruits',
      targetWord: null,
      tutorMessage: 'Hi! Press Start Lesson to play!',
      isSpeaking: false,
      isListening: false,
      celebrate: false,

      setCategory: (cat) => {
        playSFX('click');
        set({
          currentCategory: cat,
          targetWord: null,
          tutorMessage: `Topic: ${LESSONS[cat].title}. Press Start!`,
        });
      },
      setSpeaking: (val) => set({ isSpeaking: val }),
      setListening: (val) => set({ isListening: val }),
      setTutorMessage: (msg) => set({ tutorMessage: msg }),

      triggerSuccess: (customReply) => {
        playSFX('success');
        set((state) => ({
          stars: state.stars + 1,
          celebrate: true,
          tutorMessage: customReply,
        }));
        setTimeout(() => set({ celebrate: false }), 2200);
      },

      startNewRound: () => {
        const { currentCategory } = get();
        const items = LESSONS[currentCategory].items;
        const randomItem = items[Math.floor(Math.random() * items.length)];
        const prompt = `Find the ${randomItem.word}! Click it or say "${randomItem.word}"!`;
        set({ targetWord: randomItem.word, tutorMessage: prompt });
        return prompt;
      },
    }),
    {
      name: 'kids-english-tutor-storage',
      partialize: (state) => ({ stars: state.stars }),
    }
  )
);

const speak = (text, onEnd) => {
  if (!window.speechSynthesis) {
    if (onEnd) onEnd();
    return;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US';
  utterance.rate = 0.9;
  utterance.pitch = 1.25;

  utterance.onstart = () => useTutorStore.getState().setSpeaking(true);
  utterance.onend = () => {
    useTutorStore.getState().setSpeaking(false);
    if (onEnd) onEnd();
  };
  utterance.onerror = () => {
    useTutorStore.getState().setSpeaking(false);
    if (onEnd) onEnd();
  };
  window.speechSynthesis.speak(utterance);
};

const handleVoiceEvaluation = (spokenText) => {
  const { targetWord, triggerSuccess, startNewRound, setTutorMessage } = useTutorStore.getState();

  if (!targetWord) {
    const msg = 'Press the green Start button first!';
    setTutorMessage(msg);
    speak(msg);
    return;
  }

  if (spokenText.toLowerCase().includes(targetWord)) {
    const msg = `Awesome! You said ${targetWord}! You earned a star!`;
    triggerSuccess(msg);
    speak(msg, () => speak(startNewRound()));
  } else {
    playSFX('error');
    const msg = `I heard "${spokenText}". Try saying ${targetWord}!`;
    setTutorMessage(msg);
    speak(msg);
  }
};

function TutorRobot() {
  const headRef = useRef();
  const mouthRef = useRef();
  const bodyRef = useRef();
  const isSpeaking = useTutorStore((s) => s.isSpeaking);
  const celebrate = useTutorStore((s) => s.celebrate);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (headRef.current) {
      headRef.current.position.y = 1.85 + Math.sin(t * 2.5) * 0.06;
      headRef.current.rotation.z = isSpeaking ? Math.sin(t * 8) * 0.08 : 0;
    }
    if (mouthRef.current) {
      mouthRef.current.scale.y = isSpeaking ? 0.3 + Math.abs(Math.sin(t * 18)) * 1.4 : 0.2;
    }
    if (bodyRef.current) {
      bodyRef.current.position.y = celebrate ? Math.abs(Math.sin(t * 10)) * 0.4 : 0;
    }
  });

  return (
    <group ref={bodyRef} position={[0, 0, -1.8]}>
      <mesh position={[0, 0.75, 0]} castShadow>
        <cylinderGeometry args={[0.45, 0.65, 1.2, 32]} />
        <meshStandardMaterial color="#3B82F6" roughness={0.3} />
      </mesh>
      <group ref={headRef} position={[0, 1.85, 0]}>
        <mesh castShadow>
          <sphereGeometry args={[0.62, 32, 32]} />
          <meshStandardMaterial color="#FBBF24" roughness={0.3} />
        </mesh>
        <mesh position={[0, 0.72, 0]}>
          <cylinderGeometry args={[0.03, 0.03, 0.3]} />
          <meshStandardMaterial color="#64748B" />
        </mesh>
        <mesh position={[0, 0.9, 0]}>
          <sphereGeometry args={[0.1, 16, 16]} />
          <meshStandardMaterial color={celebrate ? '#10B981' : '#EF4444'} />
        </mesh>
        <mesh position={[-0.22, 0.14, 0.54]}>
          <sphereGeometry args={[0.09, 16, 16]} />
          <meshStandardMaterial color="#0F172A" />
        </mesh>
        <mesh position={[0.22, 0.14, 0.54]}>
          <sphereGeometry args={[0.09, 16, 16]} />
          <meshStandardMaterial color="#0F172A" />
        </mesh>
        <mesh ref={mouthRef} position={[0, -0.16, 0.56]}>
          <boxGeometry args={[0.28, 0.14, 0.08]} />
          <meshStandardMaterial color="#F43F5E" />
        </mesh>
      </group>
    </group>
  );
}

function InteractiveItems() {
  const { currentCategory, targetWord, celebrate, triggerSuccess, startNewRound, setTutorMessage } = useTutorStore();
  const items = LESSONS[currentCategory].items;

  const handleClick = (word) => {
    if (!targetWord) {
      playSFX('click');
      speak(`That is ${word}! Press Start Lesson to play.`);
      return;
    }

    if (word === targetWord) {
      const msg = `Great job! That is ${word}!`;
      triggerSuccess(msg);
      speak(msg, () => speak(startNewRound()));
    } else {
      playSFX('error');
      const msg = `Oops, that's ${word}. Find ${targetWord}!`;
      setTutorMessage(msg);
      speak(msg);
    }
  };

  const renderGeometry = (shape) => {
    switch (shape) {
      case 'box': return <boxGeometry args={[0.85, 0.85, 0.85]} />;
      case 'capsule': return <capsuleGeometry args={[0.35, 0.6, 8, 16]} />;
      case 'dodecahedron': return <dodecahedronGeometry args={[0.55, 0]} />;
      case 'octahedron': return <octahedronGeometry args={[0.6, 0]} />;
      default: return <sphereGeometry args={[0.52, 32, 32]} />;
    }
  };

  return (
    <group>
      {celebrate && <Sparkles count={90} scale={6} size={6} speed={0.8} color="#FACC15" />}
      {items.map((item) => (
        <Float key={item.word} speed={2.5} floatIntensity={0.4}>
          <group position={item.pos}>
            <mesh castShadow onClick={() => handleClick(item.word)}>
              {renderGeometry(item.shape)}
              <meshStandardMaterial color={item.color} roughness={0.25} />
            </mesh>
            <Text position={[0, -0.85, 0]} fontSize={0.28} color="#1E293B">
              {item.word.toUpperCase()}
            </Text>
          </group>
        </Float>
      ))}
    </group>
  );
}

export default function App() {
  const { stars, tutorMessage, isListening, currentCategory, setCategory, setListening, startNewRound } = useTutorStore();
  const [speechSupported, setSpeechSupported] = useState(true);

  useEffect(() => {
    if (!window.SpeechRecognition && !window.webkitSpeechRecognition) {
      setSpeechSupported(false);
    }
  }, []);

  const handleStart = () => {
    playSFX('click');
    const prompt = startNewRound();
    speak(prompt);
  };


pkg update -y && pkg install -y nodejs
rm -rf english-tutor-3d
npm create vite@latest english-tutor-3d -- --template react
cd english-tutor-3d
npm install three @react-three/fiber @react-three/drei zustand --legacy-peer-deps

cat << 'EOF' > src/index.css
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}
html, body, #root {
  width: 100%;
  height: 100%;
  overflow: hidden;
}
