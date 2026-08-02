import * as rc from "../rive_advanced.mjs";
export interface TouchInteractionsParams {
    canvas: HTMLCanvasElement | OffscreenCanvas;
    artboard: rc.Artboard;
    stateMachines: rc.StateMachineInstance[];
    renderer: rc.Renderer;
    rive: rc.RiveCanvas;
    fit: rc.Fit;
    alignment: rc.Alignment;
    isTouchScrollEnabled?: boolean;
    dispatchPointerExit?: boolean;
    enableMultiTouch?: boolean;
    layoutScaleFactor?: number;
    advanceAndDrain: (elapsedTime: number) => void;
}
/**
 * Registers mouse move/up/down callback handlers on the canvas to send meaningful coordinates to
 * the state machine pointer move/up/down functions based on cursor interaction
 */
export declare const registerTouchInteractions: ({ canvas, artboard, stateMachines, renderer, rive, fit, alignment, isTouchScrollEnabled, dispatchPointerExit, enableMultiTouch, layoutScaleFactor, advanceAndDrain, }: TouchInteractionsParams) => () => void;
