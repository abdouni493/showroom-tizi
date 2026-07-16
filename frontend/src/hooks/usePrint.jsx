import { createRoot } from "react-dom/client";

// Render a React node into a transient print container and trigger window.print()
export function printNode(node) {
  const container = document.createElement("div");
  container.className = "print-area";
  document.body.appendChild(container);
  const root = createRoot(container);
  root.render(node);

  // give the browser a moment to render images/layout
  setTimeout(() => {
    window.print();
    setTimeout(() => {
      root.unmount();
      document.body.removeChild(container);
    }, 600);
  }, 350);
}
