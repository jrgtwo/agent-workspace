import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { createStyleGuideModule } from './styleGuideModule'

describe('style guide module', () => {
  it('renders token swatches and a component sample', () => {
    const mod = createStyleGuideModule()
    expect(mod.id).toBe('style-guide')
    render(mod.render())
    expect(screen.getByText('Color tokens')).toBeInTheDocument()
    expect(screen.getByText('Components')).toBeInTheDocument()
  })
})
