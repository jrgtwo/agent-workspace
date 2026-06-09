import { Emitter } from '../../core/emitter'
import type { ScopedStore } from '../../core/storage/types'
import type { SessionMeta } from './types'

interface SessionState { sessions: SessionMeta[]; activeId: string }

export class OrchestratorSessionStore extends Emitter<SessionState> {
  private state: SessionState = { sessions: [], activeId: '' }
  private scope: ScopedStore
  private genId: () => string
  private now: () => number

  constructor(scope: ScopedStore, genId: () => string, now: () => number = () => Date.now()) {
    super()
    this.scope = scope
    this.genId = genId
    this.now = now
  }

  getState = (): SessionState => this.state

  async init(): Promise<void> {
    const sessions = (await this.scope.get<SessionMeta[]>('index')) ?? []
    if (sessions.length === 0) {
      const id = this.genId()
      const seeded: SessionMeta = { id, title: 'New conversation', createdAt: this.now() }
      this.state = { sessions: [seeded], activeId: id }
      await this.persist()
      this.notify()
      return
    }
    const savedActive = await this.scope.get<string>('active')
    const activeId = sessions.some((s) => s.id === savedActive) ? (savedActive as string) : sessions[0].id
    this.state = { sessions, activeId }
    await this.scope.set('active', activeId)
    this.notify()
  }

  async create(title = 'New conversation'): Promise<string> {
    const id = this.genId()
    const session: SessionMeta = { id, title, createdAt: this.now() }
    this.state = { sessions: [...this.state.sessions, session], activeId: id }
    await this.persist()
    this.notify()
    return id
  }

  async setActive(id: string): Promise<void> {
    if (id === this.state.activeId) return
    this.state = { ...this.state, activeId: id }
    await this.scope.set('active', id)
    this.notify()
  }

  async rename(id: string, title: string): Promise<void> {
    this.state = {
      ...this.state,
      sessions: this.state.sessions.map((s) => (s.id === id ? { ...s, title } : s)),
    }
    await this.persist()
    this.notify()
  }

  async delete(id: string): Promise<void> {
    const remaining = this.state.sessions.filter((s) => s.id !== id)
    const wasActive = id === this.state.activeId
    if (remaining.length === 0) {
      const newId = this.genId()
      this.state = { sessions: [{ id: newId, title: 'New conversation', createdAt: this.now() }], activeId: newId }
    } else {
      this.state = { sessions: remaining, activeId: wasActive ? remaining[0].id : this.state.activeId }
    }
    await this.persist()
    this.notify()
  }

  private async persist(): Promise<void> {
    await this.scope.set('index', this.state.sessions)
    await this.scope.set('active', this.state.activeId)
  }
}
