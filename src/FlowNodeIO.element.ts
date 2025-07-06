import { FlowNodeInput } from "@amodx/flow/Node/FlowNodeInput";
import { FlowNodeOutput } from "@amodx/flow/Node/FlowNodeOutput";
import { FlowNodeElement } from "./FlowNode.element";
import { FlowSocketElement } from "./FlowSocket.element";

export class FlowNodeIOElement extends HTMLElement {
  get flowGraph() {
    return this.flowNode.flowGraph;
  }
  flowNode: FlowNodeElement;
  flowNodeIO: FlowNodeInput | FlowNodeOutput;

  socket: FlowSocketElement;

  get ioType() {
    return this.flowNodeIO.ioType;
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

  connectedCallback() {
    if (!this.flowNodeIO) {
      throw new Error(
        "<flow-nodea-io> was connected without a node io property."
      );
    }
    this.socket = this.ownerDocument.createElement("flow-socket");
    this.socket.color = this.getColor();
    this.socket.flowNode = this.flowNode;
    this.socket.flowNodeIO = this;
    this.append(this.socket);
    const title = this.ownerDocument.createElement("div");
    title.className = "title";
    title.innerText = this.flowNodeIO.name;
    this.append(title);
    this.socket.addEventListener("pointerenter", (event) => {
      this.flowGraph._acitveIO = this;
    });
    this.socket.addEventListener("pointerleave", (event) => {
      this.flowGraph._acitveIO = this;
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
        this.flowNodeIO.ioType == "input" ? this.socket : null,
        this.flowNodeIO.ioType == "output" ? this.socket : null,
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
        this.flowGraph._activeConnection = null;
        connection.remove();
        if (
          this.flowGraph._acitveIO &&
          this.isComptable(this.flowGraph._acitveIO)
        ) {
          this.flowGraph.addConnection(
            this.flowNodeIO.ioType == "input"
              ? this.socket
              : this.flowGraph._acitveIO.socket,
            this.flowNodeIO.ioType == "output"
              ? this.socket
              : this.flowGraph._acitveIO.socket,
            false
          );
        }
        this.flowGraph.removeEventListener("pointermove", moveListener);
        this.ownerDocument.removeEventListener("pointerup", onUp);
      };

      this.ownerDocument.addEventListener("pointerup", onUp);
    });
  }

  disconnectedCallback() {}
}
