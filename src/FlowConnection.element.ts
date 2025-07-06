import { FlowSocketElement } from "./FlowSocket.element";
import { FlowGraphElement } from "./FlowGraph.element";

export class FlowConnectionElement extends HTMLElement {
  flowGraph: FlowGraphElement;
  inputSocket: FlowSocketElement | null = null;
  outputSocket: FlowSocketElement | null = null;
  transistent = true;
  flow = false;
  color = "white";

  path: SVGPathElement;

  delete() {
    if (this.inputSocket) this.inputSocket.removeConnection(this);
    if (this.outputSocket) this.outputSocket.removeConnection(this);
    this.remove();
  }

  connectedCallback() {
    if (!this.inputSocket && !this.outputSocket) {
      throw new Error("<flow-edge> was connected without a node io property.");
    }
    this.path = this.ownerDocument.createElementNS(
      "http://www.w3.org/2000/svg",
      "path"
    );
    this.path.classList.add("connection");
    this.path.setAttribute("class", this.path.classList.value);
    this.path.setAttribute("stroke", this.color);
    this.path.setAttribute("fill", "none");
    this.path.setAttribute("stroke-width", "4");
    this.flowGraph._connectionsSVG.append(this.path);
    this.updatePlacements();
    if (!this.transistent) {
      this.path.addEventListener("pointerdown", (event) => {
        event.stopPropagation();
        this.flowGraph.setActiveConection(this);
      });
    } else {
      this.path.setAttribute("stroke-dasharray", "12,8");
    }
  }

  setActive(active: boolean) {
    if (active) {
      this.path.setAttribute("stroke-dasharray", "12,8");
      this.path.classList.add("active");
      this.path.setAttribute("stroke", "white");
    } else {
      this.path.removeAttribute("stroke-dasharray");
      this.path.classList.remove("active");
      this.path.setAttribute("stroke", this.color);
    }
    this.path.setAttribute("class", this.path.classList.value);
  }

  updatePlacements() {
    if (this.inputSocket) {
      const center = this.flowGraph._getElementCenterInSVG(this.inputSocket);
      this.updateEnd(center.x, center.y);
    }
    if (this.outputSocket) {
      const center = this.flowGraph._getElementCenterInSVG(this.outputSocket);
      this.updateStart(center.x, center.y);
    }
  }

  disconnectedCallback() {
    this.path.remove();
  }

  private _start = { x: 0, y: 0 };
  private _end = { x: 0, y: 0 };

  private _updatePath() {
    let d: string;

    if (this.transistent) {
      // Straight line
      d = `M ${this._start.x},${this._start.y} L ${this._end.x},${this._end.y}`;
    } else {
      // Curved cubic bezier
      const dx = Math.abs(this._end.x - this._start.x);
      const curveStrength = Math.max(100, dx * 0.5);
      d = `M ${this._start.x},${this._start.y} C ${
        this._start.x + curveStrength
      },${this._start.y} ${this._end.x - curveStrength},${this._end.y} ${
        this._end.x
      },${this._end.y}`;
    }

    this.path.setAttribute("d", d);
  }

  updateStart(x: number, y: number) {
    this._start.x = x;
    this._start.y = y;
    this._updatePath();
  }

  updateEnd(x: number, y: number) {
    this._end.x = x;
    this._end.y = y;
    this._updatePath();
  }
}
