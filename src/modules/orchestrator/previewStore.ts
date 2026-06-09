import { Emitter } from '../../core/emitter'

interface PreviewState { focusedFeature: string | null }

/** Which feature the orchestrator preview panel mirrors (the running/selected step's target). */
export class PreviewStore extends Emitter<PreviewState> {
  private state: PreviewState = { focusedFeature: null }
  getState = (): PreviewState => this.state
  focus(featureId: string | null): void {
    this.state = { focusedFeature: featureId }
    this.notify()
  }
}
