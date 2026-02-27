export function ContentPanel({ activePanel, onClose }) {
    if (!activePanel) return null; // Don't render if no active panel

    return (
        <div className="content-panel">
            <button className="close-btn" onClick={onClose}>✕</button>
            <h2>{activePanel}</h2>
        </div>
    )
}