---
name: diagram-gen
description: "Generate Mermaid diagrams with Microsoft Fluent theming, alt-text, and review reports"
---

# Diagram Generation Skill

This skill generates publication-quality Mermaid diagrams with Microsoft Fluent theming. It renders SVG/PNG output with consistent colors, proper edge routing, and Learn-compliant alt-text.

## Usage

When this skill is invoked, interpret the user's request and take the appropriate action:

| User's request | What to do |
|---|---|
| A description of a diagram | Generate Mermaid code following the conventions below, then call `diagram_render` to render it |
| An image of a diagram | Analyze the image, extract the logical structure, recreate as Mermaid with theming, render with `diagram_render` |
| A URL or file path | Read the content, identify what diagram(s) would help, generate and render them |
| A batch of documents | Review each document, propose diagrams with placement suggestions and alt-text |

## Diagram Conventions

### Color Classes (always use these on nodes)
- `:::msBlue` — Services, APIs, primary components (#0078D4)
- `:::msGreen` — Databases, storage, data stores (#107C10)
- `:::msYellow` — Decisions, gateways, warnings (#FFB900)
- `:::msRed` — Errors, alerts, critical paths (#D13438)
- `:::msNeutral` — Users, actors, external inputs (#F3F2F1)
- `:::msGray` — External systems, third-party services (#605E5C)
- `:::msPurple` — Queues, events, async operations (#8764B8)
- `:::msWhite` — Background/container nodes (#FFFFFF)

### Layout Direction
- **TB** (top-to-bottom): Architecture, hierarchies, component relationships
- **LR** (left-to-right): Process flows, timelines, data pipelines

### Arrow Conventions
- `-->` : Synchronous/direct dependency
- `-.->` : Asynchronous/event-driven
- `==>` : Data flow / bulk data movement
- `<-->` : Bidirectional communication

### Node Shapes
- `[text]` Rectangle: Services, APIs
- `[(text)]` Cylinder: Databases, storage
- `([text])` Stadium: Users, actors
- `{text}` Diamond: Decisions
- `{{text}}` Hexagon: External systems
- `(text)` Rounded rectangle: Processes, actions

### Edge Routing (CRITICAL)
- NEVER create many-to-many edge patterns where edges cross through intermediate nodes or text labels
- When multiple sources connect to multiple targets, restructure:
  1. Switch direction (TB to LR) so edges run parallel
  2. Group sources in a subgraph with internal layout
  3. Introduce a hub node that fans out
  4. Reorder nodes so edges flow naturally

### Complexity Rules
- Max 12 nodes per diagram; split into sub-diagrams if more
- Max 3 nesting levels for subgraphs
- Label every connection when the relationship isn't obvious

### Alt-Text (Microsoft Learn guidelines)
- 40-150 characters long
- Begin with diagram type: "Diagram that shows...", "Flowchart of..."
- End with a period
- Never start with "Image..." or "Graphic..."
- For complex diagrams (>6 nodes), provide a long description

### Review Reports and HTML Output
When generating review pages or audit reports:
- Always linkify article paths to their live published URL
- For Microsoft Learn docs: `articles/foundry/...` becomes `https://learn.microsoft.com/en-us/azure/foundry/...` (strip `.md`)
- Style links with Microsoft blue (#0078D4), open in new tab
- Embed diagrams as base64 SVG for self-contained HTML files

## Tool: `diagram_render`

### Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `mermaid_code` | string | Yes | Valid Mermaid source code with `:::msBlue` etc. class assignments |
| `output_path` | string | Yes | Absolute path for the rendered output file |
| `format` | string | No | `svg` (default) or `png` |
| `alt_text` | string | No | Alt text following Learn guidelines; validated on submission |

## Important Guidelines

1. **Always use the color classes.** Every node should have a `:::msColor` class assignment.
2. **Always provide alt-text** when rendering diagrams for documentation.
3. **Don't announce the skill.** Just generate the diagrams and report results.
4. **Verify edge routing.** Before rendering, mentally trace each edge to confirm no line passes through a node or label.
