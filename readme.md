# DeckPro - Professional Deck Design Software

A web-based application for designing code-compliant deck structures with real-time cost optimization.

## Features

✅ **IRC 2021 Compliant** - Generates structures that meet International Residential Code requirements
✅ **Cost Optimization** - Automatically finds the most cost-effective design
✅ **Visual Design Interface** - Draw your deck and see the structure in real-time
✅ **Material Cost Tracking** - Edit material prices and see total project cost
✅ **Professional Output** - Export material lists and deck plans

## Quick Start

1. Open `src/index.html` in a web browser
2. Draw a deck footprint using the Rectangle tool
3. Configure deck properties (height, attachment, materials)
4. Click "Generate Structure" 
5. View the optimized framing plan and material list

## Key Capabilities

### Structural Design
- Automatic joist sizing and spacing
- Beam selection with post placement
- Cantilever optimization
- Support for ledger and freestanding decks

### Cost Features
- User-editable material prices
- Real-time cost calculations
- Optimization considers footing costs ($500 for helical piles)
- Detailed cost breakdown by category

### Export Options
- PNG image of deck plan
- CSV material list
- Full bill of materials with quantities

## Technology Stack

- Vanilla JavaScript (no framework dependencies)
- HTML5 Canvas for visualization
- Event-driven architecture
- IRC 2021 span tables

## Project Structure

```
deckpro/
├── src/
│   ├── index.html          # Main application
│   ├── css/               # Stylesheets
│   ├── data/              # IRC tables and materials
│   ├── js/
│   │   ├── engine/        # Calculation engine
│   │   ├── ui/            # User interface components
│   │   └── utils/         # Utilities
├── tests/                 # Test suite
├── docs/                  # Documentation
└── specs/                 # Original specifications
```

## Testing

Run tests with:
```bash
cd src
npm test
```

Critical business logic is tested, including:
- Structural calculations
- Cost optimization
- Input validation
- IRC compliance

## Development Status

**Current Version**: 1.0.0-beta1
**Status**: Stable and production-ready

The application is feature-complete for basic deck design. All core functionality is working correctly.

## Future Enhancements

Planned improvements based on user feedback:
1. Save/load projects
2. PDF export with detailed plans
3. More decking material options
4. Multi-level deck support

## Documentation

- [Architecture Overview](docs/architecture-overview.md)
- [Technical Assessment](docs/technical-debt-report.md)
- [Development Roadmap](docs/refactoring-roadmap.md)
- [Code Metrics](docs/code-metrics-analysis.md)

## License

Copyright 2024. All rights reserved.