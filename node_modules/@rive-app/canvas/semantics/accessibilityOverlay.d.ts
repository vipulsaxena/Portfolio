import type * as rc from "../rive_advanced.mjs";
import type { SemanticTreeModel } from "./semanticTreeModel";
import { SemanticActionType, RiveSemanticsOptions } from "./types";
export interface AccessibilityOverlayOptions {
    canvas: HTMLCanvasElement;
    /** Unique string per Rive instance (used for prefixed IDs). */
    instanceId: string;
    /** Optional options for controlling semantic tree behavior and rendering */
    semanticsOptions: RiveSemanticsOptions;
    /** Callback to fire a semantic action back into the state machine. */
    fireAction: (nodeId: number, actionType: SemanticActionType) => void;
    /** Callback when AT focuses a semantic node (routes to SemanticManager::requestFocus). */
    requestFocus: (nodeId: number) => void;
    /** Callback when AT focus leaves a semantic node. */
    clearFocus: () => void;
    /**
     * When false (default), the overlay only moves focus while focus is already
     * inside Rive (overlay or canvas); when true it may also pull focus from outside Rive.
     */
    allowFocusInterrupt?: boolean;
}
/**
 * Indication of what changed since the last overlay update.
 *
 * - `semanticChanged` — semantic tree content/structure changed; attributes,
 *   DOM order, and stale removal need reconciling.
 * - `nodeGeometryChanged` — node bounds changed in the tree model.
 * - `layoutChanged` — canvas size/position changed (or the transform container
 *   hasn't been created yet); the artboard→canvas transform must be recomputed.
 */
export interface OverlayChange {
    semanticChanged: boolean;
    nodeGeometryChanged: boolean;
    layoutChanged: boolean;
}
/**
 * Creates and manages an invisible DOM tree overlaying a Rive canvas. This is for
 * screen readers to discover and interact with the Rive content.
 *
 * Each semantic node in the {@link SemanticTreeModel} gets a corresponding
 * DOM element with appropriate ARIA role, states, and action handlers so
 * assistive technologies (i.e. screen readers) can discover
 * and interact with the Rive content.
 *
 * Each node receives a prefixed ID (`id=rive-{instanceId}-sem-{nodeId}`) to avoid host-page ID collisions.
 * The nodeID is Rive's semantic node ID from core runtime.
 * Each node is styled with `pointer-events: none`. Interactive nodes can receive
 * programmatic focus and keydown events without entering the browser Tab order.
 */
export declare class AccessibilityOverlay {
    private container;
    private canvas;
    private semanticsOptions;
    private elements;
    /** Visually-hidden description spans keyed by node ID, referenced by aria-describedby. */
    private descElements;
    private instanceId;
    private fireAction;
    private requestFocus;
    private clearFocus;
    private lastSemanticVersion;
    private lastGeometryVersion;
    /** Text elements whose fit-scale needs recomputing, batched per update (see flushTextGeometry). */
    private pendingTextGeometry;
    /** Last measured box-size|text key per text element, to skip redundant re-measures. */
    private textGeometryKeys;
    private lastCanvasPositioning;
    /**
     * Set when a ResizeObserver/window-resize signals the canvas geometry may have
     * changed, cleared once the transform is re-synced. Lets {@link needsUpdate}
     * report geometry changes without a per-frame `getBoundingClientRect()` reflow.
     * Starts true so the first update computes the transform.
     */
    private _geometryDirty;
    /** True while reconciling the DOM (reserved for future focus-sync guards). */
    private isUpdating;
    /** See {@link AccessibilityOverlayOptions.allowFocusInterrupt}. */
    private allowFocusInterrupt;
    /**
     * Single child div of the overlay container that carries the artboard→CSS
     * transform. All semantic node elements are children of this div and express
     * their positions in raw artboard-space coordinates. The CSS transform on
     * this container maps artboard units to CSS pixels in one GPU pass — no
     * per-node matrix multiplication required.
     */
    private transformContainer;
    private _artboardBounds;
    private repositionTimer;
    private canvasResizeObserver;
    private parentResizeObserver;
    /**
     * Detects canvas *position* drift. See {@link observePosition}.
     */
    private positionObserver;
    private readonly _onWindowResize;
    constructor(options: AccessibilityOverlayOptions);
    getSemanticOverlayContainer(): HTMLDivElement;
    private attachPositionObservers;
    /**
     * Arms an IntersectionObserver whose root box is bounded to the canvas, so it
     * fires when the canvas moves relative to the viewport — position drift that
     * no ResizeObserver reports. Lets us re-sync the overlay container on a move
     * instead of recalculating the canvas bounding box every frame.
     */
    private observePosition;
    private scheduleReposition;
    private syncContainerGeometry;
    private createContainer;
    /**
     * Returns what changed since the last update, or null if nothing changed.
     *
     * Callers use this to avoid recomputing the (relatively expensive)
     * artboard→canvas transform on frames where only node bounds changed in the
     * tree: the transform only needs recomputing when `layoutChanged` is true.
     */
    needsUpdate(tree: SemanticTreeModel): OverlayChange | null;
    /**
     * Update the overlay DOM to reflect the current state of the semantic tree.
     * Call once per frame after `applyDiff` when {@link needsUpdate} reports a
     * change, when layout/transform inputs are dirty, or when a fresh
     * `forwardMat` is supplied (even if the tree versions are unchanged).
     *
     * @param tree           The in-memory semantic tree model
     * @param forwardMat     Artboard→canvas-pixel transform from `computeAlignment`,
     *                       or null to reuse the existing CSS transform on the
     *                       transform container
     * @param dpr            Device pixel ratio used for the canvas backing store
     * @param artboardBounds The artboard's own bounding rectangle
     */
    update(tree: SemanticTreeModel, forwardMat: rc.Mat2D | null, dpr: number, artboardBounds: rc.AABB, change?: OverlayChange | null): void;
    private performUpdate;
    /** Remove the overlay from the DOM entirely. */
    destroy(): void;
    /**
     * Reconcile a parent DOM element's children with an ordered list of
     * semantic node IDs. Creates, updates, and reorders elements as needed.
     *
     * Node positions are expressed in artboard-space coordinates. The CSS
     * transform on the transform container maps artboard units to CSS pixels,
     * so no per-node matrix multiplication is required here.
     *
     * @param parentArtboardLeft  Absolute artboard minX of the parent node (0 for roots)
     * @param parentArtboardTop   Absolute artboard minY of the parent node (0 for roots)
     */
    private rebuildChildren;
    /**
     * Reposition only the subtrees whose bounds changed in the latest diff.
     * Descendants are included because node CSS positions are parent-relative.
     */
    private updateGeometryForChangedNodes;
    private updateNodeGeometrySubtree;
    /**
     * Whether the overlay may move focus now. Following focus already inside this
     * instance is always allowed; pulling it in from the host page is gated behind
     * allowFocusInterrupt (from the Rive class).
     */
    private canMoveFocus;
    /**
     * Move focus into a newly appeared modal/alert dialog so screen readers
     * announce and read its content (web ATs don't auto-enter a freshly mounted
     * dialog). Skips when focus can't move (see canMoveFocus) or a descendant
     * already holds it. The dialog's aria-modal keeps focus trapped inside.
     */
    private autoFocusDialogOnAppear;
    /**
     * Resolve the element assistive technologies (AT) should focus on appearance. Walks the subtree
     * depth-first and returns the first focusable node's host element, else the
     * inner <span> of the first labeled leaf. Container and unlabeled nodes are
     * descended into but never focused. Returns null if nothing qualifies.
     */
    private routeDefaultFocusTarget;
    /** Shared `id` prefix for all semantic node elements of this instance. */
    private get nodeIdPrefix();
    /** Recover the semantic node ID from an overlay element, or null. */
    private nodeIdFromElement;
    private createElement;
    /**
     * Wire arrow-key roving focus for a group member (tab, radio). Arrow keys
     * move focus to the next/previous member (wrapping), optionally Home/End jump
     * to first/last, and the newly focused member receives a tap action.
     */
    private attachRovingNav;
    private attachActionHandlers;
    private applyAttributes;
    /**
     * Positions an element in artboard-space coordinates relative to its parent.
     *
     * Node bounds stay in raw artboard units — the CSS `transform: matrix(...)`
     * on the transform container maps artboard units to CSS pixels in one GPU
     * pass. No per-node forwardMat multiplication or DPR division needed here.
     *
     * Round to whole artboard units before comparing to avoid triggering AX
     * layout notifications from sub-unit floating-point animation jitter.
     */
    private applyPosition;
    /**
     * Scale each queued text span to fit its layout box, batched so a frame
     * pays at most one synchronous layout: all measurement-reset writes first,
     * then all rect reads, then all transform writes. Interleaving
     * write→read→write per node would force a reflow per text node instead.
     *
     * Nodes whose box size and text are unchanged since the last pass are
     * skipped entirely (their existing transform is still correct — the scale
     * is a ratio of two rects, so ancestor transform changes cancel out).
     */
    private flushTextGeometry;
    /**
     * Creates (on first call) and updates the artboard-space transform container.
     *
     * The container is sized to the artboard dimensions and carries a CSS
     * `transform: matrix(...)` equivalent to `forwardMat / dpr`. All semantic
     * node elements are children of this container and use raw artboard
     * coordinates as their CSS `left/top/width/height`, so the CSS compositor
     * applies the artboard→screen mapping in one pass.
     */
    private syncTransformContainer;
}
