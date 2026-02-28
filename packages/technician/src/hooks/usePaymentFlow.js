import { useReducer, useCallback } from 'react';

const initialState = {
    showModal: false,
    step: 'tip',           // 'tip' | 'payment' | 'signature'
    method: null,           // null | 'cash' | 'square-qr' | 'square-tap'
    tipAmount: 0,
    processing: false,
    error: '',
    squarePhase: 'idle',   // 'idle' | 'loading' | 'ready' | 'waiting'
    squarePaymentUrl: null,
    cashReceived: '',
    splitCashAmount: 0,
};

function paymentReducer(state, action) {
    switch (action.type) {
        case 'SHOW_MODAL':
            return { ...initialState, showModal: true };

        case 'HIDE_MODAL':
            return { ...initialState };

        case 'SET_TIP':
            return { ...state, tipAmount: action.payload, step: 'payment' };

        case 'SET_PAYMENT_METHOD':
            return { ...state, method: action.payload };

        case 'SET_STEP':
            return { ...state, step: action.payload };

        case 'START_PROCESSING':
            return { ...state, processing: true, error: '' };

        case 'STOP_PROCESSING':
            return { ...state, processing: false };

        case 'PAYMENT_ERROR':
            return { ...state, error: action.payload, processing: false };

        case 'SET_SQUARE_PHASE':
            return { ...state, squarePhase: action.payload };

        case 'SET_SQUARE_URL':
            return { ...state, squarePaymentUrl: action.payload };

        case 'SET_CASH_RECEIVED': {
            const val = action.payload.replace(/[^0-9.]/g, '');
            const parts = val.split('.');
            return {
                ...state,
                cashReceived: parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : val,
            };
        }

        case 'SET_SPLIT_CASH':
            return { ...state, splitCashAmount: action.payload };

        case 'BACK_TO_TIP':
            return { ...state, step: 'tip' };

        case 'BACK_TO_METHOD':
            return {
                ...state,
                method: null,
                squarePaymentUrl: null,
                squarePhase: 'idle',
                cashReceived: '',
            };

        default:
            return state;
    }
}

export default function usePaymentFlow() {
    const [payment, dispatch] = useReducer(paymentReducer, initialState);

    const showModal = useCallback(() => dispatch({ type: 'SHOW_MODAL' }), []);
    const hideModal = useCallback(() => dispatch({ type: 'HIDE_MODAL' }), []);
    const setTip = useCallback((amount) => dispatch({ type: 'SET_TIP', payload: amount }), []);
    const setMethod = useCallback((method) => dispatch({ type: 'SET_PAYMENT_METHOD', payload: method }), []);
    const setStep = useCallback((step) => dispatch({ type: 'SET_STEP', payload: step }), []);
    const startProcessing = useCallback(() => dispatch({ type: 'START_PROCESSING' }), []);
    const stopProcessing = useCallback(() => dispatch({ type: 'STOP_PROCESSING' }), []);
    const setError = useCallback((msg) => dispatch({ type: 'PAYMENT_ERROR', payload: msg }), []);
    const setSquarePhase = useCallback((phase) => dispatch({ type: 'SET_SQUARE_PHASE', payload: phase }), []);
    const setSquareUrl = useCallback((url) => dispatch({ type: 'SET_SQUARE_URL', payload: url }), []);
    const setCashReceived = useCallback((val) => dispatch({ type: 'SET_CASH_RECEIVED', payload: val }), []);
    const setSplitCash = useCallback((amount) => dispatch({ type: 'SET_SPLIT_CASH', payload: amount }), []);
    const backToTip = useCallback(() => dispatch({ type: 'BACK_TO_TIP' }), []);
    const backToMethod = useCallback(() => dispatch({ type: 'BACK_TO_METHOD' }), []);

    return {
        payment,
        showModal,
        hideModal,
        setTip,
        setMethod,
        setStep,
        startProcessing,
        stopProcessing,
        setError,
        setSquarePhase,
        setSquareUrl,
        setCashReceived,
        setSplitCash,
        backToTip,
        backToMethod,
    };
}
