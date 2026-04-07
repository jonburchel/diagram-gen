# diagram-gen

A Copilot CLI extension/skill that generates publication-quality Mermaid diagrams with Microsoft Fluent theming.

## Features

- **Microsoft Fluent color scheme** — Consistent branding using official Microsoft/Fluent Design colors
- **Multiple operation modes:**
  - `diagram_generate` — Describe a diagram in natural language, get a rendered SVG/PNG
  - `diagram_convert` — Convert a poorly drawn diagram image to a clean, standardized one
  - `diagram_for_page` — Point it at a page, get a relevant diagram
  - `diagram_audit` — Batch-scan documents, propose diagrams with placement and alt-text
- **Learn-compliant alt-text** — Validates alt-text against Microsoft Learn Contributors Guide (40-150 chars, proper prefixes, etc.)
- **Branded service icons** — Search and embed official logos for Azure, Microsoft 365, and other services
- **Deterministic output** — Same input always produces the same diagram (unlike AI image generators)

## Installation

### As a Copilot CLI user extension

```bash
# Copy to your user extensions directory
cp -r .github/extensions/diagram-gen ~/.copilot/extensions/diagram-gen

# Install dependencies
cd ~/.copilot/extensions/diagram-gen
npm install @mermaid-js/mermaid-cli
```

### As a project extension

Clone this repo into your project:

```bash
# The .github/extensions/diagram-gen directory will be auto-discovered
git clone https://github.com/jonburchel/diagram-gen.git
```

## Theme Configuration

The Microsoft theme is defined in `config/ms-theme.json` and `config/ms-styles.css`. The theme uses:

| Color Class | Hex | Use For |
|-------------|-----|---------|
| `msBlue` | `#0078D4` | Services, APIs, primary components |
| `msGreen` | `#107C10` | Databases, storage, data stores |
| `msYellow` | `#FFB900` | Decisions, gateways, warnings |
| `msRed` | `#D13438` | Errors, alerts, critical paths |
| `msNeutral` | `#F3F2F1` | Users, actors, external inputs |
| `msGray` | `#605E5C` | External systems, third-party |
| `msPurple` | `#8764B8` | Queues, events, async operations |

## Conventions

See the [plan](plan.md) for full standardization details including:
- Node shape conventions
- Layout direction rules (TB vs LR)
- Arrow/connection types
- Complexity limits (max 12 nodes)
- Alt-text compliance rules

## Example Output

See `review.html` for a complete example showing four diagrams generated for the [Foundry Agent Service Overview](https://learn.microsoft.com/en-us/azure/foundry/agents/overview) documentation page.

## Dependencies

- `@mermaid-js/mermaid-cli` (mmdc) — Rendering engine
- Puppeteer/Chromium — Required by mmdc
- Copilot CLI — For the extension runtime

## License

MIT
