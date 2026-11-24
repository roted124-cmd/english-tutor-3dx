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
      { word: 'fox', url: '/models/fox.glb', scale: 0.018, rotY: 0.5, y: -0.35, x: -2.1, z: 0.2 },
      { word: 'duck', url: '/models/duck.glb', scale: 0.65, rotY: -0.4, y: -0.4, x: 0, z: 1.3 },
      { word: 'car', url: '/models/car.glb', scale: 18, rotY: 0.6, y: -0.3, x: 2.1, z: 0.2 },
    ],
  },
  food: {
    title: '🥑 Objects', mode: 'find',
    items: [
      { word: 'avocado', url: '/models/avocado.glb', scale: 14, rotY: 0, y: -0.35, x: -2.1, z: 0.2 },
      { word: 'duck', url: '/models/duck.glb', scale: 0.65, rotY: -0.4, y: -0.4, x: 0, z: 1.3 },
      { word: 'fox', url: '/models/fox.glb', scale: 0.018, rotY: -0.5, y: -0.35, x: 2.1, z: 0.2 },
    ],
  },
  counting: { title: '🔢 Count 1-5', mode: 'count', items: [] },
};

const useTutorStore = create(persist((set, get) => ({
  stars: 0, cat: 'animals', target: null, count: 0,
  cModel: { word: 'duck', url: '/models/duck.glb', scale: 0.48, rotY: -0.4, y: -0.3 },
  msg: 'Welcome to Magic Island! Tap Start!', speaking: false, listening: false, celebrate: false, anim: 'Idle',
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
        { word: 'duck', url: '/models/duck.glb', scale: 0.45, rotY: -0.4, y: -0.3 },
        { word: 'avocado', url: '/models/avocado.glb', scale: 10, rotY: 0, y: -0.25 },
        { word: 'car', url: '/models/car.glb', scale: 12, rotY: 0.5, y: -0.2 },
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
}), { name: 'tutor-gfx-v1', partialize: (s) => ({ stars: s.stars }) }));

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

function CartoonWorld() {
  const cloudsRef = useRef();
  useFrame((st) => {
    if (cloudsRef.current) cloudsRef.current.position.x = Math.sin(st.clock.getElapsedTime() * 0.15) * 1.2;
  });
  const Tree = ({ x, z, s = 1 }) => (
    <group position-x={x} position-z={z} scale={s}>
      <mesh position-y={0.45} castShadow><cylinderGeometry args={[0.14, 0.22, 0.9, 12]} /><meshStandardMaterial color="#854D0E" /></mesh>
      <mesh position-y={1.2} castShadow><coneGeometry args={[0.75, 1.3, 12]} /><meshStandardMaterial color="#22C55E" /></mesh>
      <mesh position-y={1.85} castShadow><coneGeometry args={[0.55, 1.1, 12]} /><meshStandardMaterial color="#4ADE80" /></mesh>
    </group>
  );
  const Cloud = ({ x, y, z, s = 1 }) => (
    <group position-x={x} position-y={y} position-z={z} scale={s}>
      <mesh position-x={-0.4}><sphereGeometry args={[0.45, 16, 16]} /><meshStandardMaterial color="#FFF" /></mesh>
      <mesh position-y={0.15}><sphereGeometry args={[0.6, 16, 16]} /><meshStandardMaterial color="#FFF" /></mesh>
      <mesh position-x={0.45}><sphereGeometry args={[0.42, 16, 16]} /><meshStandardMaterial color="#FFF" /></mesh>
    </group>
  );
  return (
    <group>
      <mesh position-y={-0.35} receiveShadow><cylinderGeometry args={[7.5, 6.2, 0.7, 48]} /><meshStandardMaterial color="#86EFAC" /></mesh>
      <mesh position-y={0.02} position-z={-2.1} receiveShadow><cylinderGeometry args={[1.1, 1.25, 0.12, 32]} /><meshStandardMaterial color="#FDE047" /></mesh>
      <mesh position-x={4.2} position-y={4.5} position-z={-6}><sphereGeometry args={[0.85, 24, 24]} /><meshStandardMaterial color="#FACC15" emissive="#F59E0B" emissiveIntensity={0.8} /></mesh>
      <Tree x={-4.2} z={-2.5} s={1.1} /><Tree x={-3.3} z={-4.2} s={0.85} /><Tree x={4.1} z={-2.8} s={1.05} /><Tree x={3.2} z={-4.5} s={0.8} />
      <mesh position-x={-1.6} position-y={0.05} position-z={-1.5}><sphereGeometry args={[0.14, 12, 12]} /><meshStandardMaterial color="#F472B6" /></mesh>
      <mesh position-x={1.8} position-y={0.05} position-z={-1.4}><sphereGeometry args={[0.16, 12, 12]} /><meshStandardMaterial color="#C084FC" /></mesh>
      <group ref={cloudsRef}><Cloud x={-3.5} y={3.8} z={-5} s={0.9} /><Cloud x={1.2} y={4.3} z={-5.5} s={1.1} /><Cloud x={4.5} y={3.4} z={-4.5} s={0.75} /></group>
    </group>
  );
}

class SafeModel extends React.Component {
  state = { err: false };
  static getDerivedStateFromError() { return { err: true }; }
  render() { return this.state.err ? this.props.fb : this.props.children; }
}

function GLB({ url, scale, rotY, y, onClick }) {
  const { scene } = useGLTF(url);
  const clone = React.useMemo(() => scene.clone(), [scene]);
  return <primitive object={clone} scale={scale} rotation-y={rotY} position-y={y} onClick={(e) => { e.stopPropagation(); onClick(); }} />;
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
  return <group ref={g} position-y={0.08} position-z={-2.1} scale={0.58}><primitive object={scene} /></group>;
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
    return (
      <group>
        {celebrate && <Sparkles count={100} scale={6} size={7} speed={0.8} color="#FACC15" />}
        {Array.from({ length: n }, (_, i) => (
          <Float key={i} speed={2} floatIntensity={0.25}>
            <group position-x={(i - (n - 1) / 2) * 1.35} position-y={0.85} position-z={0.9}>
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
      {celebrate && <Sparkles count={100} scale={6} size={7} speed={0.8} color="#FACC15" />}
      {l.items.map((it) => (
        <group key={it.word} position-x={it.x} position-z={it.z}>
          <mesh position-y={0.02} rotation-x={-Math.PI / 2} receiveShadow><ringGeometry args={[0.45, 0.62, 32]} /><meshStandardMaterial color="#FFF" opacity={0.75} transparent /></mesh>
          <Float speed={2.2} floatIntensity={0.25}>
            <group position-y={0.75}>
              <SafeModel fb={<mesh onClick={() => pick(it.word)}><boxGeometry args={[0.7, 0.7, 0.7]} /><meshStandardMaterial color="#F97316" /></mesh>}>
                <Suspense fallback={null}><GLB url={it.url} scale={it.scale} rotY={it.rotY} y={it.y} onClick={() => pick(it.word)} /></Suspense>
              </SafeModel>
              <Text position-y={-0.55} position-z={0.4} fontSize={0.26} color="#0F172A" outlineWidth={0.02} outlineColor="#FFF">{it.word.toUpperCase()}</Text>
            </group>
          </Float>
        </group>
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
    <div style={{ width: '100vw', height: '100vh', background: 'linear-gradient(180deg, #38BDF8 0%, #BAE6FD 65%, #E0F2FE 100%)', position: 'relative', overflow: 'hidden', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '16px', zIndex: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
          <div style={{ display: 'flex', gap: '6px', pointerEvents: 'auto', background: 'rgba(255,255,255,0.45)', padding: '5px', borderRadius: '22px' }}>
            {Object.entries(LESSONS).map(([k, v]) => (
              <button key={k} onClick={() => setCat(k)} style={{ padding: '8px 13px', borderRadius: '18px', border: 'none', fontSize: '13px', fontWeight: '800', background: cat === k ? '#F97316' : 'rgba(255,255,255,0.85)', color: cat === k ? '#FFF' : '#1E293B' }}>{v.title}</button>
            ))}
          </div>
          <div style={{ background: 'linear-gradient(135deg, #FACC15, #F59E0B)', padding: '8px 18px', borderRadius: '22px', fontSize: '18px', fontWeight: '900', color: '#451A03', boxShadow: '0 4px 0 #B45309' }}>⭐ {stars}</div>
        </div>
        <div style={{ alignSelf: 'center', background: 'rgba(255,255,255,0.92)', padding: '14px 24px', borderRadius: '28px', fontSize: '17px', fontWeight: '800', color: '#0F172A', textAlign: 'center', maxWidth: '92%', border: '3px solid #FFF' }}>🤖 {msg}</div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', pointerEvents: 'auto' }}>
          {cat === 'counting' && (
            <div style={{ display: 'flex', gap: '10px', background: 'rgba(255,255,255,0.5)', padding: '8px', borderRadius: '24px' }}>
              {Array.from({ length: 5 }, (_, i) => i + 1).map((n) => (
                <button key={n} onClick={() => { if (n === count) { const m = `Yes! ${NUMS[n]}!`; win(m); speak(m, () => speak(next())); } else { playSFX('error'); speak('Try again!'); } }} style={{ width: '48px', height: '48px', borderRadius: '16px', border: 'none', background: '#F59E0B', color: '#FFF', fontSize: '21px', fontWeight: '900', boxShadow: '0 4px 0 #B45309' }}>{n}</button>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', gap: '14px' }}>
            <button onClick={() => { playSFX('click'); speak(next()); }} style={{ padding: '15px 26px', fontSize: '17px', borderRadius: '50px', border: 'none', background: '#10B981', color: '#FFF', fontWeight: '900', boxShadow: '0 6px 0 #047857' }}>▶️ Start / Next</button>
            {micOk && <button onClick={onMic} style={{ padding: '15px 26px', fontSize: '17px', borderRadius: '50px', border: 'none', background: listening ? '#E11D48' : '#0284C7', color: '#FFF', fontWeight: '900', boxShadow: listening ? '0 6px 0 #9F1239' : '0 6px 0 #0369A1' }}>{listening ? '🎙️ Listening...' : '🎤 Speak Answer'}</button>}
          </div>
        </div>
      </div>
      <Canvas shadows camera={{ fov: 46 }}>
        <ambientLight intensity={0.85} />
        <directionalLight position-x={5} position-y={8} position-z={5} intensity={1.4} castShadow />
        <Environment preset="park" />
        <CartoonWorld />
        <SafeModel fb={null}><Suspense fallback={null}><Robot /></Suspense></SafeModel>
        <SceneItems />
        <ContactShadows position-y={0.01} opacity={0.4} scale={14} blur={2} />
        <OrbitControls enableZoom={false} enablePan={false} minPolarAngle={Math.PI / 4.2} maxPolarAngle={Math.PI / 2.15} />
      </Canvas>
    </div>
  );
}
