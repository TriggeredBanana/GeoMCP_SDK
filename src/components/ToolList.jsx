import { useState, useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFilter } from '@fortawesome/free-solid-svg-icons';
import {
  Circle,
  SquareDot,
  SquaresIntersect,
  Globe,
  CircleDot,
  LayoutGrid,
  FileText,
  Search,
  MapPin,
  Paintbrush,
  Church,
  Check,
  TextSearch,
  Sparkles,
  Blend,
  FolderSearch,
  Landmark,
  ShieldCheck,
  BarChart3,
  Wrench,
} from 'lucide-react';
import toolCatalog from '../../shared/tool_catalog.json';

const ICON_BY_NAME = {
  Circle,
  SquareDot,
  SquaresIntersect,
  Globe,
  CircleDot,
  LayoutGrid,
  FileText,
  Search,
  MapPin,
  Paintbrush,
  Church,
  TextSearch,
  Sparkles,
  Blend,
  FolderSearch,
  Landmark,
  ShieldCheck,
  BarChart3,
  Wrench,
};

const ALL_TOOLS = toolCatalog.tools
  .filter(tool => !tool.hidden)
  .map(tool => ({
    ...tool,
    icon: ICON_BY_NAME[tool.icon] || Wrench,
  }));

const CATEGORIES = [...new Set(ALL_TOOLS.map(tool => tool.category))];

export { ALL_TOOLS };

export function ToolList({ selectedTools = [], onToggleTool, onGoToChat }) {
  const [search, setSearch]               = useState('');
  const [filterOpen, setFilterOpen]       = useState(false);
  const [activeFilters, setActiveFilters] = useState(new Set());
  const [sortAlpha, setSortAlpha]         = useState(false);

  const selectedNames = useMemo(() => new Set(selectedTools.map(t => t.name)), [selectedTools]);

  const hasFilters = activeFilters.size > 0;

  const visibleTools = useMemo(() => {
    const q = search.toLowerCase();

    let list = ALL_TOOLS.filter(t =>
      (!hasFilters || activeFilters.has(t.category)) &&
      t.name.toLowerCase().includes(q)
    );

    if (sortAlpha) {
      return [...list].sort((a, b) => a.name.localeCompare(b.name, 'nb'));
    }

    return list;
  }, [search, activeFilters, hasFilters, sortAlpha]);

  function toggleFilter(opt) {
    setActiveFilters(prev => {
      const next = new Set(prev);
      next.has(opt) ? next.delete(opt) : next.add(opt);
      return next;
    });
  }

  function clearFilters() {
    setActiveFilters(new Set());
    setSortAlpha(false);
    setFilterOpen(false);
  }

  const badgeCount = activeFilters.size + (sortAlpha ? 1 : 0);

  return (
    <div className="tools-panel">
      <div className="tools-header">
        <h2 className="tools-title">Verktøy</h2>
        <p className="tools-desc">Utforsk tilgjengelige verktøy og bruk dem direkte i chatten.</p>
      </div>

      <div className="tools-top-row">
        <div className="tools-search-wrap">
          <input
            className="tools-search"
            type="text"
            placeholder="Søk etter verktøy..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="tools-filter-wrap">
          <button
            className={`tools-filter-btn${filterOpen ? ' active' : ''}`}
            onClick={() => setFilterOpen(o => !o)}
          >
            <FontAwesomeIcon icon={faFilter} />
            {badgeCount > 0 && <span className="tools-filter-badge">{badgeCount}</span>}
          </button>

          {filterOpen && (
            <div className="tools-filter-dropdown">
              <div className="tools-filter-section-label">Kategori</div>
              {CATEGORIES.map(opt => (
                <button
                  key={opt}
                  className={`tools-filter-option${activeFilters.has(opt) ? ' active' : ''}`}
                  onClick={() => toggleFilter(opt)}
                >
                  {opt}
                </button>
              ))}
              <div className="tools-filter-divider" />
              <div className="tools-filter-section-label">Sortering</div>
              <button
                className={`tools-filter-option${sortAlpha ? ' active' : ''}`}
                onClick={() => setSortAlpha(o => !o)}
              >
                A–Å
              </button>
              {badgeCount > 0 && (
                <button className="tools-filter-option tools-filter-clear" onClick={clearFilters}>
                  Nullstill filter
                </button>
              )}
            </div>
          )}
        </div>

      </div>

      <div className="tools-grid">
        {visibleTools.length > 0 ? visibleTools.map(tool => {
          const Icon = tool.icon;
          const isSelected = selectedNames.has(tool.name);
          return (
            <button
              key={tool.name}
              className={`tools-tool-box${isSelected ? ' selected' : ''}`}
              onClick={() => onToggleTool?.(tool)}
            >
              <span className="tools-tool-box-icon">
                {isSelected
                  ? <Check size={22} strokeWidth={2.5} />
                  : <Icon size={22} strokeWidth={2.1} />}
              </span>
              <span className="tools-tool-box-name">{tool.name}</span>
              <span className="tools-tool-box-desc">{tool.desc}</span>
            </button>
          );
        }) : (
          <p className="tools-no-results">Ingen verktøy matcher søket ditt.</p>
        )}
      </div>

      {selectedTools.length > 0 && (
        <div className="tools-action-bar">
          <span className="tools-action-count">{selectedTools.length} verktøy valgt</span>
          <button className="tools-action-btn" onClick={onGoToChat}>Bruk i chat →</button>
        </div>
      )}
    </div>
  );
}
