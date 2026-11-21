'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Pause, Play, RotateCcw } from 'lucide-react';

export default function BrandSculpture() {
  const [paused, setPaused] = useState(false);
  const [exploded, setExploded] = useState(false);
  const scene = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = scene.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => {
      element.style.setProperty('--scene-play', entry.isIntersecting ? 'running' : 'paused');
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return <figure className="vb-sculpture" aria-label="Interactive dimensional VeriBrand identity">
    <div className="vb-object-meta"><span>Brand integrity, in every dimension.</span><span>VeriBrand identity</span></div>
    <div className={`vb-scene${paused ? ' is-paused' : ''}${exploded ? ' is-exploded' : ''}`} ref={scene}>
      <div className="vb-orbit vb-orbit-one" aria-hidden="true" />
      <div className="vb-orbit vb-orbit-two" aria-hidden="true" />
      <div className="vb-orbit vb-orbit-three" aria-hidden="true" />
      <div className="vb-sculpture-shadow" aria-hidden="true" />
      <div className="vb-object" aria-hidden="true">
        {Array.from({ length: 18 }, (_, i) => <div key={i} className="vb-monogram-layer" style={{ '--layer': i } as CSSProperties}><span>v</span><span>b</span></div>)}
        <div className="vb-monogram-face"><span>v</span><span>b</span></div>
      </div>
      <span className="vb-proof-label vb-proof-label-a">Your voice.</span>
      <span className="vb-proof-label vb-proof-label-b">Your rules.</span>
      <span className="vb-registration vb-registration-a" aria-hidden="true">+</span>
      <span className="vb-registration vb-registration-b" aria-hidden="true">+</span>
    </div>
    <figcaption className="vb-object-controls">
      <button type="button" onClick={() => setExploded(!exploded)} aria-pressed={exploded}><RotateCcw size={16} aria-hidden="true" />{exploded ? 'Bring it together' : 'Explore the layers'}</button>
      <button type="button" onClick={() => setPaused(!paused)} aria-pressed={paused} aria-label={paused ? 'Play 3D animation' : 'Pause 3D animation'}>{paused ? <Play size={16} aria-hidden="true" /> : <Pause size={16} aria-hidden="true" />}<span>{paused ? 'Play motion' : 'Pause motion'}</span></button>
    </figcaption>
  </figure>;
}
