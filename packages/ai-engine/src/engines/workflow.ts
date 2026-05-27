// ============================================================
// VibeModerator OS — Workflow Execution Engine
// ============================================================

import type { SimulationInput } from '@vibemod/shared';
import { ToxicityEngine } from './toxicity';

export interface WorkflowNode {
  id: string;
  type: string; // 'trigger' or 'action' or 'condition'
  data: { label: string; config: Record<string, unknown>; description: string };
  connections: string[];
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  animated?: boolean;
}

export interface WorkflowData {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

export interface WorkflowExecutionResult {
  actions: string[];
  executionTrace: string[];
}

export class WorkflowEngine {
  private toxicityEngine: ToxicityEngine;

  constructor() {
    this.toxicityEngine = new ToxicityEngine();
  }

  async execute(workflowData: WorkflowData, input: SimulationInput, eventType: 'post_submit' | 'comment_submit'): Promise<WorkflowExecutionResult> {
    const { nodes, edges } = workflowData;
    const actions: string[] = [];
    const executionTrace: string[] = [];

    // 1. Find trigger nodes
    const triggerNodes = nodes.filter(n => 
      n.data.label.toLowerCase().includes('trigger') || 
      n.data.label.toLowerCase().includes('post submitted') ||
      n.data.label.toLowerCase().includes('comment submitted')
    );

    if (triggerNodes.length === 0) {
      executionTrace.push('No trigger node found, skipping workflow.');
      return { actions, executionTrace };
    }

    // Determine if the trigger matches the event
    const validTrigger = triggerNodes.find(t => {
      const lbl = t.data.label.toLowerCase();
      if (eventType === 'post_submit' && (lbl.includes('post submitted') || lbl.includes('trigger'))) return true;
      if (eventType === 'comment_submit' && (lbl.includes('comment submitted') || lbl.includes('trigger'))) return true;
      return false;
    });

    if (!validTrigger) {
      executionTrace.push(`Workflow trigger doesn't match event type: ${eventType}`);
      return { actions, executionTrace };
    }

    executionTrace.push(`Triggered by node [${validTrigger.data.label}]`);

    // 2. Traverse the graph BFS
    const queue: string[] = [...validTrigger.connections];
    const visited = new Set<string>([validTrigger.id]);

    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      if (visited.has(nodeId)) continue;
      visited.add(nodeId);

      const node = nodes.find(n => n.id === nodeId);
      if (!node) continue;

      let shouldContinue = true;

      // Evaluate Node Logic
      const label = node.data.label.toLowerCase();
      
      executionTrace.push(`Evaluating node [${node.data.label}]`);

      // --------------------------------------------------------
      // CONDITIONS
      // --------------------------------------------------------
      if (label.includes('account age')) {
        // e.g. "Account age < 7 days"
        const maxAgeMatch = label.match(/<\s*(\d+)/);
        if (maxAgeMatch) {
          const maxAge = parseInt(maxAgeMatch[1], 10);
          if (input.authorAccountAge >= maxAge) {
            executionTrace.push(`Condition failed: Account age (${input.authorAccountAge}) >= ${maxAge}`);
            shouldContinue = false;
          } else {
            executionTrace.push(`Condition passed: Account age (${input.authorAccountAge}) < ${maxAge}`);
          }
        }
      } 
      else if (label.includes('ai toxicity check') || label.includes('ai check')) {
        const text = input.postTitle || input.postBody || input.commentBody || '';
        const toxicity = await this.toxicityEngine.analyzeContent(text, input.commentBody ? 'comment' : 'post');
        executionTrace.push(`AI Check completed. Toxicity score: ${Math.round(toxicity.score * 100)}%`);
        
        // Find outgoing edges from this AI check node to branch conditionally
        const outgoingEdges = edges.filter(e => e.source === node.id);
        
        // If there are labelled edges (e.g., 'safe' or 'toxic'), follow the matching one
        const toxicThreshold = 0.7;
        const isToxic = toxicity.score >= toxicThreshold;

        const nextEdges = outgoingEdges.filter(e => {
          const edgeLabel = (e.label || '').toLowerCase();
          if (edgeLabel.includes('toxic') && isToxic) return true;
          if ((edgeLabel.includes('safe') || edgeLabel.includes('pass')) && !isToxic) return true;
          // If edge has no label, follow it by default
          if (!edgeLabel) return true;
          return false;
        });

        // Enqueue only the valid paths based on AI result
        for (const edge of nextEdges) {
          if (!visited.has(edge.target)) queue.push(edge.target);
        }

        // We manually branched, so skip standard queueing at the bottom
        shouldContinue = false;
      }

      // --------------------------------------------------------
      // ACTIONS
      // --------------------------------------------------------
      else if (label.includes('filter')) {
        actions.push('filter');
        executionTrace.push(`Action applied: Filter`);
      }
      else if (label.includes('remove') || label.includes('delete')) {
        actions.push('remove');
        executionTrace.push(`Action applied: Remove`);
      }
      else if (label.includes('approve')) {
        actions.push('approve');
        executionTrace.push(`Action applied: Approve`);
      }
      else if (label.includes('ban')) {
        actions.push('ban');
        executionTrace.push(`Action applied: Ban`);
      }
      else if (label.includes('warn')) {
        actions.push('warn');
        executionTrace.push(`Action applied: Warn`);
      }

      // If condition passed, enqueue children
      if (shouldContinue) {
        for (const nextId of node.connections) {
          if (!visited.has(nextId)) queue.push(nextId);
        }
      }
    }

    return { actions, executionTrace };
  }
}
