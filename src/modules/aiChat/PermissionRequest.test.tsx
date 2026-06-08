import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PermissionRequest, isHighSeverity } from './PermissionRequest'
import type { PermissionRequest as Req } from '../../core/types'

function makeReq(kind: 'read' | 'write', locality: 'LOCAL' | 'NETWORK'): Req {
  return {
    id: 'r1',
    scope: { kind, resource: 'document:Untitled.md', locality, describe: () => 'desc' },
    detail: 'Read Untitled.md?',
    surfaceId: 'ai-chat',
    resolve: () => {},
  }
}

describe('isHighSeverity', () => {
  it('treats write or network as high severity (popup)', () => {
    expect(isHighSeverity(makeReq('write', 'LOCAL').scope)).toBe(true)
    expect(isHighSeverity(makeReq('read', 'NETWORK').scope)).toBe(true)
  })
  it('treats local reads as low severity (inline)', () => {
    expect(isHighSeverity(makeReq('read', 'LOCAL').scope)).toBe(false)
  })
})

describe('PermissionRequest', () => {
  it('renders a popup for write/network and wires Allow', () => {
    const onAllow = vi.fn()
    render(<PermissionRequest req={makeReq('write', 'LOCAL')} onAllow={onAllow} onDeny={vi.fn()} />)
    expect(screen.getByTestId('perm-popup')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /allow/i }))
    expect(onAllow).toHaveBeenCalledWith('r1')
  })
  it('renders an inline card for local read', () => {
    render(<PermissionRequest req={makeReq('read', 'LOCAL')} onAllow={vi.fn()} onDeny={vi.fn()} />)
    expect(screen.getByTestId('perm-inline')).toBeInTheDocument()
  })
})
