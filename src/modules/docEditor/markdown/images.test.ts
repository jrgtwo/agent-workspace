import { describe, it, expect } from 'vitest'
import { imageMarkdown } from './images'

describe('imageMarkdown', () => {
  it('builds a markdown image reference for a stored blob id', () => {
    expect(imageMarkdown('img-123', 'photo.png')).toBe('![photo.png](blob:img-123)')
  })
  it('falls back to a generic alt when name is empty', () => {
    expect(imageMarkdown('img-9', '')).toBe('![image](blob:img-9)')
  })
})
