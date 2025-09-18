# Memory Warehouse Setup Guide

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18.0.0 or higher
- **PostgreSQL** 15.0 or higher with pgvector extension
- **Docker** and **Docker Compose** (optional)
- **OpenAI API Key** (required for embeddings)

### 1. Clone and Install

```bash
git clone <repository-url>
cd totem-assignment
npm install
```

### 2. Environment Configuration

Copy the example environment file and configure:

```bash
cp env.example .env
```

Edit `.env` with your configuration:

```env
# Database Configuration
DATABASE_URL="postgresql://username:password@localhost:5432/memory_warehouse?schema=public"

# OpenAI Configuration (Required)
OPENAI_API_KEY="your_openai_api_key_here"

# Server Configuration
PORT=3000
HOST=localhost
PROTOCOL=http
NODE_ENV=development

# Memory Configuration
MEMORY_DECAY_RATE=0.01
SIMILARITY_THRESHOLD=0.3
MAX_MEMORY_AGE_DAYS=365

# Dashboard Configuration
DASHBOARD_REFRESH_INTERVAL=30000
MAX_NETWORK_NODES=100
MIN_NETWORK_SIMILARITY=0.3
ENABLE_REAL_TIME_DASHBOARD=false
DASHBOARD_THEME=light
```

### 3. Database Setup

#### Option A: Using Docker (Recommended)

```bash
# Start PostgreSQL with pgvector
docker-compose up -d

# Wait for database to be ready
sleep 10

# Run migrations
npm run db:migrate
```

#### Option B: Manual PostgreSQL Setup

1. Install PostgreSQL 15+
2. Install pgvector extension:
   ```sql
   CREATE EXTENSION vector;
   ```
3. Create database:
   ```sql
   CREATE DATABASE memory_warehouse;
   ```
4. Run migrations:
   ```bash
   npm run db:migrate
   ```

### 4. Start the Application

```bash
# Development mode
npm run dev

# Production mode
npm start
```

### 5. Access the Application

- **API**: http://localhost:3000/api/v1/docs
- **Dashboard**: http://localhost:3000
- **Health Check**: http://localhost:3000/health

## 🧪 Testing

### Run All Tests

```bash
# Run complete test suite
npm run test:all

# Generate test report
npm run test:report
```

### Individual Test Suites

```bash
# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# Watch mode
npm run test:watch
```

### Test Reports

After running tests, you'll find:
- `TEST_REPORT.html` - Interactive HTML report
- `TEST_REPORT.md` - Markdown report
- `test-report.json` - JSON data
- `coverage/` - Detailed coverage reports

## 🐳 Docker Deployment

### Build and Run

```bash
# Build Docker image
npm run docker:build

# Run with Docker Compose
npm run docker:run

# View logs
npm run docker:logs

# Stop services
npm run docker:stop
```

### Docker Compose Services

- **Application**: Node.js app on port 3000
- **PostgreSQL**: Database with pgvector on port 5432
- **pgAdmin**: Database management on port 5050

## 🔧 Development

### Code Quality

```bash
# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format
```

### Database Management

```bash
# Create new migration
npx prisma migrate dev --name migration_name

# Reset database
npm run db:reset

# Seed with sample data
npm run db:seed
```

### API Testing

Use the built-in API documentation at `/api/v1/docs` or test with curl:

```bash
# Health check
curl http://localhost:3000/health

# Create agent
curl -X POST http://localhost:3000/api/v1/agents \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Agent","description":"Test agent"}'

# Create memory
curl -X POST http://localhost:3000/api/v1/memories \
  -H "Content-Type: application/json" \
  -d '{"agentId":"AGENT_ID","content":"Test memory","type":"EPISODIC"}'
```

## 📊 Monitoring and Analytics

### Dashboard Features

- **Real-time Statistics**: Memory counts, agent activity
- **Network Visualization**: Interactive memory graph
- **Timeline View**: Memory creation over time
- **Analytics**: Performance metrics and insights

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/api/v1/agents` | List agents |
| POST | `/api/v1/agents` | Create agent |
| GET | `/api/v1/memories` | List memories |
| POST | `/api/v1/memories` | Create memory |
| POST | `/api/v1/memories/search` | Semantic search |
| GET | `/api/v1/analytics/metrics` | Get metrics |
| GET | `/api/v1/visualization/network` | Network data |

## 🔒 Security

### Environment Security

- Store sensitive data in `.env` file
- Never commit API keys to version control
- Use environment-specific configurations

### API Security

- Input validation with Joi schemas
- Rate limiting on all endpoints
- CORS configuration
- Security headers with Helmet.js

## 🚀 Production Deployment

### Environment Variables

Set these in your production environment:

```env
NODE_ENV=production
DATABASE_URL=your_production_database_url
OPENAI_API_KEY=your_production_openai_key
PORT=3000
HOST=0.0.0.0
```

### Performance Optimization

- Enable connection pooling
- Configure proper indexing
- Set up monitoring and logging
- Use a reverse proxy (nginx)

### Scaling Considerations

- Horizontal scaling with load balancer
- Database read replicas
- Caching layer (Redis)
- CDN for static assets

## 🐛 Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Check PostgreSQL is running
   - Verify DATABASE_URL format
   - Ensure pgvector extension is installed

2. **OpenAI API Errors**
   - Verify API key is valid
   - Check API quota and billing
   - Ensure network connectivity

3. **Memory Issues**
   - Check available RAM
   - Monitor Node.js heap usage
   - Consider increasing memory limits

4. **Test Failures**
   - Ensure test database is set up
   - Check environment variables
   - Verify all dependencies are installed

### Logs and Debugging

```bash
# View application logs
npm run docker:logs

# Debug mode
DEBUG=* npm run dev

# Check database connection
npx prisma db pull
```

## 📚 Additional Resources

- [API Documentation](./README.md#api-documentation)
- [Architecture Overview](./ARCHITECTURE.md)
- [Technical Report](./TECHNICAL_REPORT.md)
- [Test Report](./TEST_REPORT.html)

## 🤝 Support

For issues and questions:
1. Check the troubleshooting section
2. Review the test reports
3. Check GitHub issues
4. Contact the development team

---

**Happy coding! 🎉**
