import { FlowNodeIOElement } from "./FlowNodeIO.element";
import { FlowConnectionElement } from "./FlowConnection.element";
import { FlowNodeElement } from "./FlowNode.element";
import { FlowSocketElement } from "FlowSocket.element";

export interface FlowNodeTypeData {
  type: string;
  enableFlowInput?: boolean;
  color?: string;
  renderBody?(container: HTMLDivElement, node: FlowNodeElement): void;
  created?(node: FlowNodeElement): void;
  deleted?(node: FlowNodeElement): void;
  connectionAdded?(
    node: FlowNodeElement,
    socket: FlowNodeIOElement,
    connection: FlowConnectionElement
  ): void;
  connectionRemoved?(
    node: FlowNodeElement,
    socket: FlowNodeIOElement,
    connection: FlowConnectionElement
  ): void;
  flowConnectionAdded?(
    node: FlowNodeElement,
    socket: FlowSocketElement,
    connection: FlowConnectionElement
  ): void;
  flowConnectionRemoved?(
    node: FlowNodeElement,
    socket: FlowSocketElement,
    connection: FlowConnectionElement
  ): void;
}

export interface FlowNodeIOTypeData {
  type: string;
  color: string;
}

export class FlowNodeRegister {
  nodeData = new Map<string, FlowNodeTypeData>();
  nodeIOData = new Map<string, FlowNodeIOTypeData>();

  registerNode(...nodes: FlowNodeTypeData[]) {
    for (const node of nodes) {
      this.nodeData.set(node.type, node);
    }
  }

  getNode(type: string): FlowNodeTypeData | null {
    if (!this.nodeData.has(type)) return null;
    return this.nodeData.get(type)!;
  }

  registerNodeIO(...nodes: FlowNodeIOTypeData[]) {
    for (const node of nodes) {
      this.nodeIOData.set(node.type, node);
    }
  }

  getNodeIO(type: string): FlowNodeIOTypeData | null {
    if (!this.nodeIOData.has(type)) return null;
    return this.nodeIOData.get(type)!;
  }
}
