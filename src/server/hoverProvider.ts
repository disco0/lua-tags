// 处理鼠标悬浮提示


import {
    Hover,
    Range,
    Position,
    Location,
    MarkupKind,
    MarkupContent,
    createConnection,
    TextDocuments,
    TextDocument,
    Diagnostic,
    DiagnosticSeverity,
    ProposedFeatures,
    InitializeParams,
    DidChangeConfigurationNotification,
    CompletionItem,
    SymbolInformation,
    CompletionItemKind,
    DocumentSymbolParams,
    WorkspaceSymbolParams,
    TextDocumentPositionParams,
    SymbolKind,
    Definition
} from 'vscode-languageserver';

import {
    Symbol,
    SymInfoEx,
    CommentType
} from "./symbol";

import {
    Search
} from "./search";

import {
    Server
} from "./server";

import {
    GoToDefinition
} from "./goToDefinition";

export class HoverProvider {
    private static ins: HoverProvider;

    private constructor() {
    }

    public static instance() {
        if (!HoverProvider.ins) {
            HoverProvider.ins = new HoverProvider();
        }

        return HoverProvider.ins;
    }

    private toLuaMarkdown(sym: SymInfoEx, ctx: string, uri: string): string {
        let path = Symbol.getPathPrefix(sym, uri);
        let above = "";
        let lineEnd = "";
        let prefix = "";
        if (sym.comment) {
            switch (sym.ctType) {
                case CommentType.CT_ABOVE: above = sym.comment + "\n"; break;
                case CommentType.CT_LINEEND: lineEnd = " " + sym.comment; break;
                case CommentType.CT_HTML: prefix = sym.comment + "\n"; break;
            }
        }

        let ref = Symbol.instance().getRefValue(sym);
        return `${path}${prefix}\`\`\`lua\n${above}${ctx}${ref}${lineEnd}\n\`\`\``;
    }

    private defaultTips(sym: SymInfoEx, uri: string) {
        if (sym.value) {
            let prefix = Symbol.getLocalTypePrefix(sym.local);
            return this.toLuaMarkdown(sym,
                `${prefix}${sym.name} = ${sym.value}`, uri);
        }

        if (sym.local || sym.refType) {
            let local = Symbol.getLocalTypePrefix(sym.local);
            let base = Symbol.getBasePrefix(sym);
            return this.toLuaMarkdown(sym, `${local}${base}${sym.name}`, uri);
        }

        if (sym.location.uri !== uri) {
            return this.toLuaMarkdown(sym, sym.name, uri);
        }

        return null;
    }

    private toOneMarkdown(sym: SymInfoEx, uri: string): string | null {
        let tips: string | null = null;
        switch (sym.kind) {
            case SymbolKind.Function: {
                let local = sym.local ? "local " : "";
                let parameters = "";
                if (sym.parameters) {
                    parameters = sym.parameters.join(", ");
                }
                let base = Symbol.getBasePrefix(sym);

                tips = this.toLuaMarkdown(sym,
                    `${local}function ${base}${sym.name}(${parameters})`, uri);
                break;
            }
            case SymbolKind.Namespace: {
                let local = sym.local ? "local " : "";
                tips = this.toLuaMarkdown(sym,
                    `(table) ${local}${sym.name}`, uri);
                break;
            }
            case SymbolKind.Module: {
                tips = this.toLuaMarkdown(sym, `(module) ${sym.name}`, uri);
                break;
            }
            default: {
                return this.defaultTips(sym, uri);
            }

        }
        return tips;
    }

    private toMarkdown(symList: SymInfoEx[], uri: string): string {
        let list: string[] = [];
        for (let sym of symList) {
            const markdown = this.toOneMarkdown(sym, uri);
            if (markdown) {
                list.push(markdown);
            }
        }

        return list.join("\n---\n");
    }

    /* 搜索模块名
     * 正常情况下，声明一个模块都会产生一个符号
     * 但table.empty = function() ... end这种扩展标准库或者C++导出的模块时就没有
     * 所以这里特殊处理
     */
    private searchModuleName(name: string) {
        if (!Symbol.instance().getGlobalModuleSubList([name])) {
            return null;
        }

        return `\`\`\`lua\n(module) ${name}\n\`\`\``;
    }

    public doHover(srv: Server, uri: string, pos: Position): Hover | null {
        let line = srv.getQueryText(uri, pos);
        if (!line) { return null; }

        let query = srv.getQuerySymbol(uri, line, pos);
        if (!query || query.name === "") { return null; }

        let list = Search.instance().search(srv, query);

        let value = list ?
            this.toMarkdown(list, uri) : this.searchModuleName(query.name);

        if (!value || value === "") {
            return null;
        }

        return {
            contents: {
                kind: MarkupKind.Markdown,
                value: value
            }
        };
    }
}
