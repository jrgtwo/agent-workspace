import { describe, it, expect, vi } from 'vitest'
import { DockStore } from './dockStore'
import { StorageService } from './storage/storage'
import { MemoryBackend } from './storage/memoryBackend'
import { persistState } from './storage/persistState'

describe('DockStore', () => {
  it('defaults to expanded, 360px, no drawer', () => {
    expect(new DockStore().getState()).toEqual({ collapsed: false, width: 360, openDrawer: null })
  })

  it('toggles collapsed', () => {
    const d = new DockStore()
    d.toggleCollapsed()
    expect(d.getState().collapsed).toBe(true)
    d.toggleCollapsed()
    expect(d.getState().collapsed).toBe(false)
  })

  it('clamps width to [240, 720]', () => {
    const d = new DockStore()
    d.setWidth(100); expect(d.getState().width).toBe(240)
    d.setWidth(9999); expect(d.getState().width).toBe(720)
    d.setWidth(420); expect(d.getState().width).toBe(420)
  })

  it('openDrawer is exclusive and toggles off when reselected', () => {
    const d = new DockStore()
    d.openDrawer('plan'); expect(d.getState().openDrawer).toBe('plan')
    d.openDrawer('preview'); expect(d.getState().openDrawer).toBe('preview')
    d.openDrawer('preview'); expect(d.getState().openDrawer).toBe(null)
    d.openDrawer('plan'); d.closeDrawer(); expect(d.getState().openDrawer).toBe(null)
  })

  it('persists and restores via persistState', async () => {
    const backend = new MemoryBackend()
    const svc = new StorageService(backend)
    const d1 = new DockStore()
    await persistState(d1, svc.scope('dock'), 'state', 0)
    d1.setWidth(500); d1.toggleCollapsed()
    await vi.waitFor(async () => {
      expect(await backend.get('dock', 'state')).toEqual({ collapsed: true, width: 500, openDrawer: null })
    })
    const d2 = new DockStore()
    await persistState(d2, svc.scope('dock'), 'state', 0)
    expect(d2.getState()).toEqual({ collapsed: true, width: 500, openDrawer: null })
  })
})
