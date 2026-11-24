import React, { useState, useRef, useEffect, Suspense } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, Float, Sparkles, Text, useGLTF, useAnimations } from '@react-three/drei';

const playSFX = (type) => {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    const now = ctx.currentTime;
    osc.type = type === 'success' ? 'triangle' : type === 'error' ? 'sawtooth' : 'sine';
    osc.frequency.setValueAtTime(type === 'success' ? 659.25 : type === 'error' ? 180 : 480, now);
    if (type === 'success') osc.frequency.setValueAtTime(1046.5, now + 0.15);
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
    osc.start(now); osc.stop(now + 0.35);
  } catch (e) {}
};

const NUMS = { 1: 'one', 2: 'two', 3: 'three', 4: 'four', 5: 'five' };
const LESSONS = {
  animals: {
    title: '🦊 Animals', mode: 'find',
    items: [
      { word: 'fox', url: '/models/fox.glb', scale: 0.018, rotY: 0.5, y: -0.4, pos: [-2.1, 0.7, 0] },
      { word: 'duck', url: '/models/duck.glb', scale: 0.65, rotY: -0.4, y: -0.45, pos: [0, 0.7, 1.2] },
      { word: 'car', url: '/models/car.glb', scale: 18, rotY: 0.6, y: -0.35, pos: [2.1, 0.7, 0] },
    ],
  },
  food: {
    title: '🥑 Objects', mode: 'find',
    items: [
      { word: 'avocado', url: '/models/avocado.glb', scale: 14, rotY: 0, y: -0.4, pos: [-2.1, 0.7, 0] },
      { word: 'duck', url: '/models/duck.glb', scale: 0.65, rotY: -0.4, y: -0.45, pos: [0, 0.7, 1.2] },
      { word: 'fox', url: '/models/fox.glb', scale: 0.018, rotY: -0.5, y: -0.4, pos: [2.1, 0.7, 0] },
    ],
  },
  counting: { title: '🔢 Count 1-5', mode: 'count', items: [] },
};

const useTutorStore = create(persist((set, get) => ({
  stars: 0, cat: 'animals', target: null, count: 0,
  cModel: { word: 'duck', url: '/models/duck.glb', scale: 0.48, rotY: -0.4, y: -0.35 },
  msg: 'Hi! Tap Start to play!', speaking: false, listening: false, celebrate: false, anim: 'Idle',
  setCat: (cat) => { playSFX('click'); set({ cat, target: null, count: 0, anim: 'Wave', msg: `Topic: ${LESSONS[cat].title}. Tap Start!` }); },
  setSpeaking: (v) => set({ speaking: v }), setListening: (v) => set({ listening: v }), setMsg: (msg) => set({ msg }),
  win: (msg) => {
    playSFX('success');
    set((s) => ({ stars: s.stars + 1, celebrate: true, anim: 'Dance', msg }));
    setTimeout(() => set({ celebrate: false, anim: 'Idle' }), 2200);
  },
  next: () => {
    const l = LESSONS[get().cat];
    if (l.mode === 'count') {
      const c = Math.floor(Math.random() * 5) + 1;
      const opts = [
        { word: 'duck', url: '/models/duck.glb', scale: 0.45, rotY: -0.4, y: -0.35 },
        { word: 'avocado', url: '/models/avocado.glb', scale: 10, rotY: 0, y: -0.3 },
        { word: 'car', url: '/models/car.glb', scale: 12, rotY: 0.5, y: -0.25 },
      ];
      const m = opts[Math.floor(Math.random() * opts.length)];
      const w = NUMS[c];
      const p = `How many ${m.word}s? Tap a number or say "${w}"!`;
      set({ target: w, count: c, cModel: m, anim: 'Wave', msg: p });
      return p;
    }
    const it = l.items[Math.floor(Math.random() * l.items.length)];
    const p = `Find the ${it.word}! Tap it or say "${it.word}"!`;
    set({ target: it.word, count: 0, anim: 'Wave', msg: p });
    return p;
  },
}), { name: 'tutor-glb-v1', partialize: (s) => ({ stars: s.stars }) }));

const speak = (text, cb) => {
  if (!window.speechSynthesis) { if (cb) cb(); return; }
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'en-US'; u.rate = 0.9; u.pitch = 1.25;
  u.onstart = () => useTutorStore.getState().setSpeaking(true);
  u.onend = () => { useTutorStore.getState().setSpeaking(false); if (cb) cb(); };
  u.onerror = () => { useTutorStore.getState().setSpeaking(false); if (cb) cb(); };
  window.speechSynthesis.speak(u);
};

class SafeModel extends React.Component {
  state = { err: false };
  static getDerivedStateFromError() { return { err: true }; }
  render() { return this.state.err ? this.props.fb : this.props.children; }
}

function GLB({ url, scale, rotY, y, onClick }) {
  const { scene } = useGLTF(url);
  const clone = React.useMemo(() => scene.clone(), [scene]);
  return <primitive object={clone} scale={scale} rotation={[0, rotY, 0]} position={[0, y, 0]} onClick={(e) => { e.stopPropagation(); onClick(); }} />;
}

function Robot() {
  const g = useRef();
  const { scene, animations } = useGLTF('/models/robot.glb');
  const { actions } = useAnimations(animations, g);
  const anim = useTutorStore((s) => s.anim);
  const speaking = useTutorStore((s) => s.speaking);
  useEffect(() => {
    const a = actions[anim] || actions['Idle'];
    if (a) { a.reset().fadeIn(0.25).play(); return () => a.fadeOut(0.25); }
  }, [anim, actions]);
  useFrame((st) => { if (g.current && speaking) g.current.rotation.y = Math.sin(st.clock.getElapsedTime() * 7) * 0.1; });
  return <group ref={g} position={[0, -0.2, -2.1]} scale={0.58}><primitive object={scene} /></group>;
}

function SceneItems() {
  const { cat, target, count, cModel, celebrate, win, next, setMsg } = useTutorStore();
  const l = LESSONS[cat];
  const pick = (w) => {
    if (!target) { playSFX('click'); speak(`That is a ${w}! Tap Start!`); return; }
    if (w === target) { const m = `Great job! That is the ${w}!`; win(m); speak(m, () => speak(next())); }
    else { playSFX('error'); const m = `Oops, that's ${w}. Find ${target}!`; setMsg(m); speak(m); }
  };
  if (l.mode === 'count') {
    const n = count > 0 ? count : 3;
    const pts = Array.from({ length: n }, (_, i) => [(i - (n - 1) / 2) * 1.35, 0.85, 0.8]);
    return (
      <group>
        {celebrate && <Sparkles count={80} scale={6} size={6} speed={0.8} color="#FACC15" />}
        {pts.map((p, i) => (
          <Float key={i} speed={2} floatIntensity={0.25}>
            <group position={p}>
              <SafeModel fb={<mesh><sphereGeometry args={[0.35]} /><meshStandardMaterial color="#FACC15" /></mesh>}>
                <Suspense fallback={null}><GLB url={cModel.url} scale={cModel.scale} rotY={cModel.rotY} y={cModel.y} onClick={() => { playSFX('click'); speak(NUMS[i + 1]); }} /></Suspense>
              </SafeModel>
            </group>
          </Float>
        ))}
      </group>
    );
  }
  return (
    <group>
      {celebrate && <Sparkles count={80} scale={6} size={6} speed={0.8} color="#FACC15" />}
      {l.items.map((it) => (
        <Float key={it.word} speed={2} floatIntensity={0.25}>
          <group position={it.pos}>
            <SafeModel fb={<mesh onClick={() => pick(it.word)}><boxGeometry args={[0.7, 0.7, 0.7]} /><meshStandardMaterial color="#F97316" /></mesh>}>
              <Suspense fallback={null}><GLB url={it.url} scale={it.scale} rotY={it.rotY} y={it.y} onClick={() => pick(it.word)} /></Suspense>
            </SafeModel>
            <Text position={[0, -0.95, 0]} fontSize={0.28} color="#1E293B">{it.word.toUpperCase()}</Text>
          </group>
        </Float>
      ))}
    </group>
  );
}

export default function App() {
  const { stars, msg, listening, cat, target, count, setCat, setListening, next, win, setMsg } = useTutorStore();
  const [micOk, setMicOk] = useState(true);
  useEffect(() => { if (!window.SpeechRecognition && !window.webkitSpeechRecognition) setMicOk(false); }, []);

  const onMic = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    playSFX('click');
    const r = new SR(); r.lang = 'en-US';
    r.onstart = () => setListening(true); r.onend = () => setListening(false);
    r.onresult = (e) => {
      const txt = e.results.transcript.toLowerCase();
      if (!target) { speak('Press Start first!'); return; }
      if (txt.includes(target) || (count > 0 && txt.includes(String(count)))) {
        const m = `Awesome! ${target.toUpperCase()} is right!`; win(m); speak(m, () => speak(next()));
      } else { playSFX('error'); const m = `I heard "${txt}". Say ${target}!`; setMsg(m); speak(m); }
    };
    r.start();
  };

  return (
    <div style={{ width: '100vw', height: '100vh', background: 'linear-gradient(180deg, #7DD3FC 0%, #E0F2FE 100%)', position: 'relative', overflow: 'hidden', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '14px', zIndex: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
          <div style={{ display: 'flex', gap: '6px', pointerEvents: 'auto' }}>
            {Object.entries(LESSONS).map(([k, v]) => (
              <button key={k} onClick={() => setCat(k)} style={{ padding: '8px 12px', borderRadius: '16px', border: 'none', fontSize: '13px', fontWeight: '700', background: cat === k ? '#F97316' : '#FFF', color: cat === k ? '#FFF' : '#334155' }}>{v.title}</button>
            ))}
          </div>
          <div style={{ background: '#FACC15', padding: '7px 16px', borderRadius: '18px', fontSize: '17px', fontWeight: '800', color: '#713F12' }}>⭐ {stars}</div>
        </div>
        <div style={{ alignSelf: 'center', background: 'rgba(255,255,255,0.95)', padding: '12px 20px', borderRadius: '24px', fontSize: '17px', fontWeight: '700', color: '#1E293B', textAlign: 'center', maxWidth: '92%' }}>🤖 {msg}</div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', pointerEvents: 'auto' }}>
          {cat === 'counting' && (
            <div style={{ display: 'flex', gap: '10px' }}>
              {Array.from({length: 5}, (_, i) => i + 1).map((n) => (
                <button key={n} onClick={() => { if (n === count) { const m = `Yes! ${NUMS[n]}!`; win(m); speak(m, () => speak(next())); } else { playSFX('error'); speak('Try again!'); } }} style={{ width: '48px', height: '48px', borderRadius: '16px', border: 'none', background: '#F59E0B', color: '#FFF', fontSize: '20px', fontWeight: '900' }}>{n}</button>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', gap: '12px' }}>
            <button onClick={() => { playSFX('click'); speak(next()); }} style={{ padding: '14px 24px', fontSize: '17px', borderRadius: '50px', border: 'none', background: '#10B981', color: '#FFF', fontWeight: '800' }}>▶️ Start / Next</button>
            {micOk && <button onClick={onMic} style={{ padding: '14px 24px', fontSize: '17px', borderRadius: '50px', border: 'none', background: listening ? '#F43F5E' : '#0284C7', color: '#FFF', fontWeight: '800' }}>{listening ? '🎙️ Listening...' : '🎤 Speak Answer'}</button>}
          </div>
        </div>
      </div>
      <Canvas shadows camera={{ position: [0, 2.4, 6.8], fov: 48 }}>
        <ambientLight intensity={0.9} />
        <directionalLight position={} intensity={1.3} castShadow />
        <Environment preset="park" />
        <SafeModel fb={null}><Suspense fallback={null}><Robot /></Suspense></SafeModel>
        <SceneItems />
        <ContactShadows position={[0, -0.01, 0]} opacity={0.35} scale={12} blur={2.2} />
        <OrbitControls enableZoom={false} enablePan={false} minPolarAngle={Math.PI / 4} maxPolarAngle={Math.PI / 2.1} />
      </Canvas>
    </div>
  );
}
