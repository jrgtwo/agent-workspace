import type { ViewDef } from './viewsStore'

export const DEFAULT_VIEWS: ViewDef[] = [
  {
    id: 'editor', name: 'Editor', icon: '🗂', builtIn: true,
    layout: { type: 'split', direction: 'horizontal', children: [
      { type: 'panel', moduleId: 'connectors-tree', size: 20, draggable: true },
      { type: 'panel', moduleId: 'connectors-viewer', size: 50, draggable: true },
      { type: 'panel', moduleId: 'ai-chat', size: 30, draggable: true },
    ] },
  },
  {
    id: 'reader', name: 'Reader', icon: '📑', builtIn: true,
    layout: { type: 'split', direction: 'horizontal', children: [
      { type: 'panel', moduleId: 'connectors-tree', size: 28, draggable: true },
      { type: 'panel', moduleId: 'connectors-viewer', size: 72, draggable: true },
    ] },
  },
]
