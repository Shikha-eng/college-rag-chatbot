# Render Deployment Guide

## 🚀 Deploy College RAG Chatbot to Render

This guide will help you deploy your PDF-based RAG chatbot system to Render.

### 📋 Prerequisites

1. **GitHub Repository**: Push your code to GitHub
2. **Render Account**: Create account at [render.com](https://render.com)
3. **MongoDB Atlas** (recommended): Set up cloud MongoDB database

### 🔧 Deployment Steps

#### 1. Prepare Your Repository

```bash
# Initialize git if not already done
git init
git add .
git commit -m "Initial commit - PDF RAG Chatbot"
git remote add origin YOUR_GITHUB_REPO_URL
git push -u origin main
```

#### 2. Environment Configuration

Create production environment variables in Render:

**Backend Environment Variables:**
- `NODE_ENV`: `production`
- `PORT`: `10000` (Render default)
- `MONGODB_URI`: Your MongoDB connection string
- `JWT_SECRET`: Generate a secure random string
- `CORS_ORIGIN`: `https://college-rag-chatbot-frontend.onrender.com`

**Optional (for full features):**
- `OPENAI_API_KEY`: Your OpenAI API key (system works without this)
- `TWILIO_ACCOUNT_SID`: For WhatsApp integration
- `TWILIO_AUTH_TOKEN`: For WhatsApp integration
- `TWILIO_PHONE_NUMBER`: For WhatsApp integration

**Frontend Environment Variables:**
- `REACT_APP_API_URL`: `https://college-rag-chatbot-backend.onrender.com`

#### 3. Deploy Using Render Dashboard

1. **Connect GitHub**: Link your GitHub repository
2. **Deploy Backend**:
   - Service Type: `Web Service`
   - Build Command: `cd backend && npm install`
   - Start Command: `cd backend && npm start`
   - Add environment variables
3. **Deploy Frontend**:
   - Service Type: `Static Site`
   - Build Command: `cd frontend && npm install && npm run build`
   - Publish Directory: `frontend/build`
   - Add environment variables

#### 4. Deploy Using render.yaml (Recommended)

Use the provided `render.yaml` file for Infrastructure as Code deployment:

1. Commit the `render.yaml` to your repository
2. In Render Dashboard, create "New Blueprint"
3. Connect your GitHub repository
4. Render will automatically create both services

### 📦 Database Setup Options

#### Option A: MongoDB Atlas (Recommended)
1. Create cluster at [mongodb.com/atlas](https://mongodb.com/atlas)
2. Get connection string
3. Add to `MONGODB_URI` environment variable

#### Option B: Render PostgreSQL + MongoDB Alternative
If you want to use PostgreSQL instead:
1. Add PostgreSQL database in Render
2. Modify models to use Sequelize/PostgreSQL
3. Update connection configuration

### 🔧 Production Configuration

The system includes these production optimizations:

#### Backend (`backend/server.js`):
- Environment-based PORT configuration
- Production CORS settings
- Health check endpoint at `/health`
- Error handling middleware
- Rate limiting for production

#### Frontend Build:
- Optimized React build
- Environment-based API URL configuration
- Static file serving

### 📊 Features Available in Production

✅ **Core Features** (Work immediately):
- PDF-based question answering (20 vectors from your PDF)
- Local vector database (no external APIs needed)
- Multilingual support (6 languages)
- User authentication and registration
- Real-time chat interface
- Admin question forwarding

🔧 **Optional Features** (Need API keys):
- OpenAI integration for enhanced answers
- WhatsApp integration via Twilio
- Advanced web scraping

### 🏃‍♂️ Quick Deploy Commands

```bash
# 1. Prepare repository
git add .
git commit -m "Ready for Render deployment"
git push origin main

# 2. Deploy will happen automatically once connected to Render
```

### 📱 Testing Your Deployment

After deployment:

1. **Backend Health Check**: 
   - Visit: `https://your-backend-url.onrender.com/health`
   - Should return: `{"status":"healthy","service":"College RAG Chatbot"}`

2. **Frontend Access**:
   - Visit: `https://your-frontend-url.onrender.com`
   - Register account and test PDF questions

3. **Test PDF Questions**:
   - "When are the mid-semester exams?" ✅
   - "What are exam dates in October?"
   - Try in Hindi: "exam कब हैं?"

### 🔍 Troubleshooting

**Common Issues:**
- **Build fails**: Check Node.js version compatibility
- **Database connection**: Verify MongoDB URI format
- **CORS errors**: Ensure frontend URL matches CORS_ORIGIN
- **Environment variables**: Double-check all required variables

**Logs Access:**
- Backend logs: Render Dashboard → Backend Service → Logs
- Build logs: Available during deployment process

### 📊 Performance Notes

**Render Free Tier:**
- Backend: Sleeps after 15 minutes of inactivity
- Database: 512MB storage limit
- Build time: May take 2-5 minutes
- Cold start: ~10-30 seconds after sleep

**Optimization Tips:**
- Keep services active with health check pings
- Consider upgrading to paid plan for production use
- Use MongoDB connection pooling

### 🔐 Security Considerations

- JWT secrets are auto-generated
- CORS properly configured
- Rate limiting enabled
- Input validation active
- MongoDB connection secured

Your PDF-based RAG chatbot will be fully functional on Render with all the features you've built! 🚀