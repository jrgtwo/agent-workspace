import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PanelArea } from './PanelArea'
import type { FeatureManifest, WorkspaceModule } from '../core/types'

function stubModule(id: string, label: string): WorkspaceModule {
  // Title and body are intentionally distinct: PanelFrame renders the title in its
  // header AND the module's render() output, so identical strings would collide.
  return { id, title: `${label} title`, locality: 'LOCAL', tools: [], render: () => <div>{label} body</div> }
}

const manifest: FeatureManifest = {
  id: 'notes', name: 'Notes', icon: '📝',
  modules: [stubModule('a', 'Panel A'), stubModule('b', 'Panel B')],
  layout: { type: 'split', direction: 'horizontal', children: [
    { type: 'panel', moduleId: 'a' }, { type: 'panel', moduleId: 'b' },
  ] },
}

describe('PanelArea', () => {
  it('renders each module referenced by the layout', () => {
    render(<PanelArea manifest={manifest} />)
    expect(screen.getByText('Panel A body')).toBeInTheDocument()
    expect(screen.getByText('Panel B body')).toBeInTheDocument()
  })
})
