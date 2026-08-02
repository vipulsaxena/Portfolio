import type { SemanticsDiff, SemanticNodeData } from "./types";
/**
 * Maintains an in-memory semantic tree built from incremental
 * {@link SemanticsDiff} updates received each frame from the WASM runtime.
 *
 * Processing order within {@link applyDiff} follows the contract defined in
 * `semantic_snapshot.hpp`: removed → added → moved → childrenUpdated →
 * updatedSemantic → updatedGeometry.
 */
export declare class SemanticTreeModel {
    private _nodesById;
    private _roots;
    private _semanticVersion;
    private _geometryVersion;
    private _geometryChangedIds;
    private _semanticChangedIds;
    get nodeCount(): number;
    /** Bumped when semantic content or tree structure changes. */
    get semanticVersion(): number;
    /** Bumped when node bounds change without a semantic/structural change. */
    get geometryVersion(): number;
    /** Node IDs whose bounds changed in the most recent {@link applyDiff}. */
    get geometryChangedIds(): ReadonlySet<number>;
    /**
     * Node IDs whose semantic fields (role/label/value/hint/flags/headingLevel)
     * changed in the most recent {@link applyDiff}. Structural changes (moves,
     * child reorders, removals) bump {@link semanticVersion} but don't mark
     * nodes here — element attributes don't depend on tree position.
     */
    get semanticChangedIds(): ReadonlySet<number>;
    /** Root node IDs in sibling order. */
    get roots(): readonly number[];
    /** Look up a node by its ID, or undefined if not in the tree. */
    nodeById(id: number): SemanticNodeData | undefined;
    /** Current index of a node among its siblings (or roots), or -1 if absent. */
    private siblingIndexOf;
    /** Detach a node from its current parent (or from roots). */
    private detach;
    /** Attach a node under a parent at a given sibling index (or as root). */
    private attach;
    /** Recursively remove a node and all descendants. */
    private removeSubtree;
    /**
     * Apply an incremental diff to the tree. Bumps version counters and notifies
     * listeners only when the tree actually changed.
     *
     * No-op diffs (field values identical to current model) do not bump
     * versions — the native side guards against emitting these, but applyDiff
     * defends its subscribers regardless.
     */
    applyDiff(diff: SemanticsDiff): void;
    private _debug;
    /** Enable/disable debug logging of diffs to the console. */
    set debug(enabled: boolean);
    private logDiff;
    /**
     * Returns every node in depth-first order, paired with its depth level.
     * Useful for debug logging / rendering a flat list.
     */
    flattened(): Array<{
        depth: number;
        node: SemanticNodeData;
    }>;
}
