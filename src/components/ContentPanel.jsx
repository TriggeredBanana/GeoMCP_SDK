import { ChatInterface } from './chatInterface';

export function ContentPanel({ activePanel, onClose }) {
    if (!activePanel) return null;

    return (
        <div className="content-panel">
            <button className="close-btn" onClick={onClose}>✕</button>
            {activePanel === 'Chatbot' ? (
                <ChatInterface />
            ) : (
                <h2>{activePanel}</h2>
            )}
        </div>
    );
}