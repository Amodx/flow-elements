import { FlowGraph } from "@amodx/flow/Graph/FlowGraph";
import { NodeData } from "@amodx/flow/Node/FlowNode.types";
import { FlowNodeElement } from "./FlowNode.element";
import { FlowNodeIOElement } from "./FlowNodeIO.element";
import { FlowConnectionElement } from "./FlowConnection.element";
import { FlowNodeRegister } from "./FlowNodeRegister";

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

  get editorData() {
    return this.flowGraph.editorData;
  }

  private _shadow: ShadowRoot;
  _connectionsSVG: SVGSVGElement;
  private _connections: HTMLDivElement;
  private _graphElm: HTMLDivElement;
  private _nodesElm: HTMLDivElement;

  _acitveIO: FlowNodeIOElement | null = null;

  constructor() {
    super();
    this._shadow = this.attachShadow({ mode: "open" });
    this._graphElm = document.createElement("div");
    this._graphElm.className = "flow-graph";
    this._nodesElm = document.createElement("div");
    this._nodesElm.className = "flow-nodes";
    this._graphElm.append(this._nodesElm);
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
  }

  * {
    margin: 0;
    padding: 0;
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
    transform: translate(50%,50%);
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
  }

  .graph-connections .connection {
    pointer-events: auto;
   filter: drop-shadow(10px 10px 0px rgba(0, 0, 0, 0.5));
  }
  .graph-connections .connection:hover {
    cursor: pointer;
    filter: drop-shadow(0px 0px 5px white);
  }

 .graph-connections .connection.active {
    filter: drop-shadow(0px 0px 5px white);
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
    border-top-left-radius: 15px;
    border-top-right-radius: 15px;
    border-bottom-left-radius: 15px;
    border-bottom-right-radius: 15px;
  }



  flow-node.active {
    border: 4px solid white;
  }

  flow-node .node-header {
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

  flow-node .node-body {
    min-height: 50px;
    background: #2d2d2d;
    color: white;
    padding: 10px;
    position: relative;
    border-bottom-left-radius: 15px;
    border-bottom-right-radius: 15px;
  }

  flow-node.has-content .node-body {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  flow-node .node-body .inputs {
    display: flex;
    flex-direction: column;
  }
  flow-node .node-body .inputs   flow-node-io {
    margin-left: -10px;
  }
  flow-node.no-content .node-body .inputs {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
  }
  flow-node.has-content .node-body .inputs {

  }

  flow-node .node-body .outputs {
    display: flex;
    flex-direction: column;
  }
  flow-node .node-body .outputs   flow-node-io {
    margin-left: 10px;
  }
  flow-node.no-content .node-body .outputs {
    position: absolute;
    top: 0;
    right: 0;
    width: 100%;
    height: 100%;
  }
  flow-node.has-content .node-body .outputs {

  }

  flow-node-io  {
   display: flex;
   gap: 5px;
   width: 100%;
   min-height: 20px;
   color: white;
  }

  flow-node-io.input {
    flex-direction: row;
    justify-content: flex-start;
  }

  flow-node-io.output {
    flex-direction: row-reverse;
    justify-content: flex-start;
  }

  flow-node-io .socket {
    width: 15px;
    height: 15px;
    border: 2px solid var(--io-color);
    background: white;
    border-radius: 60px;
    opacity: .8;
  }

  flow-node-io .socket:hover {
    opacity: 1;
    filter: blur(1px);
  }
</style>
    `;
    this._shadow.append(this._graphElm);
    this._connections = document.createElement("div");
    this._connections.style.display = "none";
    this._shadow.append(this._connections);
    this._connectionsSVG = document.createElementNS(
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
        window.removeEventListener("pointerup", onUp);
      };

      window.addEventListener("pointerup", onUp);
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

    window.addEventListener("keydown", ({ key }) => {
      if (key == "Delete") {
        if (this._activeConnection) {
          const connection = this._activeConnection;
          connection.delete();
          this.dispatchEvent(new GraphEvent("connection-deleted", connection));
        }
        if (this._acitveNode) {
          const node = this._acitveNode;
          node.delete();
          this.dispatchEvent(new GraphEvent("node-deleted", node));
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

  private _clearActive() {
    if (this._acitveNode) this._acitveNode.setActive(false);
    this._acitveNode = null;
    if (this._activeConnection) this._activeConnection.setActive(false);
    this._activeConnection = null;
  }

  private _acitveNode: FlowNodeElement | null = null;
  setActiveNode(node: FlowNodeElement | null) {
    this._clearActive();
    this._acitveNode = node;
    if (!node) return;
    node.setActive(true);
    this.dispatchEvent(new GraphEvent("node-clicked", this));
  }

  private _activeConnection: FlowConnectionElement | null = null;
  setActiveConection(connection: FlowConnectionElement | null) {
    this._clearActive();
    this._activeConnection = connection;
    if (!connection) return;
    connection.setActive(true);
    this.dispatchEvent(new GraphEvent("connection-clicked", this));
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
    const nodeElm = document.createElement("flow-node");
    nodeElm.flowGraph = this;
    nodeElm.flowNode = node;
    this._nodesElm.append(nodeElm);
    nodeElm.setPosition(x, y);

    this.dispatchEvent(new GraphEvent("node-added", nodeElm));
  }

  addConnection(
    input: FlowNodeIOElement | null,
    output: FlowNodeIOElement | null,
    transistent: boolean
  ) {
    const connectionElm = document.createElement("flow-connection");
    connectionElm.inputFlowNode = input;
    connectionElm.outputFlowNode = output;
    connectionElm.transistent = transistent;
    this._connections.append(connectionElm);
    this.dispatchEvent(new GraphEvent("connection-added", connectionElm));
    return connectionElm;
  }
}
