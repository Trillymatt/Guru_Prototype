import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from './supabase.js';

/**
 * RepairChat — compact chat widget for a single repair thread.
 *
 * Props:
 *   repairId   – UUID of the repair (each repair = its own chat)
 *   userId     – current auth user id
 *   senderRole – 'customer' | 'technician'
 *   senderName – display name stored with each sent message
 */
export default function RepairChat({ repairId, userId, senderRole, senderName }) {
    const [messages, setMessages] = useState([]);
    const [newMsg, setNewMsg] = useState('');
    const [sending, setSending] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [unread, setUnread] = useState(0);
    const messagesRef = useRef(null);
    const inputRef = useRef(null);
    const isOpenRef = useRef(isOpen);

    // Keep ref in sync so the realtime callback can read the latest value
    useEffect(() => {
        isOpenRef.current = isOpen;
    }, [isOpen]);

    // Scroll the messages container to the bottom (without moving the page)
    const scrollToBottom = useCallback(() => {
        const el = messagesRef.current;
        if (el) {
            el.scrollTop = el.scrollHeight;
        }
    }, []);

    // Fetch existing messages + subscribe to new ones
    useEffect(() => {
        if (!repairId) return;

        const loadMessages = async () => {
            const { data } = await supabase
                .from('messages')
                .select('*')
                .eq('repair_id', repairId)
                .order('created_at', { ascending: true });

            if (data) setMessages(data);
        };

        loadMessages();

        // Realtime subscription for new messages on this repair
        const channel = supabase
            .channel(`chat-${repairId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: `repair_id=eq.${repairId}`,
                },
                (payload) => {
                    const incoming = payload.new;

                    // Deduplicate — if we already optimistically added this message, replace it
                    // with the server version; otherwise append it
                    setMessages((prev) => {
                        const exists = prev.some((m) => m.id === incoming.id);
                        if (exists) {
                            return prev.map((m) => (m.id === incoming.id ? incoming : m));
                        }
                        return [...prev, incoming];
                    });

                    // Bump unread if chat is collapsed and message is from the other party
                    if (incoming.sender_id !== userId && !isOpenRef.current) {
                        setUnread((prev) => prev + 1);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [repairId, userId]);

    // Scroll to bottom when messages change and chat is open
    useEffect(() => {
        if (isOpen) {
            // Use requestAnimationFrame so the DOM has rendered the new messages
            requestAnimationFrame(() => scrollToBottom());
        }
    }, [messages, isOpen, scrollToBottom]);

    // Clear unread when opening + mark chat as read in the database
    useEffect(() => {
        if (isOpen && repairId && userId) {
            setUnread(0);

            // Upsert last_read_at so the dashboard/queue badges clear
            supabase
                .from('chat_last_read')
                .upsert(
                    { repair_id: repairId, user_id: userId, last_read_at: new Date().toISOString() },
                    { onConflict: 'repair_id,user_id' }
                )
                .then(({ error }) => {
                    if (error) console.error('Failed to update chat_last_read:', error.message);
                });
        }
    }, [isOpen, repairId, userId]);

    const sanitizeText = (text) => {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;');
    };

    const handleSend = async (e) => {
        e.preventDefault();
        const body = newMsg.trim();
        if (!body || sending || body.length > 1000) return;

        setSending(true);
        setNewMsg('');

        // Optimistically add the message to local state immediately
        const optimisticMsg = {
            id: crypto.randomUUID(),
            repair_id: repairId,
            sender_id: userId,
            sender_role: senderRole,
            sender_name: senderName || '',
            body,
            created_at: new Date().toISOString(),
            _optimistic: true,
        };

        setMessages((prev) => [...prev, optimisticMsg]);

        const { error } = await supabase
            .from('messages')
            .insert({
                repair_id: repairId,
                sender_id: userId,
                sender_role: senderRole,
                sender_name: senderName || '',
                body,
            });

        if (error) {
            // Remove the optimistic message on failure
            setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id));
            setNewMsg(body); // Put the text back
        }

        setSending(false);

        if (inputRef.current) {
            inputRef.current.focus();
        }
    };

    const formatTime = (timestamp) => {
        const d = new Date(timestamp);
        return d.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
        });
    };

    const formatDate = (timestamp) => {
        const d = new Date(timestamp);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (d.toDateString() === today.toDateString()) return 'Today';
        if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
        return d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
    };

    // Group messages by date
    const groupedMessages = messages.reduce((groups, msg) => {
        const dateKey = new Date(msg.created_at).toDateString();
        if (!groups[dateKey]) groups[dateKey] = [];
        groups[dateKey].push(msg);
        return groups;
    }, {});

    return (
        <div className="rc-chat">
            {/* Collapsible Header */}
            <button
                className="rc-chat__toggle"
                onClick={() => setIsOpen(!isOpen)}
                type="button"
            >
                <div className="rc-chat__toggle-left">
                    <span className="rc-chat__toggle-icon">💬</span>
                    <span className="rc-chat__toggle-title">Messages</span>
                    {unread > 0 && (
                        <span className="rc-chat__unread">{unread}</span>
                    )}
                </div>
                <span className={`rc-chat__chevron ${isOpen ? 'rc-chat__chevron--open' : ''}`}>
                    ›
                </span>
            </button>

            {/* Chat Body */}
            {isOpen && (
                <div className="rc-chat__body">
                    <div className="rc-chat__messages" ref={messagesRef}>
                        {messages.length === 0 ? (
                            <div className="rc-chat__empty">
                                <span className="rc-chat__empty-icon">💬</span>
                                <p>No messages yet</p>
                                <p className="rc-chat__empty-hint">
                                    Send a message to start the conversation
                                </p>
                            </div>
                        ) : (
                            Object.entries(groupedMessages).map(([dateKey, msgs]) => (
                                <div key={dateKey}>
                                    <div className="rc-chat__date-divider">
                                        <span>{formatDate(msgs[0].created_at)}</span>
                                    </div>
                                    {msgs.map((msg) => {
                                        const isOwn = msg.sender_id === userId;
                                        const displayName = msg.sender_name
                                            || (msg.sender_role === 'technician' ? 'Technician' : 'Customer');
                                        return (
                                            <div
                                                key={msg.id}
                                                className={`rc-chat__bubble-row ${isOwn ? 'rc-chat__bubble-row--own' : ''}`}
                                            >
                                                <div
                                                    className={`rc-chat__bubble ${isOwn ? 'rc-chat__bubble--own' : 'rc-chat__bubble--other'}`}
                                                >
                                                    {!isOwn && (
                                                        <span className="rc-chat__sender">
                                                            {displayName}
                                                        </span>
                                                    )}
                                                    <p className="rc-chat__text">{msg.body}</p>
                                                    <span className="rc-chat__time">
                                                        {formatTime(msg.created_at)}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ))
                        )}
                    </div>

                    {/* Input Area */}
                    <form className="rc-chat__input-area" onSubmit={handleSend}>
                        <input
                            ref={inputRef}
                            type="text"
                            className="rc-chat__input"
                            placeholder="Type a message..."
                            value={newMsg}
                            onChange={(e) => setNewMsg(e.target.value)}
                            disabled={sending}
                            maxLength={1000}
                        />
                        <button
                            type="submit"
                            className="rc-chat__send"
                            disabled={!newMsg.trim() || sending}
                            aria-label="Send message"
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="22" y1="2" x2="11" y2="13" />
                                <polygon points="22 2 15 22 11 13 2 9 22 2" />
                            </svg>
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
}
