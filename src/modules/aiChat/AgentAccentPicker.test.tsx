import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { AgentAccentPicker } from './AgentAccentPicker'

describe('AgentAccentPicker', () => {
  it('shows the agent label and no popover until clicked', () => {
    render(<AgentAccentPicker color={null} onChange={vi.fn()} />)
    expect(screen.getByRole('button', { name: /agent/i })).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('opens a popover on label click', () => {
    render(<AgentAccentPicker color={null} onChange={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /agent/i }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('calls onChange with a preset swatch color', () => {
    const onChange = vi.fn()
    render(<AgentAccentPicker color={null} onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: /agent/i }))
    fireEvent.click(screen.getByRole('button', { name: /set #d98f4e/i }))
    expect(onChange).toHaveBeenCalledWith('#d98f4e')
  })

  it('calls onChange with the color-wheel value', () => {
    const onChange = vi.fn()
    render(<AgentAccentPicker color={null} onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: /agent/i }))
    fireEvent.change(screen.getByLabelText(/agent color/i), { target: { value: '#123456' } })
    expect(onChange).toHaveBeenCalledWith('#123456')
  })

  it('calls onChange(null) on reset', () => {
    const onChange = vi.fn()
    render(<AgentAccentPicker color={'#ffffff'} onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: /agent/i }))
    fireEvent.click(screen.getByRole('button', { name: /reset/i }))
    expect(onChange).toHaveBeenCalledWith(null)
  })

  it('closes on outside click', () => {
    render(<AgentAccentPicker color={null} onChange={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /agent/i }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    fireEvent.mouseDown(document.body)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
