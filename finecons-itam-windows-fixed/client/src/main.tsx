import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

document.title = "IT Asset Management Platform";

createRoot(document.getElementById("root")!).render(<App />);
