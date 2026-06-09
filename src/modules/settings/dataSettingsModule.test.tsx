import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { createDataSettingsModule } from './dataSettingsModule'

afterEach(() => { cleanup(); vi.unstubAllGlobals() })

describe('dataSettingsModule', () => {
  it('does NOT clear data when the user cancels the confirm', () => {
    const clearAll = vi.fn(async () => {})
    vi.stubGlobal('confirm', () => false)
    render(createDataSettingsModule(clearAll).render())
    fireEvent.click(screen.getByRole('button', { name: /clear all data/i }))
    expect(clearAll).not.toHaveBeenCalled()
  })

  it('clears all data when the user confirms', () => {
    const clearAll = vi.fn(async () => {})
    vi.stubGlobal('confirm', () => true)
    render(createDataSettingsModule(clearAll).render())
    fireEvent.click(screen.getByRole('button', { name: /clear all data/i }))
    expect(clearAll).toHaveBeenCalledTimes(1)
  })
})
