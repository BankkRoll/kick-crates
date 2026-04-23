import { render } from "preact";
import { App } from "./App.js";

const mount = document.getElementById("app");
if (mount) {
  render(<App />, mount);
}
