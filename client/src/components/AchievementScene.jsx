import { useState } from 'react';
const steps = [
    { title: 'Submit your evidence.', text: 'Choose the activity, attach your certificate, and send it to your department.' },
    { title: 'Know where it stands.', text: 'Your submission stays pending until faculty reviews it. The decision appears in your track record.' },
    { title: 'Plan your next activity.', text: 'See approved points, group requirements, and what remains toward your estimated target.' },
];
export default function AchievementScene() {
    const [step, setStep] = useState(0);
    return <section className="journey-showcase" aria-label="Submission workflow guide"><div className="journey-controls">{steps.map((s,i)=><button key={s.title} onClick={()=>setStep(i)} aria-pressed={step===i}>0{i+1}</button>)}</div><div className="journey-caption" aria-live="polite"><strong>{steps[step].title}</strong><p>{steps[step].text}</p></div><small>Workflow guide. Your actual records appear after sign in.</small></section>;
}
