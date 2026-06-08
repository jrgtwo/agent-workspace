import type { JSX } from 'react'

// ---- Permissions ----
export type PermissionKind = 'read' | 'write'
export type DataLocality = 'LOCAL' | 'NETWORK'

export interface PermissionScope {
  kind: PermissionKind
  resource: string          // e.g. "document:Untitled.md"
  locality: DataLocality
  describe: (args: unknown) => string  // human sentence, e.g. "Read Untitled.md?"
}

export interface PermissionRequest {
  id: string
  scope: PermissionScope
  detail: string            // resolved describe(args)
  surfaceId?: string        // id of the chat surface that originated this request (display routing)
  resolve: (allowed: boolean) => void
}

// ---- Agent tools ----
export interface ToolDef {
  name: string
  description: string
  parameters: Record<string, unknown>   // JSON Schema
  permission?: PermissionScope           // if set, gated before execution
  // `any` (not `unknown`) is intentional: module handlers declare concrete arg
  // shapes (e.g. (a: { find: string; replace: string })), which are only
  // assignable here under `any` due to contravariant parameter checking.
  handler: (args: any) => Promise<unknown> | unknown
}

// ---- Chat ----
export type ChatRole = 'user' | 'assistant' | 'tool' | 'system'
export interface ToolCall { id: string; name: string; arguments: string }
export interface ChatMessage {
  role: ChatRole
  content: string
  toolCalls?: ToolCall[]
  toolCallId?: string       // for role 'tool'
}

// ---- Memory ----
export interface MemoryEntry {
  id: string
  text: string
  createdAt: number
}

// ---- Modules & Features ----
export interface ModuleLayoutHints {
  defaultSize?: number      // percent
  collapsible?: boolean
  minSize?: number
}
export interface WorkspaceModule {
  id: string
  title: string
  locality: DataLocality
  tools: ToolDef[]
  render: () => JSX.Element
  layoutHints?: ModuleLayoutHints
}

export type LayoutNode =
  | { type: 'panel'; moduleId: string; size?: number; collapsible?: boolean; draggable?: boolean }
  | { type: 'split'; direction: 'horizontal' | 'vertical'; children: LayoutNode[]; size?: number }

export interface FeatureManifest {
  id: string
  name: string
  icon: string
  modules: WorkspaceModule[]
  layout: LayoutNode
}
