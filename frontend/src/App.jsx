import {
  Brain,
  CalendarDays,
  GitBranch,
  Map,
  MapPin,
  Route,
  Sparkles,
  Users
} from "lucide-react";

const nodes = [
  {
    time: "09:00",
    title: "Heritage Anchor",
    cluster: "Walled City",
    type: "culture",
    fatigue: "medium",
    confidence: "92%"
  },
  {
    time: "12:30",
    title: "Local Food Stop",
    cluster: "Central Jaipur",
    type: "recovery",
    fatigue: "low",
    confidence: "88%"
  },
  {
    time: "17:45",
    title: "Sunset Viewpoint",
    cluster: "Amer",
    type: "visual",
    fatigue: "medium",
    confidence: "84%"
  }
];

const insights = [
  "Reduced backtracking by keeping two stops in adjacent clusters.",
  "Inserted a recovery block after a high-walking heritage activity.",
  "Moved scenic activity toward sunset for better photography fit."
];

function App() {
  return (
    <main className="app-shell">
      <nav className="topbar">
        <div className="brand">
          <span className="brand-mark">
            <MapPin size={18} />
          </span>
          <span>WayFinder</span>
        </div>
        <div className="nav-links">
          <a href="#platform">Platform</a>
          <a href="#architecture">Architecture</a>
          <a href="#demo">Demo</a>
        </div>
      </nav>

      <section className="hero" id="platform">
        <div className="hero-copy">
          <span className="eyebrow">AI-assisted travel orchestration</span>
          <h1>Adaptive itineraries that learn how people actually travel.</h1>
          <p>
            WayFinder turns trip planning into a collaborative spatial workspace:
            semantic places, route-aware day lanes, preference memory, and an AI
            copilot that explains why each change improves the journey.
          </p>
          <div className="hero-actions">
            <a href="#demo" className="button primary">View showcase</a>
            <a href="../docs/SYSTEM_DESIGN.md" className="button secondary">Read system design</a>
          </div>
        </div>
        <div className="hero-panel" aria-label="WayFinder workspace preview">
          <div className="canvas-header">
            <div>
              <span>Planning Canvas</span>
              <strong>Jaipur long weekend</strong>
            </div>
            <Users size={20} />
          </div>
          <div className="lane">
            <span className="lane-label">Day 01</span>
            {nodes.map((node) => (
              <article className="activity-node" key={node.title}>
                <div className="node-time">{node.time}</div>
                <h3>{node.title}</h3>
                <p>{node.cluster}</p>
                <div className="node-meta">
                  <span>{node.type}</span>
                  <span>{node.fatigue}</span>
                  <span>{node.confidence}</span>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="feature-grid" id="architecture">
        <Feature icon={Route} title="Semantic Route Graph" text="Places are modeled by cluster, role, fatigue, timing, weather fit, and adjacency." />
        <Feature icon={Brain} title="Adaptive Memory" text="User edits become privacy-safe preference signals that shift future scoring." />
        <Feature icon={GitBranch} title="Explainable Regeneration" text="Changes preserve itinerary context and produce human-readable reasoning traces." />
        <Feature icon={CalendarDays} title="Pacing Intelligence" text="Day structure balances anchors, recovery blocks, social energy, and movement zones." />
      </section>

      <section className="demo" id="demo">
        <div className="demo-card">
          <div className="section-title">
            <Sparkles size={20} />
            <span>Copilot reasoning sample</span>
          </div>
          {insights.map((insight) => (
            <p className="insight" key={insight}>{insight}</p>
          ))}
        </div>
        <div className="demo-card map-card">
          <Map size={28} />
          <h2>Canvas-first planning</h2>
          <p>
            This public demo shows the product surface and architecture without
            exposing proprietary datasets, production credentials, or advanced
            optimization experiments.
          </p>
        </div>
      </section>
    </main>
  );
}

function Feature({ icon: Icon, title, text }) {
  return (
    <article className="feature-card">
      <Icon size={22} />
      <h2>{title}</h2>
      <p>{text}</p>
    </article>
  );
}

export default App;

