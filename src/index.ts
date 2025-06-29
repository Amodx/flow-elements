export * from "./FlowNodeRegister";
export * from "./FlowGraph.element";
export * from "./FlowNode.element";
export * from "./FlowNodeIO.element";
export * from "./FlowConnection.element";
import { FlowGraphElement } from "./FlowGraph.element";
import { FlowNodeElement } from "./FlowNode.element";
import { FlowNodeIOElement } from "./FlowNodeIO.element";
import { FlowConnectionElement } from "./FlowConnection.element";

declare global {
  interface HTMLElementTagNameMap {
    "flow-graph": FlowGraphElement;
    "flow-node": FlowNodeElement;
    "flow-connection": FlowConnectionElement;
    "flow-node-io": FlowNodeIOElement;
  }
}

export function RegisterElements(currentWindow: Window = window) {
  currentWindow.customElements.define("flow-graph", FlowGraphElement);
  currentWindow.customElements.define("flow-node", FlowNodeElement);
  currentWindow.customElements.define("flow-node-io", FlowNodeIOElement);
  currentWindow.customElements.define("flow-connection", FlowConnectionElement);
}

RegisterElements();
