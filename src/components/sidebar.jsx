const items = ["Chatbot", "Kartlag", "Analyse", "Eksporter"];

export function Sidebar({ activeItem, onSelect }) {
  return (
    <nav className="sidebar">
      <h3 className="sidebar-heading">Meny</h3>
      <ul className="sidebar-menu">
        {items.map((item) => (
          <li key={item}>
            <button
              className={`sidebar-item ${activeItem === item ? "active" : ""}`}
              onClick={() => onSelect(item)}
            >
              {item}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
