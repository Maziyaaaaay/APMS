import { useState } from 'react';

const STEPS = [
    { label: 'Capture', icon: 'upload_file', title: 'An experience worth keeping.', detail: 'Upload your certificate and choose its activity category.', card: 'Your next achievement', state: 'Ready to submit', badge: 'upload', foot: 'PDF, JPG or PNG · up to 10 MB' },
    { label: 'Review', icon: 'fact_check', title: 'Clarity at every step.', detail: 'Follow the status while your faculty reviews the evidence.', card: 'Faculty review', state: 'In the review queue', badge: 'schedule', foot: 'A clear status. A visible decision.' },
    { label: 'Grow', icon: 'auto_awesome', title: 'See how far you’ve come.', detail: 'Approved achievements build your point and group progress.', card: 'Your activity journey', state: 'Progress, in perspective', badge: 'done_all', foot: 'Only approved submissions count' },
];

export default function AchievementScene() {
    const [step, setStep] = useState(0);
    const current = STEPS[step];
    return <section className="journey-showcase" aria-label="How APMS works">
        <div className="journey-visual">
            <div className="aurora-sphere" aria-hidden="true"><div className="sphere-ring ring-one" /><div className="sphere-ring ring-two" /><div className="sphere-core" /></div>
            <div className="journey-float float-one" aria-hidden="true"><span className="material-symbols-outlined">workspace_premium</span></div>
            <div className="journey-float float-two" aria-hidden="true"><span className="material-symbols-outlined">auto_awesome</span></div>
            <div className="journey-certificate" key={step}><div className="certificate-top"><span className="certificate-mark"><span className="material-symbols-outlined">{current.icon}</span></span><span>THE APMS EXPERIENCE</span><span className="certificate-dot" /></div><h3>{current.card}</h3><div className="certificate-lines" aria-hidden="true"><i /><i /></div><div className="certificate-status"><span className="material-symbols-outlined">{current.badge}</span>{current.state}</div><small>{current.foot}</small></div>
            <div className="journey-chip" aria-hidden="true"><span className="material-symbols-outlined">verified_user</span>Private by design</div>
        </div>
        <div className="journey-controls" aria-label="Explore the workflow">{STEPS.map((s, i) => <button key={s.label} aria-pressed={i === step} onClick={() => setStep(i)}><span>0{i + 1}</span>{s.label}<i /></button>)}</div>
        <div className="journey-caption" aria-live="polite"><strong>{current.title}</strong><p>{current.detail}</p></div>
    </section>;
}
