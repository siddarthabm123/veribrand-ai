'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Check, ChevronRight, Compass, X } from 'lucide-react';

const tour = [
  { title: 'Inspect flagged draft', description: 'Open the seeded launch blog to see where the risky phrases appear in the original copy.', href: '/review/launch-blog', action: 'Open flagged draft', label: 'A real sample with planted brand risks' },
  { title: 'Review cited diffs', description: 'Compare each flagged phrase with the suggested correction and open its approved source.', href: '/review/launch-blog', action: 'Review cited findings', label: 'Rule citations · evidence · intent' },
  { title: 'Test visual WCAG check', description: 'Adjust foreground/background colors to see the contrast ratio update.', href: '/audit/new?tab=visual', action: 'Open visual audit', label: 'WCAG AA contrast preview' },
  { title: 'Approve & export Brand Passport', description: 'Try the source-linked demo, save a review, and export a portable record of the checks.', href: '/impact', action: 'Open Brand Passport', label: 'Human sign-off · portable evidence' },
];

export default function GuidedTour() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const current = tour[step];
  return <>
    <div className="judge-banner tour-banner" role="button" tabIndex={0} onClick={() => setOpen(true)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setOpen(true); } }}><div className="judge-icon"><Compass size={18}/></div><div><b>Take the 30-second product tour</b><p>Follow four quick steps to inspect a finding, review its evidence, test contrast, and export a Brand Passport.</p></div><span className="text-link">Start the tour <ArrowRight size={15}/></span></div>
    {open && <div className="tour-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}><section className="tour-dialog" role="dialog" aria-modal="true" aria-labelledby="tour-title"><div className="tour-dialog-head"><span><Compass size={16}/> PRODUCT TOUR</span><button aria-label="Close tour" onClick={() => setOpen(false)}><X size={17}/></button></div><div className="tour-progress">{tour.map((item, index) => <button key={item.title} aria-label={`Go to step ${index + 1}`} className={index === step ? 'current' : index < step ? 'done' : ''} onClick={() => setStep(index)}>{index < step ? <Check size={12}/> : index + 1}</button>)}</div><div className="tour-step-label">STEP {step + 1} OF {tour.length}</div><h2 id="tour-title">{current.title}</h2><p>{current.description}</p><div className="tour-target"><span><Check size={14}/></span><div><b>{current.label}</b><small>Ready in the Acme Cloud demo workspace</small></div><ChevronRight size={15}/></div><div className="tour-dialog-actions"><button className="tour-back" disabled={step === 0} onClick={() => setStep((value) => Math.max(0, value - 1))}><ArrowLeft size={14}/> Back</button><button className="tour-next" onClick={() => step < tour.length - 1 ? setStep(step + 1) : setOpen(false)}>{step < tour.length - 1 ? <>Next <ArrowRight size={14}/></> : <>Done <Check size={14}/></>}</button><Link href={current.href} className="tour-jump" onClick={() => setOpen(false)}>Jump to page</Link></div></section></div>}
  </>;
}
