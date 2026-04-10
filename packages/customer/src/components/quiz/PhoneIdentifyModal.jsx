import React, { useState, useCallback } from 'react';
import { DEVICES } from '@shared/constants';

/* ── helpers ─────────────────────────────────────────────────── */

const findDevice = (id) => DEVICES.find((d) => d.id === id) || null;

const SUPPORTED_IDS = new Set(
    DEVICES.filter((d) => {
        const gen = d.generation;
        if (gen === 'SE') return true;
        const num = parseInt(gen, 10);
        return num >= 12 && num <= 17;
    }).map((d) => d.id)
);

const isSupported = (id) => SUPPORTED_IDS.has(id);

/* ── Apple CDN image URLs (verified) ─────────────────────────── */

const IMG = {
    // Product page feature photos
    se_colors: 'https://cdsassets.apple.com/live/7WUAS350/images/iphone/iphone-se-3rd-gen-colors.png',
    iphone17_hero: 'https://www.apple.com/v/iphone-17/e/images/overview/welcome/hero_startframe__e9e7pcnguyqi_xlarge.jpg',
    iphone17_rear_2cam: 'https://www.apple.com/v/iphone-17/e/images/overview/cameras/back-camera/hero_rear_camera__baka63bo73ma_xlarge.png',
    iphone17pro_rear_3cam: 'https://www.apple.com/v/iphone-17-pro/e/images/overview/cameras/lenses/rear_camera__chihxe7nejyq_xlarge.jpg',
    dynamic_island: 'https://www.apple.com/v/iphone-17/e/images/overview/product-viewer/dynamic_island__ea23sqco06c2_large.jpg',
    capture_button_spec: 'https://www.apple.com/v/iphone-17-pro/e/images/specs/external_connectors__6srsbgigl5ei_large.jpg',

    // Homepage select images — back/side angle, ideal for comparisons
    select_16: 'https://www.apple.com/v/iphone/home/cj/images/overview/select/iphone_16__b6tkv86m2gc2_large.jpg',
    select_17: 'https://www.apple.com/v/iphone/home/cj/images/overview/select/iphone_17__fb1277oq3eaa_large.jpg',
    select_17pro: 'https://www.apple.com/v/iphone/home/cj/images/overview/select/iphone_17pro__t1j902iw6kya_large.jpg',

    // Store CDN product cards (current models)
    card_17pro: 'https://store.storeimages.cdn-apple.com/1/as-images.apple.com/is/iphone-card-40-17pro-202509?wid=340&hei=340&fmt=p-jpg&qlt=95',
    card_17air: 'https://store.storeimages.cdn-apple.com/1/as-images.apple.com/is/iphone-card-40-17air-202509?wid=340&hei=340&fmt=p-jpg&qlt=95',
    card_17: 'https://store.storeimages.cdn-apple.com/1/as-images.apple.com/is/iphone-card-40-17-202509?wid=340&hei=340&fmt=p-jpg&qlt=95',
    card_16: 'https://store.storeimages.cdn-apple.com/1/as-images.apple.com/is/iphone-card-40-16plus-202509?wid=340&hei=340&fmt=p-jpg&qlt=95',
    iphone16_colors: 'https://cdsassets.apple.com/live/7WUAS350/images/iphone/iphone-16-colors.png',
};

// Map device IDs → product card images (current models)
const DEVICE_CARD_IMG = {
    'iphone-17-pro': IMG.card_17pro,
    'iphone-17-pro-max': IMG.card_17pro,
    'iphone-17-air': IMG.card_17air,
    'iphone-17': IMG.card_17,
    'iphone-16': IMG.card_16,
    'iphone-16-plus': IMG.card_16,
    'iphone-16-pro': IMG.card_16,
    'iphone-16-pro-max': IMG.card_16,
    'iphone-16e': IMG.select_16,
    'iphone-se-2nd': IMG.se_colors,
    'iphone-se-3rd': IMG.se_colors,
};

/* ── Photo component with fallback ───────────────────────────── */

function DevicePhoto({ src, alt, className = '' }) {
    const [failed, setFailed] = useState(false);

    if (failed || !src) {
        return (
            <div className={`pi__photo-fallback ${className}`} aria-label={alt}>
                <span className="pi__photo-fallback-icon">📱</span>
            </div>
        );
    }

    return (
        <img
            src={src}
            alt={alt}
            className={`pi__photo ${className}`}
            loading="lazy"
            decoding="async"
            onError={() => setFailed(true)}
        />
    );
}

/* ── inline illustrations for ports (no Apple CDN source) ───── */

function PortComparison() {
    return (
        <div className="pi__port-compare">
            <div className="pi__port-side">
                <svg width="120" height="72" viewBox="0 0 120 72" fill="none" aria-label="Lightning port">
                    {/* Phone bottom edge */}
                    <rect x="4" y="8" width="112" height="32" rx="8" fill="#e5e7eb" stroke="#9ca3af" strokeWidth="1.5" />
                    {/* Speaker grille left */}
                    {[16, 22, 28, 34].map((x) => (
                        <circle key={x} cx={x} cy="24" r="1.8" fill="#6b7280" />
                    ))}
                    {/* Lightning port — narrow oval */}
                    <rect x="46" y="16" width="28" height="16" rx="8" fill="#1f2937" />
                    <rect x="50" y="20" width="20" height="8" rx="4" fill="#374151" />
                    {/* Speaker grille right */}
                    {[86, 92, 98, 104].map((x) => (
                        <circle key={x} cx={x} cy="24" r="1.8" fill="#6b7280" />
                    ))}
                </svg>
                <span className="pi__port-name">Lightning</span>
                <span className="pi__port-desc">Narrow oval opening</span>
            </div>
            <div className="pi__port-divider">
                <span>vs</span>
            </div>
            <div className="pi__port-side">
                <svg width="120" height="72" viewBox="0 0 120 72" fill="none" aria-label="USB-C port">
                    {/* Phone bottom edge */}
                    <rect x="4" y="8" width="112" height="32" rx="8" fill="#e5e7eb" stroke="#9ca3af" strokeWidth="1.5" />
                    {/* Speaker grille left */}
                    {[16, 22, 28, 34].map((x) => (
                        <circle key={x} cx={x} cy="24" r="1.8" fill="#6b7280" />
                    ))}
                    {/* USB-C port — wider rounded rectangle with center tab */}
                    <rect x="42" y="15" width="36" height="18" rx="5" fill="#1f2937" />
                    <rect x="47" y="19" width="26" height="10" rx="3" fill="#374151" />
                    <rect x="52" y="22" width="16" height="4" rx="1.5" fill="#6b7280" />
                    {/* Speaker grille right */}
                    {[86, 92, 98, 104].map((x) => (
                        <circle key={x} cx={x} cy="24" r="1.8" fill="#6b7280" />
                    ))}
                </svg>
                <span className="pi__port-name">USB-C</span>
                <span className="pi__port-desc">Wider with center tab</span>
            </div>
        </div>
    );
}

function CaptureButtonDiagram() {
    return (
        <div className="pi__capture-diagram">
            <svg width="200" height="280" viewBox="0 0 200 280" fill="none" aria-label="Capture button location on right side of phone">
                {/* Phone body */}
                <rect x="40" y="10" width="120" height="260" rx="24" fill="#f3f4f6" stroke="#9ca3af" strokeWidth="2" />
                {/* Screen */}
                <rect x="48" y="26" width="104" height="230" rx="16" fill="#d1d5db" />
                {/* Dynamic Island */}
                <rect x="80" y="32" width="40" height="12" rx="6" fill="#4b5563" />
                {/* Side button (right side, upper) */}
                <rect x="160" y="80" width="6" height="40" rx="3" fill="#9ca3af" stroke="#6b7280" strokeWidth="1" />
                <text x="178" y="103" fontSize="9" fill="#6b7280" fontWeight="500">Side button</text>
                {/* Capture button (right side, lower) — highlighted */}
                <rect x="160" y="180" width="6" height="28" rx="3" fill="#525462" stroke="#22C55E" strokeWidth="2" />
                {/* Arrow pointing to capture button */}
                <line x1="178" y1="194" x2="170" y2="194" stroke="#22C55E" strokeWidth="2" markerEnd="url(#arrowhead)" />
                <text x="180" y="190" fontSize="10" fill="#22C55E" fontWeight="700">Capture</text>
                <text x="180" y="202" fontSize="10" fill="#22C55E" fontWeight="700">button</text>
                {/* Volume buttons (left side) */}
                <rect x="34" y="80" width="6" height="24" rx="3" fill="#9ca3af" />
                <rect x="34" y="112" width="6" height="24" rx="3" fill="#9ca3af" />
                {/* Arrow marker */}
                <defs>
                    <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                        <path d="M0 0L8 3L0 6Z" fill="#22C55E" />
                    </marker>
                </defs>
            </svg>
        </div>
    );
}

/* ── decision tree ───────────────────────────────────────────── */

const MAX_STEPS = 4;

const STEPS = {
    home_button: {
        question: 'Does your phone have a round home button at the bottom?',
        stepNum: 1,
        images: [
            { src: IMG.se_colors, label: 'With home button', alt: 'iPhone SE with home button' },
            { src: IMG.iphone17_hero, label: 'Full-screen display', alt: 'Modern iPhone without home button' },
        ],
        options: [
            { label: 'Yes — has home button', next: 'se_5g' },
            { label: 'No — full-screen display', next: 'charging_port' },
        ],
    },

    se_5g: {
        question: 'Does your phone support 5G?',
        hint: 'Check Settings → General → About and look for "5G" in the network field.',
        stepNum: 2,
        images: [
            { src: IMG.se_colors, label: 'iPhone SE', alt: 'iPhone SE settings check' },
        ],
        options: [
            { label: 'Yes — 5G', result: ['iphone-se-3rd'] },
            { label: 'No — LTE only', result: ['iphone-se-2nd'] },
        ],
    },

    charging_port: {
        question: 'Look at the bottom of your phone — what shape is the charging port?',
        hint: 'Flip your phone over and look at the small opening on the bottom edge.',
        stepNum: 2,
        customIllustration: 'port',
        options: [
            { label: 'Lightning — narrow oval opening', next: 'lightning_di' },
            { label: 'USB-C — wider with a center tab', next: 'usbc_capture' },
        ],
    },

    lightning_di: {
        question: 'Does your phone have a Dynamic Island?',
        hint: 'A pill-shaped cutout at the top center of the screen — not a wide notch.',
        stepNum: 3,
        images: [
            { src: IMG.dynamic_island, label: 'Dynamic Island (pill shape)', alt: 'iPhone Dynamic Island at top of screen' },
        ],
        options: [
            {
                label: 'Yes — Dynamic Island',
                result: ['iphone-14-pro', 'iphone-14-pro-max'],
                sizeChoose: true,
            },
            { label: 'No — standard notch', next: 'lightning_cameras' },
        ],
    },

    lightning_cameras: {
        question: 'How many camera lenses are on the back?',
        stepNum: 4,
        images: [
            { src: IMG.iphone17_rear_2cam, label: '2 cameras', alt: 'iPhone back with 2 camera lenses' },
            { src: IMG.iphone17pro_rear_3cam, label: '3 cameras', alt: 'iPhone back with 3 camera lenses' },
        ],
        options: [
            {
                label: '2 cameras',
                result: [
                    'iphone-12-mini', 'iphone-12',
                    'iphone-13-mini', 'iphone-13',
                    'iphone-14', 'iphone-14-plus',
                ],
                gridChoose: true,
            },
            {
                label: '3 cameras',
                result: [
                    'iphone-12-pro', 'iphone-12-pro-max',
                    'iphone-13-pro', 'iphone-13-pro-max',
                ],
                gridChoose: true,
            },
        ],
    },

    usbc_capture: {
        question: 'Does your phone have a Capture button?',
        hint: 'Hold your phone with the screen facing you. Look at the lower-right edge — below the side/power button. The Capture button sits flush and feels slightly different when you press it.',
        stepNum: 3,
        customIllustration: 'capture',
        options: [
            { label: 'Yes — I can feel it on the right edge', next: 'usbc_capture_design' },
            { label: 'No — only the side button is there', next: 'usbc_no_capture_cameras' },
        ],
    },

    usbc_capture_design: {
        question: 'Flip your phone over — what does the camera area look like?',
        hint: 'Compare the camera module on the back of your phone to the two designs below.',
        stepNum: 4,
        images: [
            { src: IMG.select_16, label: 'Separate round lenses', alt: 'iPhone 16 back — individual round camera lenses in corner' },
            { src: IMG.select_17, label: 'Horizontal camera bar', alt: 'iPhone 17 back — cameras in a horizontal bar across the top' },
        ],
        options: [
            {
                label: 'Separate round lenses (like the left photo)',
                result: ['iphone-16', 'iphone-16-plus', 'iphone-16-pro', 'iphone-16-pro-max'],
                gridChoose: true,
            },
            {
                label: 'Horizontal camera bar (like the right photo)',
                result: ['iphone-17', 'iphone-17-air', 'iphone-17-pro', 'iphone-17-pro-max'],
                gridChoose: true,
            },
        ],
    },

    usbc_no_capture_cameras: {
        question: 'How many cameras on the back?',
        stepNum: 4,
        images: [
            { src: IMG.iphone16_colors, label: '1 camera', alt: 'iPhone with 1 rear camera' },
            { src: IMG.iphone17_rear_2cam, label: '2 cameras', alt: 'iPhone with 2 rear cameras' },
            { src: IMG.iphone17pro_rear_3cam, label: '3 cameras', alt: 'iPhone with 3 rear cameras' },
        ],
        options: [
            { label: '1 camera', result: ['iphone-16e'] },
            {
                label: '2 cameras',
                result: ['iphone-15', 'iphone-15-plus'],
                sizeChoose: true,
            },
            {
                label: '3 cameras',
                result: ['iphone-15-pro', 'iphone-15-pro-max'],
                sizeChoose: true,
            },
        ],
    },
};

/* ── component ───────────────────────────────────────────────── */

export default function PhoneIdentifyModal({ open, onClose, onSelectDevice }) {
    const [history, setHistory] = useState([]);
    const [currentStep, setCurrentStep] = useState('home_button');
    const [phase, setPhase] = useState('quiz'); // quiz | size | grid | result | unsupported
    const [resultIds, setResultIds] = useState([]);

    const reset = useCallback(() => {
        setHistory([]);
        setCurrentStep('home_button');
        setPhase('quiz');
        setResultIds([]);
    }, []);

    const handleClose = useCallback(() => {
        reset();
        onClose();
    }, [onClose, reset]);

    const goBack = useCallback(() => {
        if (phase !== 'quiz') {
            setPhase('quiz');
            setResultIds([]);
            return;
        }
        if (history.length === 0) return;
        const prev = history[history.length - 1];
        setHistory((h) => h.slice(0, -1));
        setCurrentStep(prev);
    }, [history, phase]);

    const handleOption = useCallback((opt) => {
        if (opt.next) {
            setHistory((h) => [...h, currentStep]);
            setCurrentStep(opt.next);
        } else if (opt.result) {
            const supported = opt.result.filter(isSupported);
            if (supported.length === 0) {
                setPhase('unsupported');
            } else if (opt.gridChoose) {
                setResultIds(supported);
                setPhase('grid');
            } else if (opt.sizeChoose && supported.length > 1) {
                setResultIds(supported);
                setPhase('size');
            } else {
                setResultIds(supported);
                setPhase('result');
            }
        }
    }, [currentStep]);

    const selectDevice = useCallback((id) => {
        const device = findDevice(id);
        if (device) {
            onSelectDevice(device);
            handleClose();
        }
    }, [onSelectDevice, handleClose]);

    if (!open) return null;

    const step = STEPS[currentStep];
    const progressStep = phase === 'quiz' ? step.stepNum : MAX_STEPS;
    const progressPct = (progressStep / MAX_STEPS) * 100;
    const canGoBack = history.length > 0 || phase !== 'quiz';

    return (
        <div className="pi__overlay" onClick={handleClose}>
            <div className="pi__modal" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="pi__header">
                    {canGoBack ? (
                        <button className="pi__back" onClick={goBack} aria-label="Go back">
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                                <path d="M13 4L7 10L13 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </button>
                    ) : (
                        <span className="pi__header-spacer" />
                    )}
                    <span className="pi__header-title">Identify Your iPhone</span>
                    <button className="pi__close" onClick={handleClose} aria-label="Close">
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                            <path d="M5 5L15 15M15 5L5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                    </button>
                </div>

                {/* Progress */}
                <div className="pi__progress">
                    <div className="pi__progress-track">
                        <div className="pi__progress-fill" style={{ width: `${progressPct}%` }} />
                    </div>
                    <span className="pi__progress-label">Step {progressStep} of {MAX_STEPS}</span>
                </div>

                {/* Body */}
                <div className="pi__body">
                    {phase === 'quiz' && (
                        <div className="pi__step" key={currentStep}>
                            <h3 className="pi__question">{step.question}</h3>
                            {step.hint && <p className="pi__hint">{step.hint}</p>}

                            {/* Custom illustrations for port & capture steps */}
                            {step.customIllustration === 'port' && <PortComparison />}
                            {step.customIllustration === 'capture' && <CaptureButtonDiagram />}

                            {/* Photo illustrations */}
                            {step.images && (
                                <div className={`pi__photos ${step.images.length === 1 ? 'pi__photos--single' : ''}`}>
                                    {step.images.map((img, i) => (
                                        <div key={i} className="pi__photo-item">
                                            <DevicePhoto src={img.src} alt={img.alt} />
                                            {img.label && <span className="pi__photo-label">{img.label}</span>}
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="pi__options">
                                {step.options.map((opt, i) => (
                                    <button key={i} className="pi__option-btn" onClick={() => handleOption(opt)}>
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {phase === 'size' && (
                        <div className="pi__step">
                            <h3 className="pi__question">Which size is yours?</h3>
                            <p className="pi__hint">Compare your phone to each option below.</p>
                            <div className="pi__size-picks">
                                {resultIds.map((id) => {
                                    const d = findDevice(id);
                                    const isBig = /max|plus/i.test(id);
                                    return (
                                        <button key={id} className="pi__size-btn" onClick={() => selectDevice(id)}>
                                            <DevicePhoto
                                                src={DEVICE_CARD_IMG[id]}
                                                alt={d.name}
                                                className={isBig ? 'pi__size-img--big' : 'pi__size-img--small'}
                                            />
                                            <span className="pi__size-name">{d.name}</span>
                                            <span className="pi__size-hint">{isBig ? 'Larger' : 'Standard'}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {phase === 'grid' && (
                        <div className="pi__step">
                            <h3 className="pi__question">Which model matches yours?</h3>
                            <p className="pi__hint">Check Settings → General → About if unsure.</p>
                            <div className="pi__grid-picks">
                                {resultIds.map((id) => {
                                    const d = findDevice(id);
                                    return (
                                        <button key={id} className="pi__grid-btn" onClick={() => selectDevice(id)}>
                                            <DevicePhoto src={DEVICE_CARD_IMG[id]} alt={d.name} className="pi__grid-img" />
                                            <span className="pi__grid-name">{d.name}</span>
                                            <span className="pi__grid-year">{d.year}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {phase === 'result' && resultIds.length >= 1 && (
                        <div className="pi__step pi__result">
                            <DevicePhoto
                                src={DEVICE_CARD_IMG[resultIds[0]]}
                                alt={findDevice(resultIds[0])?.name}
                                className="pi__result-img"
                            />
                            <h3 className="pi__result-name">{findDevice(resultIds[0])?.name}</h3>
                            <p className="pi__result-sub">We identified your phone!</p>
                            <button className="pi__select-btn" onClick={() => selectDevice(resultIds[0])}>
                                Select {findDevice(resultIds[0])?.name}
                            </button>
                        </div>
                    )}

                    {phase === 'unsupported' && (
                        <div className="pi__step pi__unsupported">
                            <div className="pi__unsupported-icon">🔧</div>
                            <h3 className="pi__unsupported-title">We don't currently service this model</h3>
                            <p className="pi__unsupported-text">
                                You can visit{' '}
                                <a href="https://support.apple.com" target="_blank" rel="noopener noreferrer">
                                    apple.com/support
                                </a>{' '}
                                for other repair options.
                            </p>
                            <button className="pi__close-btn" onClick={handleClose}>
                                Close
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
