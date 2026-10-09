import { useEffect, useId, useRef, useState } from 'react';

export function AmbientBackdrop() {
    const ref = useRef(null);
    useEffect(() => {
        if (!window.matchMedia('(pointer: fine) and (prefers-reduced-motion: no-preference)').matches) return;
        let frame;
        const move = event => {
            cancelAnimationFrame(frame);
            frame = requestAnimationFrame(() => {
                ref.current?.style.setProperty('--pointer-x', `${event.clientX}px`);
                ref.current?.style.setProperty('--pointer-y', `${event.clientY}px`);
            });
        };
        window.addEventListener('pointermove', move, { passive: true });
        return () => { window.removeEventListener('pointermove', move); cancelAnimationFrame(frame); };
    }, []);
    return <div className="ambient-backdrop" ref={ref} aria-hidden="true"><i className="ambient-wash wash-one" /><i className="ambient-wash wash-two" /><i className="ambient-wash wash-three" /><div className="ambient-pointer" /></div>;
}

export function AnimatedValue({ value }) {
    const [display, setDisplay] = useState(value);
    useEffect(() => {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        let frame;
        const start = performance.now();
        const animate = now => {
            const progress = Math.min((now - start) / 700, 1);
            setDisplay(Math.round(value * (1 - (1 - progress) ** 3)));
            if (progress < 1) frame = requestAnimationFrame(animate);
        };
        frame = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(frame);
    }, [value]);
    return <span aria-label={String(value)}>{display.toLocaleString('en-IN')}</span>;
}

export function WorkspaceHeading({ eyebrow, title, description, action, actionLabel, icon = 'arrow_forward' }) {
    return <div className="workspace-heading">
        <div><div className="eyebrow"><span />{eyebrow}</div><h2>{title}</h2><p>{description}</p></div>
        {action && <button className="btn btn-primary btn-lg" onClick={action}><span className="material-symbols-outlined">{icon}</span>{actionLabel}</button>}
    </div>;
}

export function MetricCard({ label, value, detail, icon, tone = 'violet', onClick }) {
    const content = <><div className="metric-top"><span className={`metric-icon tone-${tone}`}><span className="material-symbols-outlined">{icon}</span></span><span className="metric-label">{label}</span>{onClick && <span className="material-symbols-outlined metric-arrow">north_east</span>}</div><div className="metric-value"><AnimatedValue value={value} /></div><div className="metric-detail">{detail}</div></>;
    return onClick ? <button className={`metric-card tone-${tone}`} onClick={onClick}>{content}</button> : <div className={`metric-card tone-${tone}`}>{content}</div>;
}

export function ProgressOrbit({ value, max, label = 'points earned', compact = false }) {
    const id = useId().replace(/:/g, '');
    const progress = Math.max(0, Math.min(value / Math.max(max, 1), 1));
    return <div className={`progress-orbit ${compact ? 'compact' : ''}`} role="img" aria-label={`${value} of ${max} ${label}`}>
        <svg viewBox="0 0 220 220" aria-hidden="true"><defs><linearGradient id={id} x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#8d79ff" /><stop offset="60%" stopColor="#679cff" /><stop offset="100%" stopColor="#6de0ec" /></linearGradient></defs><circle className="orbit-track" cx="110" cy="110" r="92" /><circle className="orbit-value" cx="110" cy="110" r="92" pathLength="100" stroke={`url(#${id})`} strokeDasharray={`${progress * 100} 100`} /></svg>
        <div className="orbit-copy"><strong><AnimatedValue value={value} /></strong><span>of {max} {label}</span></div>
    </div>;
}

export function ActionTile({ title, detail, icon, tone = 'violet', onClick, count }) {
    return <button className={`action-tile tone-${tone}`} onClick={onClick}><span className={`metric-icon tone-${tone}`}><span className="material-symbols-outlined">{icon}</span></span><span className="action-tile-copy"><strong>{title}</strong><span>{detail}</span></span>{count !== undefined && <span className="action-count">{count}</span>}<span className="material-symbols-outlined action-arrow">arrow_forward</span></button>;
}

export function ActivityChart({ certificates }) {
    const [range, setRange] = useState(7);
    const [mode, setMode] = useState('submitted');
    const [selected, setSelected] = useState(null);
    const today = new Date();
    const days = Array.from({ length: range }, (_, i) => {
        const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() - range + i + 1);
        const count = certificates.filter(c => {
            if (mode === 'reviewed' && c.status === 'pending') return false;
            const source = mode === 'reviewed' ? c.reviewed_at || c.approvedAt : c.created_at || c.createdAt;
            if (!source) return false;
            const d = new Date(source);
            return d.getFullYear() === date.getFullYear() && d.getMonth() === date.getMonth() && d.getDate() === date.getDate();
        }).length;
        return { date, count };
    });
    const peak = Math.max(1, ...days.map(d => d.count));
    const total = days.reduce((sum, d) => sum + d.count, 0);
    return <section className="activity-chart glass-panel">
        <div className="panel-heading"><div><span className="eyebrow">THE RHYTHM OF YOUR CAMPUS</span><h3>Activity pulse</h3></div><div className="segmented-control" aria-label="Chart period">{[7, 30].map(n => <button key={n} aria-pressed={range === n} onClick={() => { setRange(n); setSelected(null); }}>{n} days</button>)}</div></div>
        <div className="chart-summary"><strong><AnimatedValue value={total} /></strong><div><span>{mode === 'submitted' ? 'certificates submitted' : 'certificates reviewed'}</span><small>in the last {range} days</small></div><div className="chart-mode"><button aria-pressed={mode === 'submitted'} onClick={() => { setMode('submitted'); setSelected(null); }}>Submissions</button><button aria-pressed={mode === 'reviewed'} onClick={() => { setMode('reviewed'); setSelected(null); }}>Reviews</button></div></div>
        <figure className="chart-figure"><div className="chart-grid" aria-hidden="true"><span /><span /><span /><span /></div><div className={`chart-bars range-${range}`}>{days.map(({ date, count }, i) => <button key={date.toISOString()} className={`chart-column ${selected === i ? 'selected' : ''}`} aria-label={`${date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}: ${count} ${mode}`} aria-pressed={selected === i} onClick={() => setSelected(selected === i ? null : i)}><span className="chart-bar" style={{ '--bar-height': `${count ? Math.max(8, count / peak * 100) : 2}%`, '--bar-delay': `${i * 14}ms` }} /><span className="chart-day">{range === 7 ? date.toLocaleDateString('en-IN', { weekday: 'short' }) : i === 0 || i === range - 1 || i % 7 === 0 ? date.getDate() : ''}</span></button>)}</div><figcaption aria-live="polite">{selected !== null ? `${days[selected].date.toLocaleDateString('en-IN', { month: 'long', day: 'numeric' })} · ${days[selected].count} ${mode === 'submitted' ? 'submissions' : 'reviews'}` : total ? 'Select a day to explore its activity.' : 'Your activity timeline will appear as certificates are submitted.'}</figcaption></figure>
    </section>;
}
