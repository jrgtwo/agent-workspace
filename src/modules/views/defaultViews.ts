import type { ViewDef } from './viewsStore'

export const DEFAULT_VIEWS: ViewDef[] = [
  {
    id: 'editor', name: 'Editor', icon: '🗂', builtIn: true,
    layout: { type: 'split', direction: 'horizontal', children: [
      { type: 'panel', moduleId: 'connectors-tree', size: 30, draggable: true },
      { type: 'panel', moduleId: 'connectors-viewer', size: 70, draggable: true },
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
