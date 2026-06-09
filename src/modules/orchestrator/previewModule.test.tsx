import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PreviewStore } from './previewStore'
import { createPreviewModule } from './previewModule'

describe('preview module', () => {
  it('shows a placeholder when nothing is focused', () => {
    const preview = new PreviewStore()
    const mod = createPreviewModule(preview, { kanban: () => <div>BOARD</div> })
    render(mod.render())
    expect(screen.getByText(/nothing to preview/i)).toBeTruthy()
  })

  it('renders the focused feature renderer', () => {
    const preview = new PreviewStore()
    const mod = createPreviewModule(preview, { kanban: () => <div>BOARD</div> })
    preview.focus('kanban')
    render(mod.render())
    expect(screen.getByText('BOARD')).toBeTruthy()
  })
})
