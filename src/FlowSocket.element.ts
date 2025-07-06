import { FlowNodeElement } from "./FlowNode.element";
import { FlowConnectionElement } from "./FlowConnection.element";
import { FlowNodeIOElement } from "./FlowNodeIO.element";

export class FlowSocketElement extends HTMLElement {

  flowNode: FlowNodeElement;
  connections: FlowConnectionElement[] = [];
  constructor() {
    super();
  }

  flow = false;
  flowNodeIO: FlowNodeIOElement | null;
  color = "white";

  removeConnection(conection: FlowConnectionElement) {
    for (let i = 0; i < this.connections.length; i++) {
      if (this.connections[i] == conection) {
        this.connections.splice(i);
        return;
      }
    }
  }

  connectedCallback() {
    this.style.setProperty("--io-color", this.color);
  }

  disconnectedCallback() {}
}
