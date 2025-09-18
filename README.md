# Totem Memory Warehouse

A comprehensive backend warehouse system for autonomous agents to store, retrieve, and evolve their long-term memories. This system supports complex, multi-session operations with advanced semantic linking and memory evolution mechanisms.

## Features

- **Memory Management**: Store and retrieve episodic, semantic, procedural, and working memories
- **Semantic Linking**: Automatic linking of memories based on semantic similarity using OpenAI embeddings
- **Memory Evolution**: Dynamic mechanisms for memory decay, consolidation, and knowledge transfer
- **Real-time Monitoring**: Track memory evolution, access patterns, and system performance
- **Visualization**: Memory clustering, network graphs, and usage pattern visualization
- **RESTful API**: Comprehensive API for all memory operations
- **PostgreSQL + pgvector**: Efficient storage and vector similarity search

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   AI Agents     │    │   Memory API    │    │   PostgreSQL    │
│                 │◄──►│                 │◄──►│   + pgvector    │
│ - Agent Alpha   │    │ - Express.js    │    │                 │
│ - Research Bot  │    │ - Prisma ORM    │    │ - Memory Store  │
│ - Creative AI   │    │ - OpenAI API    │    │ - Vector Search │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │   Monitoring    │
                       │                 │
                       │ - Analytics     │
                       │ - Visualization │
                       │ - Cron Jobs     │
                       └─────────────────┘
```

## Prerequisites

- Node.js 18.0.0 or higher
- PostgreSQL 12 or higher
- OpenAI API key

## Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Ashishjagrawal/totem-assignment.git
   cd totem-assignment
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env
   ```
   
   Edit `.env` with your configuration:
   ```env
   DATABASE_URL="postgresql://username:password@localhost:5432/memory_warehouse?schema=public"
   OPENAI_API_KEY="your_openai_api_key_here"
   PORT=3000
   NODE_ENV=development
   ```

4. **Set up PostgreSQL with pgvector**
   ```sql
   -- Install pgvector extension
   CREATE EXTENSION IF NOT EXISTS vector;
   
   -- Create database
   CREATE DATABASE memory_warehouse;
   ```

5. **Run database migrations**
   ```bash
   npm run db:migrate
   ```

6. **Generate Prisma client**
   ```bash
   npm run db:generate
   ```

7. **Seed the database (optional)**
   ```bash
   npm run db:seed
   ```

## Usage

### Start the server
```bash
# Development
npm run dev

# Production
npm start
```

The API will be available at `http://localhost:3000`

### API Endpoints

#### Agents
- `POST /api/v1/agents` - Create a new agent
- `GET /api/v1/agents` - List all agents
- `GET /api/v1/agents/:id` - Get agent by ID
- `PUT /api/v1/agents/:id` - Update agent
- `DELETE /api/v1/agents/:id` - Delete agent

#### Memories
- `POST /api/v1/memories` - Create a new memory
- `GET /api/v1/memories/:id` - Get memory by ID
- `PUT /api/v1/memories/:id` - Update memory
- `DELETE /api/v1/memories/:id` - Delete memory
- `POST /api/v1/memories/search` - Search memories
- `GET /api/v1/memories/stats/:agentId` - Get memory statistics

#### Analytics
- `GET /api/v1/analytics/metrics` - Get system metrics
- `GET /api/v1/analytics/evolution` - Get memory evolution data
- `GET /api/v1/analytics/clustering` - Get clustering data
- `GET /api/v1/analytics/performance` - Get performance metrics

#### Visualization
- `GET /api/v1/visualization/network` - Get memory network data
- `GET /api/v1/visualization/timeline` - Get timeline data
- `GET /api/v1/visualization/clusters` - Get cluster data
- `GET /api/v1/visualization/heatmap` - Get heatmap data

### Example Usage

#### Create an Agent
```bash
curl -X POST http://localhost:3000/api/v1/agents \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My AI Agent",
    "description": "A helpful AI assistant"
  }'
```

#### Create a Memory
```bash
curl -X POST http://localhost:3000/api/v1/memories \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "agent-uuid",
    "content": "Learned about machine learning concepts",
    "type": "SEMANTIC",
    "metadata": {"source": "tutorial"}
  }'
```

#### Search Memories
```bash
curl -X POST http://localhost:3000/api/v1/memories/search \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "agent-uuid",
    "query": "machine learning",
    "limit": 10
  }'
```

## Memory Types

- **EPISODIC**: Specific events and experiences
- **SEMANTIC**: General knowledge and facts
- **PROCEDURAL**: Step-by-step processes and procedures
- **WORKING**: Temporary information for current tasks

## Memory Evolution

The system automatically handles:

- **Memory Decay**: Gradual reduction in importance over time
- **Consolidation**: Merging similar memories to reduce redundancy
- **Knowledge Transfer**: Sharing memories between agents
- **Link Creation**: Automatic semantic linking based on similarity
- **Obsolescence**: Archiving or removing outdated memories

## Monitoring

The system provides real-time monitoring of:

- Memory creation and access patterns
- System performance metrics
- API response times
- Memory evolution statistics
- Vector similarity search performance

## Testing

Run the test suite:
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm test -- --coverage
```

## Database Schema

The system uses PostgreSQL with the following main tables:

- `agents` - AI agents
- `sessions` - Agent sessions
- `memories` - Memory storage with vector embeddings
- `memory_links` - Semantic links between memories
- `procedural_steps` - Steps for procedural memories
- `memory_accesses` - Access tracking
- `system_metrics` - Performance metrics

## Configuration

Key environment variables:

- `DATABASE_URL` - PostgreSQL connection string
- `OPENAI_API_KEY` - OpenAI API key for embeddings
- `MEMORY_DECAY_RATE` - Rate of memory importance decay (default: 0.01)
- `SIMILARITY_THRESHOLD` - Minimum similarity for linking (default: 0.7)
- `MAX_MEMORY_AGE_DAYS` - Maximum age before archiving (default: 365)

## Development

### Project Structure
```
src/
├── routes/           # API route handlers
├── services/         # Business logic services
├── middleware/       # Express middleware
├── utils/            # Utility functions
├── tests/            # Test files
└── scripts/          # Database scripts
```

### Adding New Features

1. Create service in `src/services/`
2. Add routes in `src/routes/`
3. Write tests in `src/tests/`
4. Update documentation

## Deployment

### Docker (Recommended)
```bash
# Build image
docker build -t memory-warehouse .

# Run container
docker run -p 3000:3000 --env-file .env memory-warehouse
```

### Manual Deployment
1. Set `NODE_ENV=production`
2. Run `npm start`
3. Use PM2 for process management

## Performance Considerations

- Vector similarity search is optimized with HNSW indexes
- Memory consolidation runs automatically to prevent bloat
- Caching strategies for frequently accessed memories
- Rate limiting to prevent abuse

## Security

- Input validation with Joi
- Rate limiting on API endpoints
- Helmet.js for security headers
- CORS configuration
- Environment variable protection

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For questions or issues:
- Create an issue in the repository
- Contact: career@toteminteractive.in

## Roadmap

- [ ] GraphQL API support
- [ ] Advanced visualization dashboard
- [ ] Multi-tenant support
- [ ] Memory versioning
- [ ] Advanced clustering algorithms
- [ ] Real-time collaboration features
