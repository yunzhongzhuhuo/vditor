import DiffMatchPatch, {diff_match_patch, patch_obj} from "diff-match-patch";
import {formatRender} from "../editor/formatRender";

class Undo {
    private undoStack: patch_obj[][];
    private redoStack: patch_obj[][];
    private stackSize = 50;
    private dmp: diff_match_patch;
    private lastText: string;
    private hasUndo: boolean;
    private timeout: number

    constructor() {
        this.redoStack = [];
        this.undoStack = [];
        // @ts-ignore
        this.dmp = new DiffMatchPatch();
        this.lastText = "";
        this.hasUndo = false
    }

    public undo(vditor: IVditor) {
        const patchList = this.undoStack.pop();
        if (!patchList) {
            return;
        }
        this.redoStack.push(patchList);
        this.renderDiff(patchList, vditor);
        this.hasUndo = true
    }

    public redo(vditor: IVditor) {
        const patchList = this.redoStack.pop();
        if (!patchList) {
            return;
        }
        this.undoStack.push(patchList);
        this.renderDiff(patchList, vditor, true);
    }

    public addToUndoStack(text: string, vditor: IVditor) {
        vditor.toolbar.elements.undo.children[0].className =
            vditor.toolbar.elements.undo.children[0].className.replace(" vditor-menu--disabled", "");
        clearTimeout(this.timeout)
        this.timeout = window.setTimeout(() => {
            const diff = this.dmp.diff_main(text, this.lastText, true);
            const patchList = this.dmp.patch_make(text, this.lastText, diff);
            if (patchList.length === 0) {
                return;
            }
            this.lastText = text;
            this.undoStack.push(patchList);
            if (this.undoStack.length > this.stackSize) {
                this.undoStack.shift();
            }
            if (this.hasUndo) {
                this.redoStack = []
                this.hasUndo = false
                const redoClassName = vditor.toolbar.elements.redo.children[0].className
                if (redoClassName.indexOf(" vditor-menu--disabled") === -1) {
                    vditor.toolbar.elements.redo.children[0].className =
                        redoClassName + " vditor-menu--disabled";
                }
            }
        }, 1000)
    }

    private renderDiff(patchList: patch_obj[], vditor: IVditor, isRedo: boolean = false) {
        let text;
        if (isRedo) {
            const redoPatchList = this.dmp.patch_deepCopy(patchList).reverse();
            redoPatchList.forEach((patch) => {
                patch.diffs.forEach((diff) => {
                    diff[0] = -diff[0];
                });
            });
            text = this.dmp.patch_apply(redoPatchList, this.lastText)[0];
        } else {
            text = this.dmp.patch_apply(patchList, this.lastText)[0];
        }

        this.lastText = text;
        formatRender(vditor, text, {
            end: text.length,
            start: text.length
        }, false);

        const undoClassName = vditor.toolbar.elements.undo.children[0].className;
        if (this.undoStack.length !== 0) {
            vditor.toolbar.elements.undo.children[0].className = undoClassName.replace(" vditor-menu--disabled", "");
        } else if (undoClassName.indexOf(" vditor-menu--disabled") === -1) {
            vditor.toolbar.elements.undo.children[0].className =
                undoClassName + " vditor-menu--disabled";
        }

        const redoClassName = vditor.toolbar.elements.redo.children[0].className;
        if (this.redoStack.length !== 0) {
            vditor.toolbar.elements.redo.children[0].className = redoClassName.replace(" vditor-menu--disabled", "");
        } else if (redoClassName.indexOf(" vditor-menu--disabled") === -1) {
            vditor.toolbar.elements.redo.children[0].className =
                redoClassName + " vditor-menu--disabled";
        }
    }
}

export {Undo};