import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { createServices } from '../app/services'
import { MemoryBackend } from '../core/storage/memoryBackend'
import { WorkspaceShell } from '../shell/WorkspaceShell'

// Milkdown can't run in jsdom — stub the composer so the chat panel renders.
vi.mock('../modules/aiChat/composer/ChatComposer', () => ({
  ChatComposer: () => <div data-testid="chat-composer">composer</div>,
}))

describe('Kanban feature rendering', () => {
  beforeEach(() => localStorage.clear())

  it('renders both the board and the AI chat panel when the Kanban feature is active', async () => {
    const services = await createServices({
      client: { chat: vi.fn() },
      backend: new MemoryBackend(),
    })
    const { container } = render(
      <WorkspaceShell
        features={services.features}
        theme={services.theme}
        layoutStores={services.layoutStores}
      />,
    )

    fireEvent.click(screen.getByTitle('Kanban'))

    expect(container.querySelector('[data-module="kanban-board"]')).not.toBeNull()
    expect(container.querySelector('[data-module="ai-chat"]')).not.toBeNull()
  })
})
