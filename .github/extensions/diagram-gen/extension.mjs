// Extension: diagram-gen
// Generate publication-quality Mermaid diagrams with Microsoft branding

import { joinSession } from "@github/copilot-sdk/extension";
import { execFile, exec } from "node:child_process";
import { writeFileSync, readFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";

const isWindows = process.platform === "win32";

// Resolve config paths - check multiple locations
function findConfigDir() {
    const candidates = [
        join(process.cwd(), "diagram-gen", "config"),
        join(process.cwd(), "config"),
        "F:\\home\\diagram-gen\\config",
    ];
    for (const dir of candidates) {
        if (existsSync(join(dir, "ms-theme.json"))) return dir;
    }
    return null;
}

// Microsoft Mermaid color classes injected into every diagram
const MS_CLASS_DEFS = `
classDef msBlue fill:#0078D4,stroke:#005A9E,color:#fff,stroke-width:2px
classDef msGreen fill:#107C10,stroke:#0B6A0B,color:#fff,stroke-width:2px
classDef msYellow fill:#FFB900,stroke:#D48C00,color:#323130,stroke-width:2px
classDef msRed fill:#D13438,stroke:#A4262C,color:#fff,stroke-width:2px
classDef msNeutral fill:#F3F2F1,stroke:#D2D0CE,color:#323130,stroke-width:2px
classDef msGray fill:#605E5C,stroke:#484644,color:#fff,stroke-width:2px
classDef msPurple fill:#8764B8,stroke:#6B4FA0,color:#fff,stroke-width:2px
classDef msWhite fill:#FFFFFF,stroke:#D2D0CE,color:#323130,stroke-width:1.5px
`.trim();

// Alt-text validation per Microsoft Learn guidelines
function validateAltText(altText) {
    const issues = [];
    if (!altText || altText.length < 40) issues.push(`Alt text too short (${altText?.length || 0} chars, min 40)`);
    if (altText && altText.length > 150) issues.push(`Alt text too long (${altText.length} chars, max 150)`);
    if (altText && !altText.endsWith(".")) issues.push("Alt text must end with a period");
    if (altText && /^(Image|Graphic)/i.test(altText)) issues.push("Don't start with 'Image' or 'Graphic' - screen readers say this automatically");
    if (altText && !/^(Diagram|Flowchart|Sequence diagram|Architecture|Chart|Graph|Screenshot|Table|Map|Illustration)/i.test(altText)) {
        issues.push("Should begin with the type of graphic (e.g., 'Diagram that shows...', 'Flowchart of...')");
    }
    return { valid: issues.length === 0, issues };
}

// Inject class definitions into Mermaid source
function injectClassDefs(mermaidCode) {
    const lines = mermaidCode.split("\n");
    // Find the end of the diagram definition, before any existing classDef
    const hasClassDef = lines.some(l => l.trim().startsWith("classDef "));
    if (hasClassDef) return mermaidCode; // already has custom classes
    // Append after the last line
    return mermaidCode + "\n" + MS_CLASS_DEFS;
}

// Render Mermaid to SVG/PNG
async function renderMermaid(mermaidCode, outputPath, format = "svg") {
    const configDir = findConfigDir();
    const tempDir = join(tmpdir(), "diagram-gen-" + randomUUID().slice(0, 8));
    mkdirSync(tempDir, { recursive: true });

    const inputFile = join(tempDir, "input.mmd");
    const enrichedCode = injectClassDefs(mermaidCode);
    writeFileSync(inputFile, enrichedCode, "utf-8");

    // Ensure output directory exists
    const outDir = dirname(outputPath);
    mkdirSync(outDir, { recursive: true });

    const args = [
        "--input", inputFile,
        "--output", outputPath,
        "--outputFormat", format,
        "--backgroundColor", "white",
        "--scale", "2",
    ];

    if (configDir) {
        const themeFile = join(configDir, "ms-theme.json");
        const cssFile = join(configDir, "ms-styles.css");
        if (existsSync(themeFile)) args.push("--configFile", themeFile);
        if (existsSync(cssFile)) args.push("--cssFile", cssFile);
    }

    return new Promise((resolve, reject) => {
        const mmdc = join(process.cwd(), "node_modules", ".bin", "mmdc");
        const mmdcGlobal = "mmdc";

        // Try project-local first, then check diagram-gen dir, then global
        const candidates = [
            mmdc,
            join("F:\\home\\diagram-gen", "node_modules", ".bin", "mmdc"),
            mmdcGlobal,
        ];

        function tryNext(idx) {
            if (idx >= candidates.length) {
                reject(new Error("mmdc not found. Install @mermaid-js/mermaid-cli"));
                return;
            }
            const cmd = candidates[idx];
            const shell = isWindows ? "cmd" : "bash";
            const shellArgs = isWindows
                ? ["/c", cmd, ...args]
                : ["-c", `${cmd} ${args.map(a => `"${a}"`).join(" ")}`];

            execFile(shell, shellArgs, { timeout: 60000 }, (err, stdout, stderr) => {
                if (err && idx < candidates.length - 1) {
                    tryNext(idx + 1);
                    return;
                }
                if (err) {
                    reject(new Error(`mmdc failed: ${stderr || err.message}`));
                    return;
                }
                resolve({ outputPath, stdout, stderr });
            });
        }
        tryNext(0);
    });
}

// Diagramming conventions context injected when diagram-related prompts are detected
const DIAGRAM_CONTEXT = `
## Diagram Generation Standards (diagram-gen skill)

When generating Mermaid diagrams, follow these conventions:

### Color Classes (always use these)
- msBlue: Services, APIs, primary components (fill:#0078D4)
- msGreen: Databases, storage, data stores (fill:#107C10)
- msYellow: Decisions, gateways, warnings (fill:#FFB900)
- msRed: Errors, alerts, critical paths (fill:#D13438)
- msNeutral: Users, actors, external inputs (fill:#F3F2F1)
- msGray: External systems, third-party services (fill:#605E5C)
- msPurple: Queues, events, async operations (fill:#8764B8)
- msWhite: Background/container nodes (fill:#FFFFFF)

### Layout Direction
- TB (top-to-bottom): Architecture, hierarchies, component relationships
- LR (left-to-right): Process flows, timelines, data pipelines, development lifecycles

### Arrow Conventions
- --> : Synchronous/direct dependency
- -.-> : Asynchronous/event-driven
- ==> : Data flow / bulk data movement
- <--> : Bidirectional communication

### Node Shapes
- Rectangle [text]: Services, APIs
- Cylinder [(text)]: Databases, storage
- Stadium ([text]): Users, actors
- Diamond{text}: Decisions
- Hexagon{{text}}: External systems
- Rounded rectangle(text): Processes, actions

### Complexity Rules
- Max 12 nodes per diagram (split into sub-diagrams if more)
- Max 3 nesting levels for subgraphs
- Label every connection when relationship isn't obvious
- Use subgraphs for logical grouping (e.g., Azure Resource Group)

### Alt-Text (Microsoft Learn guidelines)
- 40-150 characters long
- Begin with diagram type: "Diagram that shows...", "Flowchart of..."
- End with a period
- Never start with "Image..." or "Graphic..."
- For complex diagrams (>6 nodes), provide a long description

### Output
After generating Mermaid code, call the diagram_render tool to render it with Microsoft theming.
`.trim();

const session = await joinSession({
    hooks: {
        onSessionStart: async () => {
            await session.log("diagram-gen skill loaded — Microsoft-themed Mermaid diagrams ready");
        },
        onUserPromptSubmitted: async (input) => {
            const prompt = (input.prompt || "").toLowerCase();
            const diagramKeywords = [
                "diagram", "flowchart", "architecture", "sequence", "mermaid",
                "visualize", "illustrate", "draw", "chart", "graph",
                "diagram_render", "diagram_generate", "diagram_convert",
                "diagram_audit", "diagram_for_page",
            ];
            if (diagramKeywords.some(kw => prompt.includes(kw))) {
                return { additionalContext: DIAGRAM_CONTEXT };
            }
        },
    },
    tools: [
        {
            name: "diagram_render",
            description: `Render Mermaid diagram code to SVG or PNG with Microsoft Fluent theming.
The agent generates Mermaid code following the diagram conventions, then calls this tool to render.
Returns the output file path and validates alt-text compliance.
Always apply the Microsoft color classes (msBlue, msGreen, etc.) to nodes in your Mermaid code.`,
            parameters: {
                type: "object",
                properties: {
                    mermaid_code: {
                        type: "string",
                        description: "Valid Mermaid diagram source code. Include classDef assignments (:::msBlue etc) on nodes.",
                    },
                    output_path: {
                        type: "string",
                        description: "Absolute path where the rendered diagram should be saved (e.g., F:\\home\\diagram-gen\\output\\architecture.svg)",
                    },
                    format: {
                        type: "string",
                        enum: ["svg", "png"],
                        description: "Output format. SVG for web/docs, PNG for print. Default: svg",
                    },
                    alt_text: {
                        type: "string",
                        description: "Alt text for the diagram following Microsoft Learn guidelines (40-150 chars, starts with diagram type, ends with period).",
                    },
                },
                required: ["mermaid_code", "output_path"],
            },
            handler: async (args) => {
                const { mermaid_code, output_path, format = "svg", alt_text } = args;
                try {
                    // Validate alt-text
                    let altTextResult = null;
                    if (alt_text) {
                        altTextResult = validateAltText(alt_text);
                    }

                    // Render
                    const result = await renderMermaid(mermaid_code, output_path, format);

                    const response = {
                        success: true,
                        output_path: result.outputPath,
                        format,
                        mermaid_source: mermaid_code,
                    };

                    if (altTextResult) {
                        response.alt_text = alt_text;
                        response.alt_text_valid = altTextResult.valid;
                        if (!altTextResult.valid) {
                            response.alt_text_issues = altTextResult.issues;
                        }
                    }

                    return JSON.stringify(response, null, 2);
                } catch (err) {
                    return JSON.stringify({
                        success: false,
                        error: err.message,
                        hint: "Check that the Mermaid syntax is valid. Common issues: unescaped special chars in labels, missing node definitions.",
                    });
                }
            },
        },
    ],
});
