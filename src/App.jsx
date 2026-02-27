import { Header } from "./components/header.jsx";
import Map from "./components/map.jsx";

function App() {
  return (
    <div className="app">
      <Header />
      <div className="content">
        <Map />
      </div>
    </div>
  );
}

export default App;