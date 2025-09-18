#!/bin/bash

# Memory Warehouse Deployment Script
echo "🚀 Starting Memory Warehouse deployment..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Creating from template..."
    cp env.example .env
    echo "📝 Please edit .env file with your configuration before running again."
    exit 1
fi

# Build and start services
echo "🔨 Building and starting services..."
docker-compose up --build -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 30

# Check if services are running
echo "🔍 Checking service health..."
if curl -f http://localhost:3000/health > /dev/null 2>&1; then
    echo "✅ Memory Warehouse API is running!"
    echo "🌐 API available at: http://localhost:3000"
    echo "📊 Dashboard available at: http://localhost:3000"
    echo "🔗 Health check: http://localhost:3000/health"
else
    echo "❌ Memory Warehouse API is not responding"
    echo "📋 Checking logs..."
    docker-compose logs api
    exit 1
fi

# Run database migrations
echo "🗄️  Running database migrations..."
docker-compose exec api npx prisma migrate deploy

# Generate Prisma client
echo "🔧 Generating Prisma client..."
docker-compose exec api npx prisma generate

# Seed database (optional)
read -p "🌱 Do you want to seed the database with sample data? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🌱 Seeding database..."
    docker-compose exec api npm run db:seed
fi

echo "🎉 Deployment completed successfully!"
echo ""
echo "📋 Useful commands:"
echo "  View logs: docker-compose logs -f"
echo "  Stop services: docker-compose down"
echo "  Restart services: docker-compose restart"
echo "  Access database: docker-compose exec postgres psql -U postgres -d memory_warehouse"
echo ""
echo "🔗 Access points:"
echo "  API: http://localhost:3000"
echo "  Dashboard: http://localhost:3000"
echo "  Health: http://localhost:3000/health"
