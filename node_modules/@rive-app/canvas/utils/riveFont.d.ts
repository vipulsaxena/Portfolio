import type { FontWrapper } from "./finalizationRegistry";
export type FallbackFontsCallback = (missingGlyph: number, weight: number) => FontWrapper | FontWrapper[] | null | undefined;
export declare class RiveFont {
    private static _fallbackFontCallback;
    private constructor();
    /**
     * Set a callback to dynamically set a list of fallback fonts based on the missing glyph and/or style of the default font.
     * Set null to clear the callback.
     * @param fontCallback Callback to set a list of fallback fonts.
     */
    static setFallbackFontCallback(fontCallback: FallbackFontsCallback | null): void;
    private static _fontToPtr;
    private static _getFallbackPtr;
    private static _wireFallbackProc;
}
