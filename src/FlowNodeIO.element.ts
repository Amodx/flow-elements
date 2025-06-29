import { FlowNodeInput } from "@amodx/flow/Node/FlowNodeInput";
import { FlowNodeOutput } from "@amodx/flow/Node/FlowNodeOutput";
import { FlowNodeElement } from "./FlowNode.element";
import { FlowConnectionElement } from "./FlowConnection.element";

export class FlowNodeIOElement extends HTMLElement {
  get flowGraph() {
    return this.flowNode.flowGraph;
  }
  flowNode: FlowNodeElement;
  flowNodeIO: FlowNodeInput | FlowNodeOutput;

  socket: HTMLDivElement;
  connections: FlowConnectionElement[] = [];
  constructor() {
    super();
    this.socket = this.ownerDocument.createElement("div");
    this.socket.className = "socket";
  }

  getColor() {
    const data = this.flowGraph.flowNodeRegister?.getNodeIO(
      this.flowNodeIO.valueType
    );
    if (!data) return "white";
    return data.color;
  }

  isComptable(io: FlowNodeIOElement) {
    if (io.flowNodeIO.ioType == this.flowNodeIO.ioType) return false;
    return true;
  }

  removeConnection(conection: FlowConnectionElement) {
    for (let i = 0; i < this.connections.length; i++) {
      if (this.connections[i] == conection) {
        this.connections.splice(i);
        return;
      }
    }
  }

  connectedCallback() {
    if (!this.flowNodeIO) {
      throw new Error(
        "<flow-node-io> was connected without a node io property."
      );
    }
    this.style.setProperty("--io-color", this.getColor());
    this.append(this.socket);
    const title = this.ownerDocument.createElement("div");
    title.className = "title";
    title.innerText = this.flowNodeIO.name;
    this.append(title);
    this.socket.addEventListener("pointerenter", (event) => {
      this.flowGraph._acitveIO = this;
    });
    this.socket.addEventListener("pointerleave", (event) => {
      this.flowGraph._acitveIO = null;
    });
    this.socket.addEventListener("pointerdown", (event) => {
      event.stopPropagation();
      const { x: startX, y: startY } =
        this.flowGraph._getMousePositionInSVG(event);
      const center = this.flowGraph._getElementCenterInSVG(this.socket);
      const socketX = center.x;
      const socketY = center.y;
      let positionX = socketX;
      let positionY = socketY;

      const connection = this.flowGraph.addConnection(
        this.flowNodeIO.ioType == "input" ? this : null,
        this.flowNodeIO.ioType == "output" ? this : null,
        true
      );

      const moveListener = (event: MouseEvent) => {
        const { x, y } = this.flowGraph._getMousePositionInSVG(event);
        positionX = socketX + (x - startX);
        positionY = socketY + (y - startY);

        if (this.flowNodeIO.ioType == "input") {
          connection.updateStart(positionX, positionY);
        } else {
          connection.updateEnd(positionX, positionY);
        }
      };
      moveListener(event);
      this.flowGraph.addEventListener("pointermove", moveListener);
      const onUp = () => {
        connection.remove();
        if (
          this.flowGraph._acitveIO &&
          this.isComptable(this.flowGraph._acitveIO)
        ) {
          const newConnection = this.flowGraph.addConnection(
            this.flowNodeIO.ioType == "input" ? this : this.flowGraph._acitveIO,
            this.flowNodeIO.ioType == "output"
              ? this
              : this.flowGraph._acitveIO,
            false
          );
          this.connections.push(newConnection);
          this.flowGraph._acitveIO.connections.push(newConnection);
        }
        this.flowGraph.removeEventListener("pointermove", moveListener);
        this.ownerDocument.removeEventListener("pointerup", onUp);
      };

      this.ownerDocument.addEventListener("pointerup", onUp);
    });
  }

  disconnectedCallback() {}
}
