import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PanelArea } from './PanelArea'
import { LayoutStore } from '../core/layoutStore'
import type { FeatureManifest, LayoutNode } from '../core/types'

const layout: LayoutNode = { type: 'split', direction: 'horizontal', children: [
  { type: 'panel', moduleId: 'one' },
  { type: 'panel', moduleId: 'two', draggable: true },
] }
const manifest: FeatureManifest = {
  id: 'f', name: 'F', icon: '★', layout,
  modules: [
    { id: 'one', title: 'One', locality: 'LOCAL', render: () => <div>one-body</div>, tools: [] },
    { id: 'two', title: 'Two', locality: 'LOCAL', render: () => <div>two-body</div>, tools: [] },
  ],
}

describe('PanelArea', () => {
  it('renders panels from the LayoutStore', () => {
    render(<PanelArea manifest={manifest} layoutStore={new LayoutStore(layout)} />)
    expect(screen.getByText('one-body')).toBeInTheDocument()
    expect(screen.getByText('two-body')).toBeInTheDocument()
  })
  it('shows a drag handle only on draggable panels', () => {
    render(<PanelArea manifest={manifest} layoutStore={new LayoutStore(layout)} />)
    expect(screen.getAllByRole('button', { name: /drag/i })).toHaveLength(1)
  })
})
