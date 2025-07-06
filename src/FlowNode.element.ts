import { FlowNode } from "@amodx/flow/Node/FlowNode";
import { FlowGraphElement } from "./FlowGraph.element";
import { FlowNodeIOElement } from "./FlowNodeIO.element";
import { FlowNodeFlowInputElement } from "FlowNodeFlowInput.element";

export class FlowNodeElement extends HTMLElement {
  flowGraph: FlowGraphElement;
  flowNode: FlowNode;

  enableFlowInput = false;
  private _nodeHeaderContainer: HTMLDivElement;
  private _nodeNameText: HTMLParagraphElement;
  private _nodeBodyContainer: HTMLDivElement;
  private _nodeBodyContentContainer: HTMLDivElement | null = null;

  flowInput: FlowNodeFlowInputElement | null = null;
  inputs: FlowNodeIOElement[] = [];
  outputs: FlowNodeIOElement[] = [];

  *getAllIO(
    mode: "input" | "output" | "io" = "io"
  ): Generator<FlowNodeIOElement> {
    if (mode == "input" || mode == "io") {
      for (const input of this.inputs) {
        yield input;
      }
    }
    if (mode == "output" || mode == "io") {
      for (const output of this.outputs) {
        yield output;
      }
    }
  }

  getInput(name: string) {
    for (const input of this.inputs) {
      if (input.flowNodeIO.name == name) return input;
    }
    return null;
  }

  getOutput(name: string) {
    for (const output of this.outputs) {
      if (output.flowNodeIO.name == name) return output;
    }
    return null;
  }

  updateNodeName(name: string) {
    this.flowNode.name = name;
    this._nodeNameText.innerText = name;
  }

  private _dispose: (() => void) | null = null;
  connectedCallback() {
    this.render();
  }

  reRender() {
    if (this._dispose) this._dispose();
    this.render();
  }

  private render() {
    if (!this.flowNode) {
      throw new Error("<flow-node> was connected without a node property.");
    }
    if (this.enableFlowInput) {
      if (!this.flowInput)
        this.flowInput = this.ownerDocument.createElement(
          "flow-node-flow-input"
        );
      this.flowInput.flowNode = this;
      this.append(this.flowInput);
    }
    //header
    this._nodeHeaderContainer = this.ownerDocument.createElement("div");
    this._nodeHeaderContainer.className = "node-header";
    this.append(this._nodeHeaderContainer);
    //name
    this._nodeNameText = this.ownerDocument.createElement("p");
    this._nodeHeaderContainer.append(this._nodeNameText);
    this._nodeNameText.innerText = this.flowNode.name;

    //body
    this._nodeBodyContainer = this.ownerDocument.createElement("div");
    this._nodeBodyContainer.className = "node-body";
    this.append(this._nodeBodyContainer);
    this._nodeBodyContainer.append(this._renderOutputs());

    if (this._nodeBodyContentContainer) this._nodeBodyContentContainer = null;
    this.renderContent();

    this._nodeBodyContainer.append(this._renderInputs());

    //event listeners
    const pointerDown = (event: MouseEvent) => {
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
        this.ownerDocument.removeEventListener("pointerup", onUp);
        this.flowNode.x = positionX;
        this.flowNode.y = positionY;
      };

      this.ownerDocument.addEventListener("pointerup", onUp);
    };
    this.addEventListener("pointerdown", pointerDown);

    this._dispose = () => {
      this.innerHTML = "";
      this.removeEventListener("pointerdown", pointerDown);
      this._dispose = null;
    };

    this._nodeBodyContainer.style.minHeight = `${
      Math.max(this.inputs.length, this.outputs.length) * 20
    }px`;
  }

  disconnectedCallback() {}

  setActive(active: boolean) {
    if (active) return this.classList.add("active");
    this.classList.remove("active");
  }

  updatePlacements() {
    if (this.flowInput?.socket) {
      for (const connection of this.flowInput.socket.connections) {
        connection.updatePlacements();
      }
    }
    for (const input of this.inputs) {
      for (const connection of input.socket.connections) {
        connection.updatePlacements();
      }
    }
    for (const output of this.outputs) {
      for (const connection of output.socket.connections) {
        connection.updatePlacements();
      }
    }
  }

  delete() {
    this.flowGraph.flowGraph.removeNode(this.flowNode.id);
    if (this.flowInput) {
      for (const connection of this.flowInput.socket.connections) {
        this.flowGraph.deleteConnection(connection);
      }
    }
    for (const input of this.inputs) {
      for (const connection of input.socket.connections) {
        this.flowGraph.deleteConnection(connection);
      }
    }
    for (const output of this.outputs) {
      for (const connection of output.socket.connections) {
        this.flowGraph.deleteConnection(connection);
      }
    }
    this.remove();
  }

  setPosition(x: number, y: number) {
    this.style.transform = `translate(calc(${x}px),calc(${y}px))`;
    this.updatePlacements();
  }

  private _renderInputs() {
    this.inputs = [];
    const inputs = this.ownerDocument.createElement("div");
    inputs.className = "inputs";
    for (const input of this.flowNode.inputs) {
      const inputElm = this.ownerDocument.createElement("flow-node-io");
      inputElm.flowNode = this;
      inputElm.flowNodeIO = input;
      inputElm.className = "input";
      inputs.append(inputElm);
      this.inputs.push(inputElm);
    }
    return inputs;
  }

  private _renderOutputs() {
    this.outputs = [];
    const outputs = this.ownerDocument.createElement("div");
    outputs.className = "outputs";
    for (const output of this.flowNode.outputs) {
      const outputElm = this.ownerDocument.createElement("flow-node-io");
      outputElm.flowNode = this;
      outputElm.flowNodeIO = output;
      outputElm.className = "output";
      outputs.append(outputElm);
      this.outputs.push(outputElm);
    }
    return outputs;
  }

  renderContent() {
    const nodeData = this.flowGraph.flowNodeRegister?.getNode(
      this.flowNode.type
    );
    if (this._nodeBodyContentContainer) {
      this._nodeBodyContentContainer.innerHTML = "";
    }
    if (nodeData?.renderBody) {
      this.classList.add("has-content");
      if (!this._nodeBodyContentContainer) {
        this._nodeBodyContentContainer =
          this.ownerDocument.createElement("div");
        this._nodeBodyContentContainer.className = "content";
        this._nodeBodyContainer.append(this._nodeBodyContentContainer);
      }

      nodeData.renderBody(this._nodeBodyContentContainer, this);
    } else {
      this.classList.add("no-content");
    }
  }
}
