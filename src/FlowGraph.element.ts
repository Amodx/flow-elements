import { FlowGraph } from "@amodx/flow/Graph/FlowGraph";
import { NodeData } from "@amodx/flow/Node/FlowNode.types";
import { FlowNodeElement } from "./FlowNode.element";
import { FlowNodeIOElement } from "./FlowNodeIO.element";
import { FlowConnectionElement } from "./FlowConnection.element";
import { FlowNodeRegister } from "./FlowNodeRegister";
import { FlowNodeInput } from "@amodx/flow/Node/FlowNodeInput";
import { FlowGraphData } from "@amodx/flow/Graph/FlowGraph.types";
import { FlowSocketElement } from "./FlowSocket.element";
import { FlowNodeOutput } from "@amodx/flow/Node/FlowNodeOutput";

const MAX_GRAPH_SIZE = 10_000;
export class GraphEvent<T = any> extends Event {
  constructor(type: string, public data: T) {
    super(type, { bubbles: false, composed: false });
  }
}

interface FlowGraphElementEventMap {
  "graph-clicked": GraphEvent<FlowGraphElement>;
  "node-added": GraphEvent<FlowNodeElement>;
  "node-clicked": GraphEvent<FlowNodeElement>;
  "node-deleted": GraphEvent<FlowNodeElement>;
  "connection-added": GraphEvent<FlowConnectionElement>;
  "connection-clicked": GraphEvent<FlowConnectionElement>;
  "connection-deleted": GraphEvent<FlowConnectionElement>;
}

export class FlowGraphElement extends HTMLElement {
  flowGraph: FlowGraph;
  flowNodeRegister: FlowNodeRegister;
  flowNodeBodyCSS = "";

  get editorData() {
    return this.flowGraph.editorData;
  }

  private _shadow: ShadowRoot;
  _connectionsSVG: SVGSVGElement;
  private _connections: HTMLDivElement;
  private _graphElm: HTMLDivElement;
  private _nodesElm: HTMLDivElement;
  private _isImporting = false;
  _activeConnection: FlowConnectionElement | null = null;
  _acitveNode: FlowNodeElement | null = null;
  _acitveIO: FlowNodeIOElement | null = null;
  _nodes = new Map<number, FlowNodeElement>();

  constructor() {
    super();
    this._shadow = this.attachShadow({ mode: "open" });
    this._graphElm = this.ownerDocument.createElement("div");
    this._graphElm.className = "flow-graph";
    this._nodesElm = this.ownerDocument.createElement("div");
    this._nodesElm.className = "flow-nodes";
    this._graphElm.append(this._nodesElm);
  }

  _getMousePositionInGraph(event: MouseEvent) {
    const bounds = this.getBoundingClientRect();
    const zoom = this.editorData.zoom;

    const offsetX = event.clientX - bounds.left;
    const offsetY = event.clientY - bounds.top;

    const graphWidth = this._graphElm.clientWidth;
    const graphHeight = this._graphElm.clientHeight;

    // Undo the centering first (translate(50%, 50%))
    const centerAdjustedX = offsetX - graphWidth / 2;
    const centerAdjustedY = offsetY - graphHeight / 2;

    // Undo zoom last
    const zoomedX = centerAdjustedX / zoom;
    const zoomedY = centerAdjustedY / zoom;

    // Undo pan (camera offset)
    const graphX = zoomedX - this.editorData.x / zoom;
    const graphY = zoomedY - this.editorData.y / zoom;

    return { x: graphX, y: graphY };
  }

  _getMousePositionInSVG(event: MouseEvent) {
    const point = this._connectionsSVG.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;

    const ctm = this._connectionsSVG.getScreenCTM();
    if (!ctm) throw new Error("Missing SVG CTM");
    return point.matrixTransform(ctm.inverse());
  }

  _getElementCenterInSVG(el: HTMLElement) {
    const rect = el.getBoundingClientRect();
    const point = this._connectionsSVG.createSVGPoint();
    point.x = rect.left + rect.width / 2;
    point.y = rect.top + rect.height / 2;

    const ctm = this._connectionsSVG.getScreenCTM();
    if (!ctm) throw new Error("Missing SVG CTM");
    return point.matrixTransform(ctm.inverse());
  }

  private _clearActive() {
    if (this._acitveNode) this._acitveNode.setActive(false);
    this._acitveNode = null;
    if (this._activeConnection) this._activeConnection.setActive(false);
    this._activeConnection = null;
  }

  setActiveNode(node: FlowNodeElement | null) {
    this._clearActive();
    this._acitveNode = node;
    if (!node) return;
    node.setActive(true);
    this.dispatchEvent(new GraphEvent("node-clicked", this._acitveNode));
  }

  setActiveConection(connection: FlowConnectionElement | null) {
    this._clearActive();
    this._activeConnection = connection;
    if (!connection) return;
    connection.setActive(true);
    this.dispatchEvent(
      new GraphEvent("connection-clicked", this._activeConnection)
    );
  }

  importGraph(data: FlowGraphData) {
    this._isImporting = true;
    this.flowGraph.fromJSON(data);
    for (const node of this.flowGraph.nodes) {
      if (!node) continue;
      this.addNode(node.x, node.y, node);
    }
    for (const node of this.flowGraph.nodes) {
      if (!node) continue;
      const nodeElm = this._nodes.get(node.id)!;
      for (const input of nodeElm.inputs) {
        const flowInput = <FlowNodeInput>input.flowNodeIO;
        if (
          flowInput.targetNodeId !== undefined &&
          flowInput.targetOutputName !== undefined
        ) {
          const outputNode = this._nodes.get(flowInput.targetNodeId)!;
          const output = outputNode.getOutput(flowInput.targetOutputName);
          this.addConnection(input.socket, output!.socket, false);
        }
      }
      for (const output of nodeElm.outputs) {
        if (output.flowNodeIO.valueType !== "flow") continue;
        if (output.flowNodeIO.value < 0) continue;
        const inputNode = this._nodes.get(output.flowNodeIO.value);
        this.addConnection(inputNode!.flowInput!.socket, output.socket, false);
      }
    }
    this._isImporting = false;
  }

  updateCamera(x: number, y: number, zoom: number) {
    this.editorData.x = x;
    this.editorData.y = y;
    this.editorData.zoom = zoom;
    this._graphElm.style.transform = `translate(${x}px,${y}px) scale(${zoom})`;
  }

  centerCamera() {
    const graphParentBounds = this.getBoundingClientRect();

    const graphBounds = this._graphElm.getBoundingClientRect();
    const x = -graphBounds.width / 2 + graphParentBounds.width / 2;
    const y = -graphBounds.height / 2 + graphParentBounds.height / 2;

    this.updateCamera(x, y, 1);
  }

  addNode(x: number, y: number, nodeData: NodeData) {
    const node = this.flowGraph.addNode(nodeData);
    node.x = x;
    node.y = y;
    const nodeElm = this.ownerDocument.createElement("flow-node");
    nodeElm.flowGraph = this;
    nodeElm.flowNode = node;
    const nodeTypeData = this.flowNodeRegister.getNode(node.type);

    nodeElm.enableFlowInput = nodeTypeData?.enableFlowInput || false;
    this._nodesElm.append(nodeElm);
    nodeElm.setPosition(x, y);

    this._nodes.set(node.id, nodeElm);

    if (!this._isImporting) {
      if (nodeTypeData?.created) {
        nodeTypeData.created(nodeElm);
        this.dispatchEvent(new GraphEvent("node-added", nodeElm));
      }
    }
  }

  deleteNode(node: FlowNodeElement) {
    this._nodes.delete(node.flowNode.id);
    node.delete();
    const nodeTypeData = this.flowNodeRegister.getNode(node.flowNode.type);
    if (nodeTypeData?.deleted) {
      nodeTypeData.deleted(node);
    }

    this.dispatchEvent(new GraphEvent("node-deleted", node));
  }

  addConnection(
    input: FlowSocketElement | null,
    output: FlowSocketElement | null,
    transistent = false
  ) {
    const connectionElm = this.ownerDocument.createElement("flow-connection");
    connectionElm.inputSocket = input || null;
    connectionElm.outputSocket = output || null;
    connectionElm.flowGraph = this;
    connectionElm.transistent = transistent;

    if (output?.flowNodeIO?.flowNodeIO.valueType == "flow") {
      connectionElm.flow = true;
    }

    let color = "white";
    const mainNode = output ? output : input!;
    const data = this.flowNodeRegister?.getNodeIO(
      mainNode.flowNodeIO?.flowNodeIO.valueType || ""
    );
    if (!data) {
      color = "white";
    } else {
      color = data.color;
    }
    connectionElm.color = color;

    this._connections.append(connectionElm);
    if (!transistent) {
      const inputNodeIO = connectionElm.inputSocket!;
      const inputNodeTypeData = this.flowNodeRegister.getNode(
        inputNodeIO!.flowNode.flowNode.type
      );
      const outputNodeIO = connectionElm.outputSocket!;
      const outputNodeTypeData = this.flowNodeRegister.getNode(
        outputNodeIO!.flowNode.flowNode.type
      );
      if (!this._isImporting) {
        if (connectionElm.flow) {
          if (inputNodeTypeData?.flowConnectionAdded) {
            inputNodeTypeData.flowConnectionAdded(
              inputNodeIO.flowNode,
              input!,
              connectionElm
            );
          }
          if (outputNodeTypeData?.flowConnectionRemoved) {
            outputNodeTypeData.flowConnectionRemoved(
              outputNodeIO.flowNode,
              output!,
              connectionElm
            );
          }
          if (output!.flowNodeIO?.flowNodeIO instanceof FlowNodeOutput) {
            output!.flowNodeIO!.flowNodeIO.value = input!.flowNode!.flowNode.id;
          }
        } else {
          if (inputNodeTypeData?.connectionAdded) {
            inputNodeTypeData.connectionAdded(
              inputNodeIO.flowNode,
              input!.flowNodeIO!,
              connectionElm
            );
          }
          if (outputNodeTypeData?.connectionAdded) {
            outputNodeTypeData.connectionAdded(
              outputNodeIO.flowNode,
              output!.flowNodeIO!,
              connectionElm
            );
          }
          if (input!.flowNodeIO?.flowNodeIO instanceof FlowNodeInput) {
            input?.flowNodeIO.flowNodeIO.setTarget(
              output!.flowNode.flowNode.id,
              output!.flowNodeIO!.flowNodeIO.name
            );
          }
        }
      }

      input!.connections.push(connectionElm);
      output!.connections.push(connectionElm);
    } else {
      this._activeConnection = connectionElm;
    }
    if (!this._isImporting)
      this.dispatchEvent(new GraphEvent("connection-added", connectionElm));

    return connectionElm;
  }

  deleteConnection(connection: FlowConnectionElement) {
    connection.delete();

    if (!connection.transistent && !connection.flow) {
      if (connection.inputSocket?.flowNodeIO instanceof FlowNodeInput) {
        connection.inputSocket.flowNodeIO.clearTarget();
      }
      const inputNodeIO = connection.inputSocket!;
      const inputNodeTypeData = this.flowNodeRegister.getNode(
        inputNodeIO!.flowNode.flowNode.type
      );
      if (inputNodeTypeData?.connectionRemoved) {
        inputNodeTypeData.connectionRemoved(
          inputNodeIO.flowNode,
          connection.inputSocket!.flowNodeIO!,
          connection
        );
      }
      const outputNodeIO = connection.outputSocket!;
      const outputNodeTypeData = this.flowNodeRegister.getNode(
        outputNodeIO!.flowNode.flowNode.type
      );
      if (outputNodeTypeData?.connectionRemoved) {
        outputNodeTypeData.connectionRemoved(
          outputNodeIO.flowNode,
          connection.outputSocket!.flowNodeIO!,
          connection
        );
      }
    }

    if (!connection.transistent && connection.flow) {
      const inputNodeIO = connection.inputSocket!;
      const inputNodeTypeData = this.flowNodeRegister.getNode(
        inputNodeIO!.flowNode.flowNode.type
      );
      const outputNodeIO = connection.outputSocket!;
      const outputNodeTypeData = this.flowNodeRegister.getNode(
        outputNodeIO!.flowNode.flowNode.type
      );
      outputNodeIO.flowNodeIO!.flowNodeIO!.value = -1;
      if (inputNodeTypeData?.flowConnectionRemoved) {
        inputNodeTypeData.flowConnectionRemoved(
          inputNodeIO.flowNode,
          connection.inputSocket!!,
          connection
        );
      }
      if (outputNodeTypeData?.flowConnectionRemoved) {
        outputNodeTypeData.flowConnectionRemoved(
          outputNodeIO.flowNode,
          connection.outputSocket!,
          connection
        );
      }
    }

    this.dispatchEvent(new GraphEvent("connection-deleted", connection));
  }

  connectedCallback() {
    if (!this.flowGraph) {
      throw new Error("<flow-graph> was connected without a graph property.");
    }
    this._shadow.innerHTML = /* html */ `
<style>
  :host {
    position: relative;
    display: block;
    width: 100%;
    height: 100%;
    font-family: "Segoe UI", Roboto, Helvetica, Arial, sans-serif;

    * {
      margin: 0;
      padding: 0;
    }
  }

  .flow-graph {
    position: absolute;
    width: ${MAX_GRAPH_SIZE}px;
    height: ${MAX_GRAPH_SIZE}px;
    top: 0;
    left: 0;
    will-change: transform;
    background-color: #494e52;
  }

  .flow-nodes {
    position: absolute;
    width: 100%;
    height: 100%;
    transform: translate(50%, 50%);
    z-index: 100;
    pointer-events: none;
  }

  .graph-connections {
    position: absolute;
    width: 100%;
    height: 100%;
    top: 0;
    left: 0;
    z-index: 50;
    pointer-events: auto;

    .connection {
      pointer-events: auto;
      filter: drop-shadow(10px 10px 0px rgba(0, 0, 0, 0.5));

      &:hover {
        cursor: pointer;
        filter: drop-shadow(0px 0px 5px white);
      }

      &.active {
        filter: drop-shadow(0px 0px 5px white);
      }
    }
  }

  flow-node {
    position: absolute;
    box-shadow: 10px 10px 0px rgba(0, 0, 0, 0.5);
    background-color: black;
    border: 4px solid black;
    user-select: none;
    cursor: move;
    min-width: 120px;
    pointer-events: all;
    border-radius: 15px;

    &.active {
      border: 4px solid white;
    }

    &.flow-connect {
       box-shadow: 0px 0px 20px #00ffff;
    }

    flow-node-flow-input {
      position: absolute;
      top: 0;
      left: -15px;
      display: flex;
      flex-direction: row;
      justify-content: center;
    }

    .node-header {
      min-width: 150px;
      background: black;
      color: white;
      padding: 10px;
      border-top-left-radius: 15px;
      border-top-right-radius: 15px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }

    .node-body {
      background: #808080;
      color: white;
      padding-top: 20px;
      padding-bottom: 20px;
      position: relative;
      border-bottom-left-radius: 15px;
      border-bottom-right-radius: 15px;

      .content {
        cursor: default;

        ${this.flowNodeBodyCSS}
      }

      .inputs {
        display: flex;
        flex-direction: column;
        justify-content: center;

        flow-node-io {
          margin-left: -15px;
        }
      }

      .outputs {
        display: flex;
        flex-direction: column;
        justify-content: center;

        flow-node-io {
          margin-left: 15px;
        }
      }
    }

    &.no-content {
      .node-body {
        .inputs,
        .outputs {
          position: absolute;
          top: 0;
          width: 100%;
          height: 100%;
        }

        .inputs {
          left: 0;
        }

        .outputs {
          right: 0;
        }
      }
    }

    &.has-content {
      .node-body {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
    }
  }

  flow-node-io {
    display: flex;
    gap: 5px;
    width: 100%;
    min-height: 20px;
    color: white;

    &.input {
      flex-direction: row;
      justify-content: flex-start;
    }

    &.output {
      flex-direction: row-reverse;
      justify-content: flex-start;
    }
  }

  flow-socket {
      width: 15px;
      height: 15px;
      border: 2px solid var(--io-color);
      background: white;
      border-radius: 60px;
      opacity: 0.8;

      &:hover {
        opacity: 1;
        filter: blur(1px);
      }
    }
</style>
`;

    this._shadow.append(this._graphElm);
    this._connections = this.ownerDocument.createElement("div");
    this._connections.style.display = "none";
    this._shadow.append(this._connections);
    this._connectionsSVG = this.ownerDocument.createElementNS(
      "http://www.w3.org/2000/svg",
      "svg"
    );
    this._connectionsSVG.setAttribute(
      "viewBox",
      `0 0 ${MAX_GRAPH_SIZE} ${MAX_GRAPH_SIZE}`
    );
    this._connectionsSVG.innerHTML = /* html */ `
  <defs>
    <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse">
      <path d="M 32 0 L 0 0 0 32" fill="none" stroke="#ccc" stroke-width="1"/>
    </pattern>
  </defs>
  <rect width="100%" height="100%" fill="url(#grid)" />
    `;
    this._connectionsSVG.classList.add("graph-connections");
    this._connectionsSVG.style.pointerEvents = "none";
    this._graphElm.appendChild(this._connectionsSVG);

    this.centerCamera();

    //event listeners
    this.addEventListener("pointerdown", (event) => {
      event.stopPropagation();
      this.setActiveNode(null);
      this.setActiveConection(null);

      this.dispatchEvent(new GraphEvent("graph-clicked", this));

      const { clientX: startX, clientY: startY } = event;
      const zoomFactor = this.editorData.zoom;
      const cameraX = this.editorData.x;
      const cameraY = this.editorData.y;

      const moveListener = (event: MouseEvent) => {
        const { clientX, clientY } = event;
        const positionX = cameraX + (clientX - startX) / zoomFactor;
        const positionY = cameraY + (clientY - startY) / zoomFactor;
        this.updateCamera(positionX, positionY, this.editorData.zoom);
      };
      this.addEventListener("pointermove", moveListener);
      const onUp = () => {
        this.removeEventListener("pointermove", moveListener);
        this.ownerDocument.removeEventListener("pointerup", onUp);
      };

      this.ownerDocument.addEventListener("pointerup", onUp);
    });

    let zoomFactor = 0.05;
    this.addEventListener("wheel", (event) => {
      if (event.deltaY < 0 && this.editorData.zoom + zoomFactor <= 2) {
        this.updateCamera(
          this.editorData.x,
          this.editorData.y,
          this.editorData.zoom + zoomFactor
        );
      } else if (
        event.deltaY > 0 &&
        this.editorData.zoom - zoomFactor >= zoomFactor
      ) {
        this.updateCamera(
          this.editorData.x,
          this.editorData.y,
          this.editorData.zoom - zoomFactor
        );
      }
    });

    this.ownerDocument.addEventListener("keydown", ({ key }) => {
      if (key == "Delete") {
        if (this._activeConnection) {
          this.deleteConnection(this._activeConnection);
        }
        if (this._acitveNode) {
          this.deleteNode(this._acitveNode);
        }
        this._clearActive();
      }
    });
  }

  addEventListener<K extends keyof FlowGraphElementEventMap>(
    type: K,
    listener: (this: FlowGraphElement, ev: FlowGraphElementEventMap[K]) => any,
    options?: boolean | AddEventListenerOptions
  ): void;

  addEventListener<K extends keyof HTMLElementEventMap>(
    type: K,
    listener: (this: FlowGraphElement, ev: HTMLElementEventMap[K]) => any,
    options?: boolean | AddEventListenerOptions
  ): void;

  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions
  ): void {
    super.addEventListener(type, listener, options);
  }

  removeEventListener<K extends keyof FlowGraphElementEventMap>(
    type: K,
    listener: (this: FlowGraphElement, ev: FlowGraphElementEventMap[K]) => any,
    options?: boolean | EventListenerOptions
  ): void;

  removeEventListener<K extends keyof HTMLElementEventMap>(
    type: K,
    listener: (this: FlowGraphElement, ev: HTMLElementEventMap[K]) => any,
    options?: boolean | EventListenerOptions
  ): void;

  removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | EventListenerOptions
  ): void {
    super.removeEventListener(type, listener, options);
  }

  disconnectedCallback() {}
}
