/**
 * Class StateChangeEvent
 */
export default class StateChangeEvent extends Event {
    constructor(originalState, currentState) {
        super('statechange');
        this.originalState = originalState;
        this.currentState = currentState;
    }
}