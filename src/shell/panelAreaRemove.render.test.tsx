import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PanelArea } from './PanelArea'
import { LayoutStore } from '../core/layoutStore'
import type { FeatureManifest, LayoutNode } from '../core/types'

const layout: LayoutNode = { type: 'split', direction: 'horizontal', children: [
  { type: 'panel', moduleId: 'a', draggable: true }, { type: 'panel', moduleId: 'b', draggable: true },
] }
const manifest: FeatureManifest = {
  id: 'v', name: 'V', icon: '★', layout,
  modules: [
    { id: 'a', title: 'A', locality: 'LOCAL', tools: [], render: () => <div>A</div> },
    { id: 'b', title: 'B', locality: 'LOCAL', tools: [], render: () => <div>B</div> },
  ],
}

describe('PanelArea remove', () => {
  it('calls onRemovePanel when a panel close is clicked', () => {
    const onRemove = vi.fn()
    const ls = new LayoutStore(layout)
    render(<PanelArea manifest={manifest} layoutStore={ls} onRemovePanel={onRemove} />)
    fireEvent.click(screen.getByRole('button', { name: /remove A/i }))
    expect(onRemove).toHaveBeenCalledWith('a')
  })
})
