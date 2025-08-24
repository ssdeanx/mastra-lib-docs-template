
# Library Documentation Generator

## The Problem We Solve

AI coding assistants like Claude Code and Cursor are revolutionizing development, but they face a critical challenge: **outdated library knowledge**. When LLMs reference deprecated syntax or miss new APIs due to knowledge cutoffs, development slows down.

Current solutions like MCP Context7 or direct documentation fetching are inefficient and token-heavy. Production projects with version-locked dependencies need precise, version-specific documentation - not the latest docs from the web.

**Our Solution:** An intelligent documentation generator that creates concise, LLM-optimized API references directly from any repository. Generate comprehensive API documentation that can be committed to your repo, ensuring your AI tools always have accurate, version-specific references.

Generate **exhaustive, LLM-optimized API documentation** from any GitHub repository. This tool analyzes codebases and produces condensed context indexes containing hundreds or thousands of API methods - perfect for AI coding assistants that need complete, accurate references.

## Key Features

- **Comprehensive API Extraction** - Captures EVERY public method, not just summaries (300+ for lodash, 200+ for date-fns)
- **Multi-Phase Intelligence** - Progressively extracts from docs → TypeScript definitions → source code
- **LLM-Optimized Output** - Structured markdown designed for efficient token usage
- **Version-Specific Documentation** - Generate docs for your exact dependency versions
- **Language Agnostic** - Works best with TypeScript/JavaScript, supports Python, Go, and more
- **Automatic Chunking** - Handles large codebases by intelligently chunking content
- **Built with Mastra AI Framework** - Leverages AI agents for intelligent documentation analysis

## Generated Documentation Format

Each generated document follows this structure:

```markdown
## [Library Name] - Condensed Context Index

### Overall Purpose
[2-3 sentence comprehensive description of the library]

### Core Concepts & Capabilities  
[6-8 bullet points covering main features and concepts]

### Key APIs / Components / Configuration / Patterns
[EXHAUSTIVE list - 50, 100, 300+ entries depending on library size]
* `methodName(params)` - Brief description
* `anotherMethod(args)` - What it does
* ... [continues for ALL public APIs]

### Common Patterns & Best Practices / Pitfalls
[4-6 bullet points of usage patterns and gotchas]
```

## How It Works: Intelligent Multi-Phase Extraction

Our AI-powered system uses a progressive extraction strategy:

### Phase 1: Documentation Mining
- Fetches markdown documentation (README.md, API.md, docs/*.md)
- Intelligently skips non-API files (CHANGELOG, CONTRIBUTING, etc.)
- Extracts API signatures from code blocks and inline snippets
- Parses API reference tables and method listings

### Phase 2: TypeScript Definitions (if < 30 APIs found)
- Fetches .d.ts files which contain complete type definitions
- Extracts all exported functions, interfaces, and types
- For TypeScript libraries, often captures 100% of the API surface

### Phase 3: Source Code Analysis (fallback)
- Analyzes main source files (index.js, main.ts)
- Parses package.json for entry points
- Extracts exported functions and classes directly

### Intelligent Processing
- **Token Management**: Automatically chunks large content (>50K tokens)
- **Retry Logic**: Implements exponential backoff for API calls
- **Error Recovery**: Continues processing even if individual chunks fail

## Real-World Examples

### lodash (300+ methods extracted)
```markdown
### Key APIs / Components / Configuration / Patterns
* `_.chunk(array, size)` - Creates array of elements split into groups
* `_.compact(array)` - Creates array with falsy values removed  
* `_.concat(array, values)` - Creates new array concatenating values
* `_.debounce(func, wait, options)` - Creates debounced function
* `_.difference(array, values)` - Creates array excluding values
... [300+ more methods]
```

### date-fns (200+ functions extracted)
```markdown
### Key APIs / Components / Configuration / Patterns
* `format(date, formatString)` - Formats date according to string
* `addDays(date, amount)` - Adds specified number of days
* `differenceInDays(dateLeft, dateRight)` - Gets difference in days
* `parseISO(dateString)` - Parses ISO 8601 string to Date
... [200+ more functions]
```

### express.js (50+ APIs extracted)
```markdown
### Key APIs / Components / Configuration / Patterns
* `app.get(path, callback)` - Routes HTTP GET requests
* `app.post(path, callback)` - Routes HTTP POST requests
* `app.use(middleware)` - Mounts middleware function
* `req.params` - Route parameters object
* `res.json(body)` - Sends JSON response
... [50+ more APIs]
```

## Quick Start

### Prerequisites
- Node.js 20.9.0 or higher
- OpenAI API key

### Installation & Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/lib-docs-generator
cd lib-docs-generator

# Install dependencies
npm install

# Configure OpenAI API key
echo "OPENAI_API_KEY=your_api_key_here" > .env

# Build the CLI tool
npm run build-cli
```

### Generate Documentation

```bash
# Basic usage
npm run cli https://github.com/owner/repository

# Real examples with expected output
npm run cli https://github.com/lodash/lodash
# ✅ Generates 300+ utility methods documentation

npm run cli https://github.com/date-fns/date-fns  
# ✅ Generates 200+ date manipulation functions

npm run cli https://github.com/expressjs/express
# ✅ Generates 50+ web framework APIs

npm run cli https://github.com/axios/axios
# ✅ Generates HTTP client methods and config options
```

### Output
- **Console**: Displays progress and final documentation
- **File**: Saves to `{repository-name}-context-index.md`
- **Logs**: Detailed execution logs in `logs/workflow.log`

## Language Support

### Excellent Support (80-100% API coverage)
- **TypeScript/JavaScript** - Complete extraction from .d.ts files
- **Well-documented libraries** - Any language with comprehensive markdown
- **Python** - Good support with documented APIs
- **Go** - Extracts from README and doc comments

### Good Support (40-80% API coverage)  
- **Java** - Markdown docs (Javadoc parsing limited)
- **Ruby** - Markdown extraction (RDoc not supported)
- **Rust** - README docs (docs.rs not scraped)
- **C/C++** - Markdown only (Doxygen not parsed)

### Limited Support
- External documentation sites
- Proprietary doc formats
- Binary-only libraries

## Technical Architecture

### Built with Mastra AI Framework

#### AI Agent
- **`comprehensive-doc-generator`** - Intelligent agent that orchestrates the entire extraction process
  - Uses GPT-4 for content analysis
  - Implements adaptive extraction strategy
  - Manages token limits and chunking

#### Core Tools
- **`fetch-all-docs`** - Multi-mode file fetcher
  - Supports docs/types/source search modes
  - Intelligent file filtering (skips CHANGELOG, etc.)
  - Handles large repositories efficiently
  
- **`extract-all-apis`** - Universal API extractor
  - Parses multiple languages and formats
  - Extracts from markdown, TypeScript, JavaScript
  - Identifies function signatures and descriptions

- **`fetch-repo-content`** - GitHub content fetcher
  - Direct file access via GitHub API
  - Handles rate limiting gracefully

#### Workflow Pipeline
- **`generate-context-index`** - Three-phase workflow
  1. **fetch-docs** - Extracts from documentation
  2. **fetch-types** - Augments with TypeScript definitions
  3. **generate-final-docs** - Produces final markdown

#### Supporting Infrastructure
- **Logger** - Comprehensive execution logging
- **Retry Logic** - Exponential backoff for resilience  
- **Token Management** - Automatic content chunking for large repos

## Performance & Limitations

### Performance Characteristics
- **Processing Time**: 30-120 seconds for most libraries
- **Token Usage**: ~10K-50K tokens per generation
- **API Extraction Rate**: 50-500+ APIs per minute
- **Content Handling**: Automatic chunking for >50K token documents
- **Retry Logic**: Exponential backoff prevents API failures

### Token Limits & Chunking
- Documents >200KB are automatically chunked
- Each chunk processes ~50K tokens independently
- Final output combines all extracted APIs
- Large libraries may have truncated API lists

### Known Limitations

#### Language-Specific
- **Java**: Javadoc parsing not implemented
- **C/C++**: Doxygen comments not parsed
- **Python**: Docstring extraction limited
- **Ruby**: RDoc/YARD not supported

#### General Constraints  
- External documentation sites not scraped
- Files >1MB automatically skipped
- GitHub API rate limit: 60 requests/hour (unauthenticated)
- Comment-only documentation may be missed
- Binary or compiled libraries not supported

## Troubleshooting

### Common Issues & Solutions

#### Few or No APIs Found
- **Cause**: Library uses external documentation
- **Solution**: Check if docs are on a separate website
- **Alternative**: Try running on a different version tag

#### Process Timeouts
- **Cause**: Very large repository or slow API
- **Solution**: Repository may be too large; try a specific subdirectory
- **Note**: Processing can take 2-3 minutes for large libraries

#### OpenAI API Errors
```bash
# Verify API key is set
echo $OPENAI_API_KEY

# Check key validity
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```

#### Rate Limiting
- **GitHub**: 60 requests/hour without authentication
- **OpenAI**: Check your plan's rate limits
- **Solution**: Add delays between runs or authenticate GitHub

### Debug Mode
```bash
# Enable detailed logging
export DEBUG=true
npm run cli https://github.com/owner/repo

# Check logs for details
tail -f logs/workflow.log
```

## Future Enhancements

### Planned Features
- **GitHub Authentication** - Higher API rate limits
- **Version Tags** - Generate docs for specific releases  
- **Incremental Updates** - Only regenerate changed sections
- **Multiple Output Formats** - JSON, YAML, custom templates
- **Language-Specific Parsers** - Javadoc, RDoc, Doxygen
- **External Doc Sites** - Scrape docs.rs, pkg.go.dev, etc.
- **Caching Layer** - Reuse processed documentation
- **Web UI** - Browser-based generation interface

### Contributing

We welcome contributions! Key areas:

1. **Language Support** - Add parsers for new languages
2. **Documentation Formats** - Support more doc standards
3. **Performance** - Optimize token usage and processing
4. **Testing** - Add test coverage for various libraries

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

ISC License - See [LICENSE](LICENSE) for details

## 🙏 Acknowledgments

- **[Mastra](https://mastra.ai)** - AI workflow orchestration framework
- **[OpenAI GPT-4](https://openai.com)** - Intelligent content analysis
- **GitHub API** - Repository content access
- **Open Source Community** - Inspiration from hundreds of well-documented libraries

## Support & Feedback

- **Issues**: [GitHub Issues](https://github.com/yourusername/lib-docs-generator/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/lib-docs-generator/discussions)
- **Email**: support@example.com

---

<p align="center">
  Made with ❤️ for developers who value great documentation
</p>
