import { FlowNodeIOElement } from "./FlowNodeIO.element";
import { FlowConnectionElement } from "./FlowConnection.element";
import { FlowGraphElement } from "./FlowGraph.element";
import { FlowNodeElement } from "./FlowNode.element";

declare global {
  interface HTMLElementTagNameMap {
    "flow-graph": FlowGraphElement;
    "flow-node": FlowNodeElement;
    "flow-connection": FlowConnectionElement;
    "flow-node-io": FlowNodeIOElement;
  }


}

customElements.define("flow-graph", FlowGraphElement);
customElements.define("flow-node", FlowNodeElement);
customElements.define("flow-node-io", FlowNodeIOElement);
customElements.define("flow-connection", FlowConnectionElement);
