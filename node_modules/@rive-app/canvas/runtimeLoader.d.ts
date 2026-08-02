import * as rc from "./rive_advanced.mjs";
export type RuntimeCallback = (rive: rc.RiveCanvas) => void;
export declare class RuntimeLoader {
    private static runtime;
    private static isLoading;
    private static callBackQueue;
    private static rive;
    private static wasmURL;
    private static wasmFallbackURL;
    private static wasmBinary;
    private static errorCallbackQueue;
    private constructor();
    /**
     * When true, performance.mark / performance.measure entries are emitted for
     * WASM initialization.
     */
    static enablePerfMarks: boolean;
    private static notifyError;
    private static loadRuntime;
    static getInstance(callback: RuntimeCallback, onError?: (error: Error) => void): void;
    static awaitInstance(): Promise<rc.RiveCanvas>;
    static setWasmUrl(url: string): void;
    static getWasmUrl(): string;
    /**
     * Sets the URL used as a fallback when the primary WASM URL fails to load.
     * Pass `null` to disable the fallback entirely.
     *
     * Defaults to pulling from the jsdelivr CDN.
     */
    static setWasmFallbackUrl(url: string | null): void;
    static getWasmFallbackUrl(): string | null;
    static setWasmBinary(value: ArrayBuffer | null): void;
    static getWasmBinary(): ArrayBuffer | null;
}
