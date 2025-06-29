import { FlowNode } from "@amodx/flow/Node/FlowNode";
import { FlowGraphElement } from "./FlowGraph.element";
import { FlowNodeIOElement } from "./FlowNodeIO.element";

export class FlowNodeElement extends HTMLElement {
  flowGraph: FlowGraphElement;
  flowNode: FlowNode;

  private _nodeHeaderContainer: HTMLDivElement;
  private _nodeNameText: HTMLParagraphElement;
  private _nodeBodyContainer: HTMLDivElement;
  private _nodeBodyContentContainer: HTMLDivElement;

  inputs: FlowNodeIOElement[] = [];
  outputs: FlowNodeIOElement[] = [];
  connectedCallback() {
    if (!this.flowNode) {
      throw new Error("<flow-node> was connected without a node property.");
    }
    //header
    this._nodeHeaderContainer = document.createElement("div");
    this._nodeHeaderContainer.className = "node-header";
    this.append(this._nodeHeaderContainer);
    //name
    this._nodeNameText = document.createElement("p");
    this._nodeHeaderContainer.append(this._nodeNameText);
    this._nodeNameText.innerText = this.flowNode.name;

    this.renderBody();
    //event listeners
    this.addEventListener("pointerdown", (event) => {
      event.stopPropagation();
      this.flowGraph.setActiveNode(this);

      const { clientX: startX, clientY: startY } = event;
      const zoomFactor = this.flowGraph.flowGraph.editorData.zoom;
      const nodeX = this.flowNode.x;
      const nodeY = this.flowNode.y;
      let positionX = nodeX;
      let positionY = nodeY;

      const moveListener = (event: MouseEvent) => {
        const { clientX, clientY } = event;
        positionX = nodeX + (clientX - startX) / zoomFactor;
        positionY = nodeY + (clientY - startY) / zoomFactor;
        this.setPosition(positionX, positionY);
      };
      this.flowGraph.addEventListener("pointermove", moveListener);
      const onUp = () => {
        this.flowGraph.removeEventListener("pointermove", moveListener);
        window.removeEventListener("pointerup", onUp);
        this.flowNode.x = positionX;
        this.flowNode.y = positionY;
      };

      window.addEventListener("pointerup", onUp);
    });
  }

  disconnectedCallback() {}

  setActive(active: boolean) {
    if (active) return this.classList.add("active");
    this.classList.remove("active");
  }

  updatePlacements() {
    for (const input of this.inputs) {
      for (const connection of input.connections) {
        connection.updatePlacements();
      }
    }
    for (const output of this.outputs) {
      for (const connection of output.connections) {
        connection.updatePlacements();
      }
    }
  }

  delete() {
    this.flowGraph.flowGraph.removeNode(this.flowNode.id);
    this.remove();
    for (const input of this.inputs) {
      for (const connection of input.connections) {
        connection.delete();
      }
    }
    for (const output of this.outputs) {
      for (const connection of output.connections) {
        connection.delete();
      }
    }
  }

  setPosition(x: number, y: number) {
    this.style.transform = `translate(calc(${x}px),calc(${y}px))`;
    this.updatePlacements();
  }

  private renderBody() {
    //body
    this._nodeBodyContainer = document.createElement("div");
    this._nodeBodyContainer.className = "node-body";
    this.append(this._nodeBodyContainer);
    const outputs = document.createElement("div");
    outputs.className = "outputs";
    const inputs = document.createElement("div");
    inputs.className = "inputs";

    const nodeData = this.flowGraph.flowNodeRegister?.getNode(
      this.flowNode.type
    );

    for (const output of this.flowNode.outputs) {
      const outputElm = document.createElement("flow-node-io");
      outputElm.flowNode = this;
      outputElm.flowNodeIO = output;
      outputElm.className = "output";
      outputs.append(outputElm);
      this.outputs.push(outputElm);
    }
    this._nodeBodyContainer.append(outputs);

    if (nodeData?.renderBody) {
      this.classList.add("has-content");
      this._nodeBodyContentContainer = document.createElement("div");
      this._nodeBodyContentContainer.className = "content";
      nodeData.renderBody(this._nodeBodyContentContainer, this);
      this._nodeBodyContainer.append(this._nodeBodyContentContainer);
    } else {
      this.classList.add("no-content");
    }

    for (const input of this.flowNode.inputs) {
      const inputElm = document.createElement("flow-node-io");
      inputElm.flowNode = this;
      inputElm.flowNodeIO = input;
      inputElm.className = "input";
      inputs.append(inputElm);
      this.inputs.push(inputElm);
    }
    this._nodeBodyContainer.append(inputs);
  }
}
