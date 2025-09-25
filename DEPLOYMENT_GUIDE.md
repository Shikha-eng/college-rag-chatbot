# College RAG Chatbot - Complete Deployment Guide

A comprehensive multilingual RAG (Retrieval-Augmented Generation) chatbot system for colleges with web and WhatsApp integration, supporting Hindi, English, Marathi, Marwari, Mewadi, and Dhundhari languages.

## 🏗️ System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Databases     │
│   (React)       │◄──►│  (Node.js)      │◄──►│   (MongoDB)     │
│                 │    │                 │    │   (FAISS)       │
│   • Chat UI     │    │  • REST APIs    │    │                 │
│   • Admin Panel │    │  • RAG Pipeline │    │                 │
│   • Multi-lang  │    │  • WhatsApp Bot │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │  External APIs  │
                    │                 │
                    │ • OpenAI GPT    │
                    │ • Google Trans  │
                    │ • Twilio        │
                    │ • Hugging Face  │
                    └─────────────────┘
```

## 📋 Prerequisites

### System Requirements
- **Node.js**: v16.x or higher
- **npm**: v8.x or higher
- **MongoDB**: v5.x or higher
- **Python**: v3.8+ (for FAISS dependencies)
- **Git**: Latest version

### Hardware Requirements
- **Minimum**: 2GB RAM, 2 CPU cores, 20GB storage
- **Recommended**: 4GB RAM, 4 CPU cores, 50GB storage
- **Production**: 8GB RAM, 8 CPU cores, 100GB storage

### Operating System Support
- ✅ **Linux** (Ubuntu 20.04+, CentOS 8+)
- ✅ **macOS** (10.15+)
- ✅ **Windows** (10/11 with WSL2 recommended)

## 🔧 Installation Guide

### Step 1: Clone Repository

```bash
git clone https://github.com/yourusername/college-rag-chatbot.git
cd college-rag-chatbot
```

### Step 2: Install Dependencies

#### Backend Dependencies
```bash
cd backend
npm install

# Install Python dependencies for FAISS
pip install faiss-cpu sentence-transformers numpy
```

#### Frontend Dependencies
```bash
cd ../frontend
npm install
```

## ⚙️ Environment Configuration

### Backend Environment Variables

Create `backend/.env` file:

```env
# ======================
# SERVER CONFIGURATION
# ======================
NODE_ENV=production
PORT=5000
HOST=localhost

# ======================
# DATABASE CONFIGURATION
# ======================
MONGODB_URI=mongodb://localhost:27017/college-chatbot
MONGODB_OPTIONS=retryWrites=true&w=majority

# ======================
# AUTHENTICATION & SECURITY
# ======================
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
JWT_EXPIRES_IN=7d
BCRYPT_SALT_ROUNDS=12

# Session Configuration
SESSION_SECRET=your-session-secret-key
COOKIE_SECRET=your-cookie-secret-key

# ======================
# OPENAI CONFIGURATION
# ======================
OPENAI_API_KEY=sk-your-openai-api-key
OPENAI_MODEL=gpt-3.5-turbo
OPENAI_MAX_TOKENS=2000
OPENAI_TEMPERATURE=0.7

# ======================
# GOOGLE TRANSLATE API
# ======================
GOOGLE_TRANSLATE_API_KEY=your-google-translate-key
GOOGLE_PROJECT_ID=your-google-cloud-project-id

# ======================
# TWILIO WHATSAPP CONFIG
# ======================
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_WHATSAPP_NUMBER=+14155238886
TWILIO_WEBHOOK_URL=https://yourdomain.com/api/whatsapp/webhook

# ======================
# HUGGING FACE CONFIG
# ======================
HUGGINGFACE_API_KEY=your-huggingface-api-key
HUGGINGFACE_MODEL=sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2

# ======================
# EMAIL CONFIGURATION
# ======================
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
FROM_EMAIL=your-email@gmail.com
FROM_NAME=College Chatbot

# ======================
# FILE UPLOAD CONFIG
# ======================
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=pdf,doc,docx,txt

# ======================
# RATE LIMITING
# ======================
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_MESSAGE=Too many requests, please try again later

# ======================
# SCRAPING CONFIGURATION
# ======================
SCRAPING_ENABLED=true
SCRAPING_INTERVAL=86400000
SCRAPING_URLS=https://yourcollege.edu,https://yourcollege.edu/admissions
MAX_SCRAPING_DEPTH=3
SCRAPING_DELAY=1000

# ======================
# VECTOR DATABASE CONFIG
# ======================
VECTOR_DB_PATH=./data/vectors
EMBEDDING_DIMENSION=384
SIMILARITY_THRESHOLD=0.7
MAX_SEARCH_RESULTS=10

# ======================
# LOGGING CONFIGURATION
# ======================
LOG_LEVEL=info
LOG_FILE_PATH=./logs/app.log
LOG_MAX_SIZE=10485760
LOG_MAX_FILES=5

# ======================
# CORS CONFIGURATION
# ======================
CORS_ORIGIN=http://localhost:3000
CORS_METHODS=GET,POST,PUT,DELETE,OPTIONS
CORS_CREDENTIALS=true

# ======================
# PERFORMANCE TUNING
# ======================
CLUSTER_MODE=false
WORKER_PROCESSES=auto
MEMORY_LIMIT=1024
REQUEST_TIMEOUT=30000
```

### Frontend Environment Variables

Create `frontend/.env` file:

```env
# ======================
# REACT APP CONFIGURATION
# ======================
REACT_APP_API_URL=http://localhost:5000
REACT_APP_ENV=production
REACT_APP_VERSION=1.0.0

# ======================
# FEATURE FLAGS
# ======================
REACT_APP_ENABLE_WHATSAPP=true
REACT_APP_ENABLE_VOICE=false
REACT_APP_ENABLE_ANALYTICS=true
REACT_APP_ENABLE_FEEDBACK=true

# ======================
# ANALYTICS & MONITORING
# ======================
REACT_APP_GA_TRACKING_ID=G-XXXXXXXXXX
REACT_APP_HOTJAR_ID=your-hotjar-id
REACT_APP_SENTRY_DSN=your-sentry-dsn

# ======================
# UI/UX CONFIGURATION
# ======================
REACT_APP_DEFAULT_LANGUAGE=english
REACT_APP_THEME=light
REACT_APP_BRAND_NAME=College Chatbot
REACT_APP_SUPPORT_EMAIL=support@yourcollege.edu

# ======================
# PERFORMANCE
# ======================
GENERATE_SOURCEMAP=false
INLINE_RUNTIME_CHUNK=false
```

## 📊 Database Setup

### MongoDB Configuration

1. **Install MongoDB** (if not already installed):
```bash
# Ubuntu/Debian
sudo apt-get install -y mongodb

# macOS
brew install mongodb-community

# Windows
# Download from: https://www.mongodb.com/try/download/community
```

2. **Start MongoDB Service**:
```bash
sudo systemctl start mongod
sudo systemctl enable mongod
```

3. **Create Database and User**:
```bash
mongo
use college-chatbot
db.createUser({
  user: "chatbot_user",
  pwd: "secure_password",
  roles: [
    { role: "readWrite", db: "college-chatbot" }
  ]
})
```

4. **Initialize Collections**:
```javascript
// Users collection
db.users.createIndex({ email: 1 }, { unique: true })
db.users.createIndex({ createdAt: 1 })

// Conversations collection
db.conversations.createIndex({ userId: 1 })
db.conversations.createIndex({ updatedAt: -1 })

// Documents collection (for scraped content)
db.documents.createIndex({ url: 1 }, { unique: true })
db.documents.createIndex({ "vectorData.embedding": 1 })

// Admin questions collection
db.adminquestions.createIndex({ status: 1 })
db.adminquestions.createIndex({ createdAt: -1 })
```

### FAISS Vector Database Setup

```bash
# Create vector database directory
mkdir -p backend/data/vectors

# The FAISS index will be automatically created on first run
# Ensure proper permissions
chmod 755 backend/data/vectors
```

## 🤖 AI Service Configuration

### OpenAI Setup

1. **Get API Key**: Visit [OpenAI Platform](https://platform.openai.com/)
2. **Set Usage Limits**: Configure monthly spending limits
3. **Test Connection**:
```bash
curl -X POST https://api.openai.com/v1/chat/completions \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-3.5-turbo",
    "messages": [{"role": "user", "content": "Hello!"}],
    "max_tokens": 50
  }'
```

### Google Translate API Setup

1. **Create Project**: Go to [Google Cloud Console](https://console.cloud.google.com/)
2. **Enable API**: Enable Cloud Translation API
3. **Create Service Account**: Download JSON credentials
4. **Set Environment**:
```bash
export GOOGLE_APPLICATION_CREDENTIALS="path/to/credentials.json"
```

### Hugging Face Setup

1. **Create Account**: Visit [Hugging Face](https://huggingface.co/)
2. **Get Token**: Generate API token from settings
3. **Test Model**:
```bash
curl -X POST https://api-inference.huggingface.co/models/sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2 \
  -H "Authorization: Bearer $HUGGINGFACE_API_KEY" \
  -d '{"inputs": "Hello world"}'
```

## 📱 WhatsApp Integration Setup

### Twilio Configuration

1. **Create Twilio Account**: Visit [Twilio Console](https://console.twilio.com/)

2. **Enable WhatsApp Business API**:
   - Navigate to Messaging → Try it out → Send a WhatsApp message
   - Follow sandbox setup instructions

3. **Configure Webhook**:
   - Webhook URL: `https://yourdomain.com/api/whatsapp/webhook`
   - HTTP Method: POST

4. **Test WhatsApp Integration**:
```bash
# Send test message
curl -X POST https://api.twilio.com/2010-04-01/Accounts/$TWILIO_ACCOUNT_SID/Messages.json \
  -u $TWILIO_ACCOUNT_SID:$TWILIO_AUTH_TOKEN \
  -d "From=whatsapp:$TWILIO_WHATSAPP_NUMBER" \
  -d "To=whatsapp:+1234567890" \
  -d "Body=Hello from College Chatbot!"
```

### Webhook Security

```javascript
// backend/middleware/twilioAuth.js
const crypto = require('crypto');

const validateTwilioSignature = (req, res, next) => {
  const signature = req.headers['x-twilio-signature'];
  const url = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
  
  const expectedSignature = crypto
    .createHmac('sha1', process.env.TWILIO_AUTH_TOKEN)
    .update(Buffer.from(url + JSON.stringify(req.body), 'utf-8'))
    .digest('base64');
    
  if (signature !== expectedSignature) {
    return res.status(403).send('Forbidden');
  }
  
  next();
};
```

## 🚀 Deployment Options

### Option 1: Local Development

```bash
# Start MongoDB
sudo systemctl start mongod

# Start Backend (Terminal 1)
cd backend
npm run dev

# Start Frontend (Terminal 2)
cd frontend
npm start
```

Access application at `http://localhost:3000`

### Option 2: Production Server (Ubuntu)

#### Install Dependencies
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 for process management
sudo npm install -g pm2

# Install Nginx for reverse proxy
sudo apt install nginx -y
```

#### Deploy Backend
```bash
# Clone and build
git clone https://github.com/yourusername/college-rag-chatbot.git
cd college-rag-chatbot/backend
npm install --production

# Create PM2 ecosystem file
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'college-chatbot-backend',
    script: 'server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
EOF

# Start with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

#### Deploy Frontend
```bash
cd ../frontend
npm install
npm run build

# Copy build to Nginx directory
sudo cp -r build/* /var/www/html/
```

#### Configure Nginx
```bash
sudo tee /etc/nginx/sites-available/college-chatbot << EOF
server {
    listen 80;
    server_name yourdomain.com;
    
    # Frontend
    location / {
        root /var/www/html;
        try_files \$uri \$uri/ /index.html;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }
    
    # Backend API
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# Enable site and restart Nginx
sudo ln -s /etc/nginx/sites-available/college-chatbot /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Option 3: Docker Deployment

#### Docker Compose Configuration

```yaml
# docker-compose.yml
version: '3.8'

services:
  mongodb:
    image: mongo:5.0
    container_name: chatbot-mongodb
    restart: always
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_ROOT_PASSWORD}
      MONGO_INITDB_DATABASE: college-chatbot
    volumes:
      - mongodb_data:/data/db
      - ./mongodb-init.js:/docker-entrypoint-initdb.d/mongodb-init.js:ro
    ports:
      - "27017:27017"
    networks:
      - chatbot-network

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: chatbot-backend
    restart: always
    environment:
      NODE_ENV: production
      MONGODB_URI: mongodb://chatbot_user:${DB_PASSWORD}@mongodb:27017/college-chatbot
    env_file:
      - ./backend/.env
    volumes:
      - ./backend/data:/app/data
      - ./backend/logs:/app/logs
      - ./backend/uploads:/app/uploads
    ports:
      - "5000:5000"
    depends_on:
      - mongodb
    networks:
      - chatbot-network

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: chatbot-frontend
    restart: always
    environment:
      REACT_APP_API_URL: http://localhost:5000
    ports:
      - "3000:80"
    depends_on:
      - backend
    networks:
      - chatbot-network

  nginx:
    image: nginx:alpine
    container_name: chatbot-nginx
    restart: always
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      - frontend
      - backend
    networks:
      - chatbot-network

volumes:
  mongodb_data:

networks:
  chatbot-network:
    driver: bridge
```

#### Backend Dockerfile
```dockerfile
# backend/Dockerfile
FROM node:18-alpine

WORKDIR /app

# Install Python and FAISS dependencies
RUN apk add --no-cache python3 py3-pip build-base
RUN pip3 install faiss-cpu sentence-transformers numpy

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY . .

# Create necessary directories
RUN mkdir -p data/vectors logs uploads

# Set permissions
RUN chown -R node:node /app

USER node

EXPOSE 5000

CMD ["npm", "start"]
```

#### Frontend Dockerfile
```dockerfile
# frontend/Dockerfile
FROM node:18-alpine as builder

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine

COPY --from=builder /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

### Option 4: Cloud Deployment (AWS)

#### AWS Infrastructure Setup

```bash
# Install AWS CLI
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Configure AWS credentials
aws configure
```

#### Deploy to EC2

```bash
# Create EC2 instance
aws ec2 run-instances \
  --image-id ami-0c55b159cbfafe1d0 \
  --instance-type t3.medium \
  --key-name your-key-pair \
  --security-group-ids sg-xxxxxxxxx \
  --subnet-id subnet-xxxxxxxxx \
  --user-data file://user-data.sh

# Security Group Rules
aws ec2 authorize-security-group-ingress \
  --group-id sg-xxxxxxxxx \
  --protocol tcp \
  --port 80 \
  --cidr 0.0.0.0/0

aws ec2 authorize-security-group-ingress \
  --group-id sg-xxxxxxxxx \
  --protocol tcp \
  --port 443 \
  --cidr 0.0.0.0/0
```

#### Use MongoDB Atlas

```bash
# Connection string for MongoDB Atlas
MONGODB_URI="mongodb+srv://username:password@cluster.mongodb.net/college-chatbot?retryWrites=true&w=majority"
```

## 🔒 Security Configuration

### SSL/TLS Setup with Let's Encrypt

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Get SSL certificate
sudo certbot --nginx -d yourdomain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### Security Headers

```nginx
# Add to Nginx configuration
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "no-referrer-when-downgrade" always;
add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
```

### Environment Security

```bash
# Secure environment files
chmod 600 backend/.env frontend/.env
chown root:root backend/.env frontend/.env

# Use secrets management (production)
# AWS Secrets Manager, Azure Key Vault, etc.
```

## 📊 Monitoring & Logging

### Application Monitoring

```javascript
// backend/middleware/monitoring.js
const prometheus = require('prom-client');

// Create metrics
const httpRequestDuration = new prometheus.Histogram({
  name: 'http_request_duration_ms',
  help: 'HTTP request latency',
  labelNames: ['method', 'route', 'status']
});

const httpRequestTotal = new prometheus.Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status']
});

module.exports = { httpRequestDuration, httpRequestTotal };
```

### Log Configuration

```javascript
// backend/utils/logger.js
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error' 
    }),
    new winston.transports.File({ 
      filename: 'logs/combined.log' 
    }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});
```

### Health Checks

```javascript
// backend/routes/health.js
const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

router.get('/health', (req, res) => {
  const health = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    memory: process.memoryUsage(),
    env: process.env.NODE_ENV
  };
  
  res.status(200).json(health);
});

module.exports = router;
```

## 🔧 Troubleshooting Guide

### Common Issues

#### 1. MongoDB Connection Failed
```bash
# Check MongoDB status
sudo systemctl status mongod

# Check MongoDB logs
sudo journalctl -u mongod

# Test connection
mongo --host localhost --port 27017
```

**Solutions:**
- Ensure MongoDB is running: `sudo systemctl start mongod`
- Check connection string in `.env`
- Verify network connectivity
- Check firewall settings

#### 2. FAISS Installation Issues

**For Ubuntu/Debian:**
```bash
sudo apt-get install python3-dev build-essential
pip3 install --upgrade setuptools wheel
pip3 install faiss-cpu
```

**For macOS:**
```bash
brew install python@3.9
pip3 install faiss-cpu
```

**For Windows:**
```bash
# Use conda for easier installation
conda install faiss-cpu -c conda-forge
```

#### 3. OpenAI API Rate Limits

```javascript
// Implement exponential backoff
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function callOpenAIWithRetry(prompt, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }]
      });
    } catch (error) {
      if (error.status === 429) {
        await delay(Math.pow(2, i) * 1000); // Exponential backoff
        continue;
      }
      throw error;
    }
  }
  throw new Error('Max retries exceeded');
}
```

#### 4. WhatsApp Webhook Issues

**Debug webhook calls:**
```bash
# Test webhook locally with ngrok
npm install -g ngrok
ngrok http 5000

# Update Twilio webhook URL to ngrok URL
# https://xxxxxxxx.ngrok.io/api/whatsapp/webhook
```

**Common webhook problems:**
- HTTPS required for production webhooks
- Webhook signature validation failing
- Response timeout (respond within 20 seconds)

#### 5. Frontend Build Errors

```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Check for conflicting dependencies
npm ls
```

### Performance Optimization

#### Backend Optimization
```javascript
// Enable compression
const compression = require('compression');
app.use(compression());

// Connection pooling
mongoose.connect(mongoURI, {
  maxPoolSize: 10,
  bufferMaxEntries: 0,
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// Redis caching
const redis = require('redis');
const client = redis.createClient();

// Cache frequently accessed data
const cacheMiddleware = (duration) => {
  return async (req, res, next) => {
    const key = req.originalUrl;
    const cached = await client.get(key);
    
    if (cached) {
      return res.json(JSON.parse(cached));
    }
    
    res.sendResponse = res.json;
    res.json = (body) => {
      client.setex(key, duration, JSON.stringify(body));
      res.sendResponse(body);
    };
    
    next();
  };
};
```

#### Database Optimization
```javascript
// Create indexes for better query performance
db.conversations.createIndex({ userId: 1, updatedAt: -1 });
db.documents.createIndex({ "content": "text" });
db.users.createIndex({ email: 1 }, { unique: true });

// Aggregate pipelines for analytics
const getAnalytics = async (period) => {
  return await Conversation.aggregate([
    {
      $match: {
        createdAt: { $gte: new Date(Date.now() - period) }
      }
    },
    {
      $group: {
        _id: null,
        totalConversations: { $sum: 1 },
        avgMessagesPerConversation: { 
          $avg: { $size: "$messages" } 
        }
      }
    }
  ]);
};
```

## 📈 Scaling Considerations

### Horizontal Scaling

```yaml
# docker-compose.scale.yml
version: '3.8'

services:
  backend:
    deploy:
      replicas: 3
    environment:
      - NODE_ENV=production
    
  nginx:
    volumes:
      - ./nginx-lb.conf:/etc/nginx/nginx.conf:ro
```

```nginx
# nginx-lb.conf - Load balancer configuration
upstream backend {
    server backend:5000 weight=1 max_fails=3 fail_timeout=30s;
    server backend:5001 weight=1 max_fails=3 fail_timeout=30s;
    server backend:5002 weight=1 max_fails=3 fail_timeout=30s;
}

server {
    listen 80;
    
    location /api/ {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Database Scaling

```javascript
// MongoDB replica set configuration
const mongoose = require('mongoose');

// Connect to replica set
mongoose.connect('mongodb://localhost:27017,localhost:27018,localhost:27019/college-chatbot?replicaSet=rs0', {
  readPreference: 'secondaryPreferred',
  maxPoolSize: 20,
  bufferMaxEntries: 0
});

// Read from secondary for analytics queries
const analyticsQuery = await Model.find({}).read('secondary');
```

## 📞 Support & Maintenance

### Regular Maintenance Tasks

```bash
#!/bin/bash
# maintenance.sh - Run daily maintenance tasks

# 1. Backup database
mongodump --uri="$MONGODB_URI" --out="/backups/$(date +%Y%m%d)"

# 2. Clean up old logs
find ./logs -name "*.log" -mtime +30 -delete

# 3. Update vector database index
curl -X POST http://localhost:5000/api/admin/reindex-vectors

# 4. Check system health
curl -f http://localhost:5000/health || echo "Health check failed"

# 5. Update SSL certificates
certbot renew --quiet
```

### Monitoring Alerts

```javascript
// alerts/healthCheck.js
const nodemailer = require('nodemailer');

const checkSystemHealth = async () => {
  const checks = [
    { name: 'MongoDB', check: () => mongoose.connection.readyState === 1 },
    { name: 'OpenAI API', check: () => testOpenAIConnection() },
    { name: 'Disk Space', check: () => checkDiskSpace() > 10 }, // 10% free
    { name: 'Memory Usage', check: () => process.memoryUsage().heapUsed < 1024 * 1024 * 1024 } // 1GB
  ];

  const failures = [];
  for (const check of checks) {
    try {
      if (!await check.check()) {
        failures.push(check.name);
      }
    } catch (error) {
      failures.push(`${check.name}: ${error.message}`);
    }
  }

  if (failures.length > 0) {
    await sendAlert(`System Health Alert: ${failures.join(', ')}`);
  }
};

// Run health checks every 5 minutes
setInterval(checkSystemHealth, 5 * 60 * 1000);
```

## 🎯 Performance Benchmarks

### Expected Performance Metrics

| Metric | Development | Production |
|--------|-------------|------------|
| Response Time | < 2s | < 1s |
| Concurrent Users | 10-50 | 500-1000 |
| Messages/Hour | 1,000 | 10,000+ |
| Database Queries/s | 100 | 1,000+ |
| Memory Usage | < 512MB | < 2GB |
| CPU Usage | < 50% | < 70% |

### Load Testing

```bash
# Install Artillery.js
npm install -g artillery

# Create load test configuration
cat > loadtest.yml << EOF
config:
  target: 'http://localhost:5000'
  phases:
    - duration: 60
      arrivalRate: 10
      name: Warm up
    - duration: 300
      arrivalRate: 50
      name: Load test

scenarios:
  - name: Chat API
    requests:
      - post:
          url: '/api/chat/message'
          headers:
            Authorization: 'Bearer {{ token }}'
          json:
            message: 'Hello, how are you?'
            language: 'english'
EOF

# Run load test
artillery run loadtest.yml
```

## 📝 API Documentation

### Authentication Endpoints

```javascript
/**
 * @api {post} /api/auth/register Register User
 * @apiName RegisterUser
 * @apiGroup Authentication
 * 
 * @apiParam {String} name User's full name
 * @apiParam {String} email User's email address
 * @apiParam {String} password User's password (min 6 chars)
 * @apiParam {String} role User role: 'student' or 'admin'
 * 
 * @apiSuccess {String} token JWT authentication token
 * @apiSuccess {Object} user User object
 */

/**
 * @api {post} /api/auth/login Login User
 * @apiName LoginUser
 * @apiGroup Authentication
 * 
 * @apiParam {String} email User's email address
 * @apiParam {String} password User's password
 * 
 * @apiSuccess {String} token JWT authentication token
 * @apiSuccess {Object} user User object
 */
```

### Chat Endpoints

```javascript
/**
 * @api {post} /api/chat/message Send Message
 * @apiName SendMessage
 * @apiGroup Chat
 * @apiPermission authenticated
 * 
 * @apiHeader {String} Authorization Bearer token
 * 
 * @apiParam {String} message User's message
 * @apiParam {String} language Message language
 * @apiParam {String} [conversationId] Existing conversation ID
 * 
 * @apiSuccess {String} response Bot's response
 * @apiSuccess {Number} confidence Response confidence score
 * @apiSuccess {Array} sources Information sources used
 * @apiSuccess {String} conversationId Conversation ID
 */
```

---

## 🎉 Conclusion

You now have a complete deployment guide for the College RAG Chatbot system! This comprehensive setup supports:

- ✅ **6 Languages**: Hindi, English, Marathi, Marwari, Mewadi, Dhundhari
- ✅ **Multiple Interfaces**: Web chat + WhatsApp integration
- ✅ **AI-Powered**: RAG pipeline with OpenAI GPT-3.5-turbo
- ✅ **Scalable Architecture**: Ready for production deployment
- ✅ **Admin Dashboard**: Complete management interface
- ✅ **Security**: JWT auth, rate limiting, input validation
- ✅ **Monitoring**: Health checks, logging, analytics

### Quick Start Commands

```bash
# Development
git clone https://github.com/yourusername/college-rag-chatbot.git
cd college-rag-chatbot
cp backend/.env.example backend/.env  # Configure your API keys
cp frontend/.env.example frontend/.env
npm run install:all
npm run dev

# Production with Docker
docker-compose up -d

# Production on server
pm2 start ecosystem.config.js
```

### Support

- 📧 **Email**: support@yourcollege.edu
- 📚 **Documentation**: `/docs` endpoint when running
- 🐛 **Issues**: GitHub Issues page
- 💬 **Community**: Discord/Slack channel

**Happy Deploying! 🚀**