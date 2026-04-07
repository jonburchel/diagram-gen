# Diagram Generation Skill — Plan

## Problem
We need a Copilot CLI skill that generates consistent, publication-quality Mermaid diagrams with Microsoft branding, branded service logos, and Learn-compliant alt-text. The skill should work in multiple modes: from description, from image conversion, from page review, and from batch document auditing.

## Approach
Build a Copilot CLI extension (`diagram-gen`) that exposes multiple tools backed by a shared rendering pipeline. The skill generates Mermaid DSL code with a locked-in Microsoft theme, renders via `mmdc` (Mermaid CLI), and enriches output with branded icons and alt-text.

---

## Architecture

```
User request
    ↓
[Copilot Agent selects tool]
    ↓
┌─────────────────────────────────┐
│ diagram-gen extension           │
│                                 │
│ Tools:                          │
│  • diagram_generate             │
│  • diagram_convert              │
│  • diagram_for_page             │
│  • diagram_audit                │
│                                 │
│ Shared infrastructure:          │
│  • Microsoft theme config       │
│  • Rendering pipeline (mmdc)    │
│  • Icon/logo resolver           │
│  • Alt-text generator           │
└─────────────────────────────────┘
    ↓
Output: SVG/PNG + Mermaid source + alt-text + placement suggestions
```

---

## Tool Definitions

### 1. `diagram_generate`
**Input:** Natural language description of diagram elements and relationships.
**Output:** Rendered diagram (SVG/PNG), Mermaid source, and alt-text.
**Example:** "Show an architecture where API Gateway routes to three microservices, each with their own Azure SQL database"

### 2. `diagram_convert`
**Input:** Image (path or URL) of an existing poorly drawn/laid out diagram.
**Output:** Standardized rendered diagram, Mermaid source, and alt-text.
**How:** Agent analyzes the image, extracts the logical structure, regenerates as clean Mermaid.

### 3. `diagram_for_page`
**Input:** URL or file path to a page/document + optional short description of focus.
**Output:** One or more diagrams that would enhance the page, with alt-text.

### 4. `diagram_audit` (killer feature)
**Input:** Path to a document or directory of documents (batch mode).
**Output:** For each document:
  - Whether diagram(s) would be beneficial (and why)
  - Generated diagram(s) with Mermaid source and rendered files
  - Suggested insertion point (after which heading/paragraph)
  - Alt-text following Microsoft Learn guidelines
  - Long descriptions for complex diagrams

---

## Standardizations

### A. Microsoft Theme (Mermaid `base` theme override)

```json
{
  "theme": "base",
  "themeVariables": {
    "primaryColor": "#0078D4",
    "primaryTextColor": "#FFFFFF",
    "primaryBorderColor": "#005A9E",
    "secondaryColor": "#F3F2F1",
    "secondaryTextColor": "#323130",
    "secondaryBorderColor": "#D2D0CE",
    "tertiaryColor": "#E1DFDD",
    "tertiaryTextColor": "#323130",
    "lineColor": "#605E5C",
    "textColor": "#323130",
    "mainBkg": "#0078D4",
    "nodeBorder": "#005A9E",
    "clusterBkg": "#F3F2F1",
    "clusterBorder": "#D2D0CE",
    "titleColor": "#323130",
    "edgeLabelBackground": "#FFFFFF",
    "fontFamily": "Segoe UI, -apple-system, BlinkMacSystemFont, sans-serif",
    "fontSize": "14px"
  }
}
```

### B. Node Shape Conventions
| Element Type       | Mermaid Shape       | Color Class     |
|--------------------|---------------------|-----------------|
| Service/API        | Rectangle           | `msBlue`        |
| Database/Storage   | Cylinder             | `msGreen`       |
| User/Actor         | Stadium (rounded)    | `msNeutral`     |
| Decision/Gateway   | Diamond              | `msYellow`      |
| External System    | Hexagon              | `msGray`        |
| Process/Action     | Rounded rectangle    | `msBlue`        |
| Queue/Event        | Trapezoid            | `msPurple`      |

### C. Color Classes (classDef)
```mermaid
classDef msBlue fill:#0078D4,stroke:#005A9E,color:#fff,stroke-width:2px;
classDef msGreen fill:#107C10,stroke:#0B6A0B,color:#fff,stroke-width:2px;
classDef msYellow fill:#FFB900,stroke:#D48C00,color:#323130,stroke-width:2px;
classDef msRed fill:#D13438,stroke:#A4262C,color:#fff,stroke-width:2px;
classDef msNeutral fill:#F3F2F1,stroke:#D2D0CE,color:#323130,stroke-width:2px;
classDef msGray fill:#605E5C,stroke:#484644,color:#fff,stroke-width:2px;
classDef msPurple fill:#8764B8,stroke:#6B4FA0,color:#fff,stroke-width:2px;
```

### D. Layout Direction Conventions
| Diagram Purpose          | Direction | Rationale                          |
|--------------------------|-----------|-------------------------------------|
| Architecture/hierarchy    | TB        | Natural top-down reading            |
| Process flow/timeline     | LR        | Matches left-to-right reading       |
| Data flow                 | LR        | Shows transformation pipeline       |
| Decision tree             | TB        | Branches read naturally downward    |
| Sequence diagram          | (N/A)     | Mermaid handles automatically       |

### E. Arrow/Connection Conventions
| Relationship Type    | Mermaid Syntax  | Meaning                      |
|----------------------|-----------------|------------------------------|
| Direct dependency    | `-->`           | Solid arrow, synchronous     |
| Async/event-driven   | `-.->` (dotted) | Asynchronous communication   |
| Data flow            | `==>`  (thick)  | Bulk data movement           |
| Optional/fallback    | `-.->`          | Dotted, optional path        |
| Bidirectional        | `<-->`          | Two-way communication        |

### F. Complexity Guidelines
- **Max 12 nodes** per diagram; split into sub-diagrams if more
- **Max 3 nesting levels** in subgraphs
- **Use subgraphs** for logical grouping (e.g., "Azure Resource Group", "VNet")
- **Label every connection** when the relationship isn't obvious
- **Title every diagram** using Mermaid's `---\ntitle: ...\n---` frontmatter

### G. Branded Icon Strategy
- When generating diagrams that reference known services (Azure, AWS, GitHub, etc.), the tool searches for official SVG/PNG logos
- Icons are embedded via HTML labels in flowcharts (`htmlLabels: true`)
- Maintain a local cache of frequently used icons
- Icon sizing: 24x24px inline, 48x48px for primary nodes

### H. Alt-Text Rules (from Learn Contributors Guide)
- 40-150 characters
- Begin with diagram type: "Diagram that shows..." or "Flowchart of..."
- End with a period
- No "Image..." or "Graphic..." prefix
- Omit figure numbers, bold/italic formatting
- Spaces in sentence-case acronyms (e.g., "A P I" in sentence case, but "API" in all-caps is fine)
- For complex diagrams (>6 nodes), supplement with a long description in adjacent text
- Decorative images get empty alt text (type="icon")

### I. Output Specifications
- **Primary format:** SVG (vector, scales perfectly)
- **Fallback format:** PNG at 2x device pixel ratio (high-DPI for docs)
- **Background:** White (#FFFFFF) for light-mode docs, transparent optional
- **Max width:** 800px (fits Learn content column)
- **File naming:** `{document-slug}-{diagram-type}-{sequence}.svg`

---

## Implementation Todos

1. **scaffold-extension** — Scaffold the diagram-gen extension skeleton
2. **install-mermaid-cli** — Install @mermaid-js/mermaid-cli globally or locally
3. **create-theme-config** — Create the Microsoft theme JSON config + CSS
4. **implement-render-pipeline** — Build shared rendering function (Mermaid source → SVG/PNG via mmdc)
5. **implement-diagram-generate** — Tool: generate diagram from description
6. **implement-diagram-convert** — Tool: convert image to standardized diagram
7. **implement-diagram-for-page** — Tool: review page and generate diagram
8. **implement-diagram-audit** — Tool: batch document review with placement suggestions
9. **implement-icon-resolver** — Utility to search/cache branded service logos
10. **implement-alt-text-gen** — Utility to generate Learn-compliant alt-text
11. **test-end-to-end** — Test all four modes with sample inputs
12. **create-skill-prompt** — Write the skill description/prompt that guides the agent

---

## Dependencies
- `@mermaid-js/mermaid-cli` (mmdc) — Rendering engine
- Puppeteer/Chromium — Required by mmdc for SVG/PNG rendering
- Node.js `fs`, `path`, `child_process` — File I/O and CLI invocation
- `fetch` — For downloading branded logos on demand

## Notes
- The extension runs as a separate Node.js process (JSON-RPC over stdio)
- The rendering pipeline is synchronous from the tool handler's perspective (await mmdc)
- Icon caching prevents repeated downloads of the same logo
- The agent handles the "intelligence" (what to diagram, how to structure it); the extension handles theming, rendering, and standards enforcement
