import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ReviewPanel } from './docEditorReview'
import type { PendingChange } from '../../core/proposalStore'

const change = (find: string, replace: string, reason: string, id = 'c1'): PendingChange => ({
  id, moduleId: 'doc-editor', summary: '', payload: { find, replace, reason },
})
const handlers = { onAccept: () => {}, onReject: () => {}, onAcceptAll: () => {}, onRejectAll: () => {} }

describe('ReviewPanel', () => {
  it('renders unchanged blocks as real markdown', () => {
    const { container } = render(
      <ReviewPanel text={'## Heading\n\nFirst para.'} changes={[change('First', 'Initial', 'clarity')]} {...handlers} />,
    )
    expect(container.querySelector('h2')?.textContent).toBe('Heading')
  })

  it('inline treatment: small change shown in the sentence with red/green + why', () => {
    const { container } = render(
      <ReviewPanel text={'We ship by Q2.'} changes={[change('Q2', 'Q3', 'kickoff slipped')]} {...handlers} />,
    )
    expect(container.querySelector('.i-change')).toBeTruthy()
    expect(container.querySelector('.diff-del')?.textContent).toContain('Q2')
    expect(container.querySelector('.diff-add')?.textContent).toContain('Q3')
    // surrounding prose is preserved (not duplicated)
    expect(container.querySelector('.review-para')?.textContent).toContain('We ship by')
    expect(container.querySelector('.diff-why')).toBeTruthy()
  })

  it('breakout treatment: a full-sentence rewrite shows was/now rows', () => {
    const before = 'The herd had moved east overnight, closer to the river than we expected, beyond the ridge.'
    const after = 'The herd had drifted north toward the saddle, far past what the collar data predicted, near the pass.'
    const { container } = render(
      <ReviewPanel text={before} changes={[change(before, after, 'fix the direction')]} {...handlers} />,
    )
    expect(container.querySelector('.edit')).toBeTruthy()
    expect(container.querySelector('.i-change')).toBeNull() // not inline
    expect(container.querySelector('.edit .old')?.textContent).toContain('east overnight')
    expect(container.querySelector('.edit .new')?.textContent).toContain('drifted north')
    // labels was/now
    expect(container.textContent).toContain('was')
    expect(container.textContent).toContain('now')
  })

  it('breakout treatment: a large addition shows an "added" row only', () => {
    const before = 'The team shipped.'
    const after = 'The team shipped. We also fixed three long-standing bugs and cut the build time in half today.'
    const { container } = render(
      <ReviewPanel text={before} changes={[change(before, after, 'note the extras')]} {...handlers} />,
    )
    expect(container.textContent).toContain('added')
    expect(container.querySelector('.edit .new')?.textContent).toContain('fixed three long-standing bugs')
    expect(container.querySelector('.edit .old')).toBeNull()
  })

  it('breakout treatment: a deletion shows a "removed" row only', () => {
    const before = 'We still cut releases by hand every Friday afternoon without fail.'
    const { container } = render(
      <ReviewPanel text={before} changes={[change(before, '', 'no longer true')]} {...handlers} />,
    )
    expect(container.textContent).toContain('removed')
    expect(container.querySelector('.edit .old')?.textContent).toContain('cut releases by hand')
    expect(container.querySelector('.edit .new')).toBeNull()
  })

  it('renders a structural (list) change with its markdown structure, not flattened', () => {
    const list = '- hello\n- mello\n- jello'
    const after = '- hello (edited)\n- mello (edited)\n- jello (edited)'
    const { container } = render(
      <ReviewPanel text={list} changes={[change(list, after, 'tag each item')]} {...handlers} />,
    )
    expect(container.querySelector('.edit .new--block ul')).toBeTruthy()
    expect(container.querySelectorAll('.edit .new--block li')).toHaveLength(3)
    expect(container.querySelector('.edit .old--block ul')).toBeTruthy()
  })

  it('code treatment: a fenced code block change shows a monospace code diff', () => {
    const before = '```\nPORT=5173\n```'
    const { container } = render(
      <ReviewPanel text={before} changes={[change('PORT=5173', 'PORT=5180', 'port clash')]} {...handlers} />,
    )
    expect(container.querySelector('.code-edit')).toBeTruthy()
    expect(container.querySelector('.code-edit .diff-add')?.textContent).toContain('PORT=5180')
  })

  it('an inline-code edit renders the diff in monospace (shown as code) with controls', () => {
    const { container } = render(
      <ReviewPanel text={'Run `npm i` first.'} changes={[change('`npm i`', '`npm install`', 'be explicit')]} {...handlers} />,
    )
    const inline = container.querySelector('.i-change--code')
    expect(inline).toBeTruthy()
    expect(inline?.textContent).toContain('npm') // shared context kept
    expect(inline?.querySelector('.diff-del')?.textContent).toContain('i')
    expect(inline?.querySelector('.diff-add')?.textContent).toContain('install')
    expect(container.querySelector('.diff-ctrl')).toBeTruthy()
  })

  it('multiple edits in one paragraph each render and are independently approvable', () => {
    const onAccept = vi.fn()
    const para = 'We ship by Q2 and the launch is on track for the team.'
    const { container } = render(
      <ReviewPanel
        text={para}
        changes={[change('Q2', 'Q3', 'date slip', 'a'), change('on track', 'at risk', 'status change', 'b')]}
        {...handlers}
        onAccept={onAccept}
      />,
    )
    expect(container.querySelectorAll('.review-para')).toHaveLength(1) // one paragraph
    expect(screen.queryByText(/no longer matches/)).toBeNull()
    const accepts = screen.getAllByLabelText('Accept this change')
    expect(accepts).toHaveLength(2)
    fireEvent.click(accepts[0])
    expect(onAccept).toHaveBeenCalledTimes(1)
  })

  it('accept and reject controls fire for a change', () => {
    const onAccept = vi.fn(); const onReject = vi.fn()
    render(<ReviewPanel text={'We ship by Q2.'} changes={[change('Q2', 'Q3', 'r')]} {...handlers} onAccept={onAccept} onReject={onReject} />)
    fireEvent.click(screen.getByLabelText('Accept this change'))
    fireEvent.click(screen.getByLabelText('Reject this change'))
    expect(onAccept).toHaveBeenCalledOnce()
    expect(onReject).toHaveBeenCalledOnce()
  })

  it('accept-all and reject-all fire from the header', () => {
    const onAcceptAll = vi.fn(); const onRejectAll = vi.fn()
    render(<ReviewPanel text={'We ship by Q2.'} changes={[change('Q2', 'Q3', 'r')]} {...handlers} onAcceptAll={onAcceptAll} onRejectAll={onRejectAll} />)
    fireEvent.click(screen.getByText('Accept all'))
    fireEvent.click(screen.getByText('Reject all'))
    expect(onAcceptAll).toHaveBeenCalledOnce()
    expect(onRejectAll).toHaveBeenCalledOnce()
  })

  it('shows singular vs plural change count', () => {
    const one = render(<ReviewPanel text={'We ship by Q2.'} changes={[change('Q2', 'Q3', 'r')]} {...handlers} />)
    expect(one.getByText('1 proposed change')).toBeTruthy()
    one.unmount()
    const two = render(<ReviewPanel text={'alpha\n\nbeta'} changes={[change('alpha', 'ALPHA', 'r', 'a'), change('beta', 'BETA', 'r', 'b')]} {...handlers} />)
    expect(two.getByText('2 proposed changes')).toBeTruthy()
  })

  it('lists a change whose find is gone as no-longer-matching', () => {
    render(<ReviewPanel text={'Nothing matches here.'} changes={[change('absent', 'x', 'why')]} {...handlers} />)
    expect(screen.getByText(/no longer matches/)).toBeTruthy()
  })
})
