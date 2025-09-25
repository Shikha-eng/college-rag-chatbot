# Multilingual RAG Chatbot for College

A comprehensive multilingual chatbot system that uses Retrieval-Augmented Generation (RAG) to answer college-related questions in multiple Indian languages with WhatsApp integration.

## 🌟 Features

- **Multilingual Support**: Hindi, English, Marathi, Marwari, Mewadi, and Dhundhari
- **Web Scraping**: Automatic extraction from college website, PDFs, and documents
- **Vector Database**: FAISS-based semantic search and retrieval
- **RAG Pipeline**: Advanced retrieval-augmented generation for accurate responses
- **WhatsApp Integration**: Two-way communication via Twilio WhatsApp API
- **Admin Dashboard**: Manual question handling and response management
- **Real-time Updates**: Scheduled scraping and instant messaging
- **Authentication**: Secure login for students and administrators

## 🏗️ Architecture

```
├── backend/                 # Node.js Express server
│   ├── models/             # MongoDB schemas
│   ├── routes/             # API endpoints
│   ├── services/           # Business logic
│   ├── middleware/         # Authentication & validation
│   └── utils/              # Helper functions
├── frontend/               # React application
│   ├── src/
│   │   ├── components/     # UI components
│   │   ├── pages/          # Application pages
│   │   ├── services/       # API calls
│   │   └── utils/          # Frontend utilities
├── scripts/                # Utility scripts
├── uploads/                # File storage
├── vector_store/           # FAISS embeddings
└── docs/                   # Documentation
```

## 🚀 Quick Start

### Prerequisites

- Node.js (v16+)
- MongoDB
- Python 3.8+ (for FAISS)
- OpenAI API key
- Twilio WhatsApp Business account

### Installation

1. **Clone and setup**:
   ```bash
   git clone <repository>
   cd college-rag-chatbot
   npm install
   ```

2. **Environment configuration**:
   ```bash
   cp .env.example .env
   # Edit .env with your API keys and configuration
   ```

3. **Install frontend dependencies**:
   ```bash
   cd frontend
   npm install
   cd ..
   ```

4. **Setup database**:
   ```bash
   npm run setup-db
   ```

5. **Start the application**:
   ```bash
   npm run dev  # Backend
   npm run client  # Frontend (new terminal)
   ```

## 📱 WhatsApp Setup

1. Create a Twilio account and get WhatsApp Business API access
2. Configure webhook URL: `https://your-domain.com/api/whatsapp/webhook`
3. Set environment variables in `.env`
4. Test the connection using the admin panel

## 🌐 Supported Languages

- **Hindi** (हिंदी)
- **English**
- **Marathi** (मराठी)
- **Marwari** (मारवाड़ी)
- **Mewadi** (मेवाड़ी)
- **Dhundhari** (ढूंढाड़ी)

## 🔧 Configuration

### College Website Scraping

Update `COLLEGE_WEBSITE_URL` in `.env` and configure scraping patterns in `scripts/scraper.js`.

### Vector Database

The system uses FAISS for vector storage with multilingual embeddings from `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2`.

### Admin Panel

Access at `http://localhost:3000/admin` with credentials from `.env`.

## 📊 API Endpoints

- `POST /api/auth/login` - User authentication
- `POST /api/chat/message` - Send message to chatbot
- `POST /api/admin/questions` - Get unanswered questions
- `POST /api/whatsapp/webhook` - WhatsApp webhook
- `GET /api/scrape/status` - Scraping status

## 🔒 Security

- JWT-based authentication
- Rate limiting
- Input validation
- CORS configuration
- Helmet security headers

## 📈 Monitoring

- Request logging
- Error tracking
- Performance metrics
- Usage analytics

## 🚀 Deployment

### Production Setup

1. **Environment**:
   ```bash
   NODE_ENV=production
   npm run build
   ```

2. **Database**: Use MongoDB Atlas for production
3. **Hosting**: Deploy on AWS/Heroku/DigitalOcean
4. **Domain**: Configure SSL certificate
5. **WhatsApp**: Update webhook URL

### Docker Deployment

```bash
docker build -t college-rag-chatbot .
docker run -p 5000:5000 college-rag-chatbot
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Create Pull Request

## 📝 License

MIT License - see LICENSE file for details

## 🆘 Support

For support and questions:
- Email: admin@college.edu
- Documentation: `/docs`
- Issues: GitHub Issues

---

**Note**: This is a comprehensive system requiring proper API keys and configuration. Please follow the setup guide carefully.