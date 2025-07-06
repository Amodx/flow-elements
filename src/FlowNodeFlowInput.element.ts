import { FlowNodeElement } from "./FlowNode.element";
import { FlowConnectionElement } from "./FlowConnection.element";
import { FlowSocketElement } from "./FlowSocket.element";

export class FlowNodeFlowInputElement extends HTMLElement {
  get flowGraph() {
    return this.flowNode.flowGraph;
  }
  flowNode: FlowNodeElement;

  socket: FlowSocketElement;
  connections: FlowConnectionElement[] = [];

  removeConnection(conection: FlowConnectionElement) {
    for (let i = 0; i < this.connections.length; i++) {
      if (this.connections[i] == conection) {
        this.connections.splice(i);
        return;
      }
    }
  }

  connectedCallback() {
    this.socket = this.ownerDocument.createElement("flow-socket");
    this.socket.color = "#00ffff";
    this.socket.flowNode = this.flowNode;
    this.append(this.socket);

    this.flowNode.addEventListener("pointerenter", (event) => {
      if (this.flowGraph._activeConnection?.flow) {
        this.flowNode.classList.add("flow-connect");
      }
    });
    this.flowNode.addEventListener("pointerup", (event) => {
      if (this.flowGraph._activeConnection?.flow) {
        const output = this.flowGraph._activeConnection.outputSocket!;
        this.flowGraph._activeConnection = null;
        this.flowGraph.addConnection(this.socket, output, false);
      }
    });
    this.flowNode.addEventListener("pointerleave", (event) => {
      this.flowNode.classList.remove("flow-connect");
    });
  }

  disconnectedCallback() {}
}
