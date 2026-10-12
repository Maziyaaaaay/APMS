import { useState } from 'react';
const steps = [
    { title: 'Upload.', icon: 'upload_file', text: 'Add your certificate.' },
    { title: 'Get reviewed.', icon: 'verified', text: 'Follow its status.' },
    { title: 'Keep growing.', icon: 'trending_up', text: 'See your approved points.' },
];
export default function AchievementScene() {
    const [step, setStep] = useState(0);
    return <section className="journey-showcase" aria-label="Submission workflow guide">
        <div className={`certificate-art stage-${step}`} aria-hidden="true">
            <div className="certificate-sheet certificate-back" />
            <div className="certificate-sheet certificate-front">
                <div className="certificate-border"><span className="certificate-kicker">CERTIFICATE</span><span className="certificate-title">Achievement</span><div className="certificate-lines"><i /><i /><i /></div><div className="certificate-signature"><span /><span /></div></div>
                <svg className="certificate-seal" viewBox="0 0 64 80" fill="none"><path d="M16 45L12 77l19-11 19 11-5-32" fill="#b12d5a"/><path d="M32 4l7 4 8 1 4 7 5 7-1 8 1 8-5 7-4 7-8 1-7 4-7-4-8-1-4-7-5-7 1-8-1-8 5-7 4-7 8-1z" fill="#edb96a"/><circle cx="32" cy="31" r="16" stroke="#9c5f27" strokeWidth="1.5"/><path d="M23 31l6 6 12-13" stroke="#935627" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
        </div>
        <div className="journey-caption" aria-live="polite"><strong>{steps[step].title}</strong><p>{steps[step].text}</p></div>
        <div className="journey-controls">{steps.map((s,i)=><button key={s.title} onClick={()=>setStep(i)} aria-label={s.title} aria-pressed={step===i}>{i+1}</button>)}</div>
    </section>;
}
