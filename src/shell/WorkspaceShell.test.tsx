import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { WorkspaceShell } from './WorkspaceShell'
import { ThemeStore } from '../core/themeStore'
import { LayoutStore } from '../core/layoutStore'
import type { FeatureManifest } from '../core/types'

const feature: FeatureManifest = {
  id: 'notes', name: 'Notes', icon: '📝',
  modules: [{ id: 'm', title: 'M', locality: 'LOCAL', tools: [], render: () => <div>hi</div> }],
  layout: { type: 'panel', moduleId: 'm' },
}

afterEach(() => { cleanup(); document.documentElement.removeAttribute('data-theme') })

describe('WorkspaceShell theming', () => {
  it('applies the active theme to <html> on mount', () => {
    const theme = new ThemeStore(); theme.hydrate({ theme: 'midnight' })
    const layoutStores = new Map([['notes', new LayoutStore(feature.layout)]])
    render(<WorkspaceShell features={[feature]} theme={theme} layoutStores={layoutStores} />)
    expect(document.documentElement.getAttribute('data-theme')).toBe('midnight')
  })
})
