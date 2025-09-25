// Sample data for Rizvi College to test vector database and regional language functionality
const mongoose = require('mongoose');
const Document = require('./models/Document');

// Sample Rizvi College content
const rizviCollegeData = [
  {
    title: "About Rizvi College of Engineering",
    content: "Rizvi College of Engineering is a premier engineering college located in Mumbai, Maharashtra, India. The college offers undergraduate and postgraduate courses in various engineering disciplines including Computer Engineering, Information Technology, Electronics and Telecommunications, Mechanical Engineering, and Civil Engineering. The college is affiliated with the University of Mumbai and approved by AICTE.",
    sourceUrl: "https://eng.rizvi.edu.in/about",
    contentType: "academic",
    source: "scraped"
  },
  {
    title: "Vision and Mission",
    content: "Vision: To be a center of excellence in technical education and research, contributing to the development of competent engineers and technologists. Mission: To provide quality education in engineering and technology, foster innovation and research, and develop professionals with strong ethical values and social responsibility.",
    sourceUrl: "https://eng.rizvi.edu.in/vision-mission",
    contentType: "policy",
    source: "scraped"
  },
  {
    title: "Departments and Courses",
    content: "The college offers the following courses: 1. Computer Engineering - 4-year BE degree focusing on programming, software development, data structures, algorithms, and computer networks. 2. Information Technology - Covers database systems, web development, cybersecurity, and IT project management. 3. Electronics and Telecommunications - Studies in signal processing, communication systems, embedded systems, and VLSI design. 4. Mechanical Engineering - Focuses on thermodynamics, manufacturing processes, machine design, and automotive engineering. 5. Civil Engineering - Covers structural engineering, construction management, environmental engineering, and transportation systems.",
    sourceUrl: "https://eng.rizvi.edu.in/departments",
    contentType: "academic",
    source: "scraped"
  },
  {
    title: "Admissions Process",
    content: "Admission to Rizvi College of Engineering is based on MHT-CET (Maharashtra Common Entrance Test) and JEE Main scores. The college participates in the Centralized Admission Process (CAP) conducted by the Directorate of Technical Education, Maharashtra. Eligibility: Candidates must have passed 12th standard with Physics, Chemistry, and Mathematics with minimum 50% marks. Important dates: Online application starts in June, counseling rounds conducted in July-August. Required documents: 10th and 12th mark sheets, MHT-CET/JEE scorecard, caste certificate (if applicable), domicile certificate.",
    sourceUrl: "https://eng.rizvi.edu.in/admission",
    contentType: "academic",
    source: "scraped"
  },
  {
    title: "Placement and Career Opportunities",
    content: "Rizvi College has an active Training and Placement Cell that works towards providing placement opportunities to students. Top recruiters include TCS, Infosys, Wipro, Accenture, L&T Infotech, Cognizant, and many other leading companies. The college maintains a strong placement record with over 80% students getting placed. Average package ranges from 3-6 LPA for freshers. The placement cell also conducts training programs, mock interviews, and skill development workshops to prepare students for corporate careers.",
    sourceUrl: "https://eng.rizvi.edu.in/placement",
    contentType: "academic", 
    source: "scraped"
  },
  {
    title: "College Facilities and Infrastructure",
    content: "Rizvi College of Engineering boasts modern infrastructure including well-equipped laboratories, computer centers with latest software, library with extensive collection of technical books and journals, seminar halls, auditorium, cafeteria, sports facilities, and hostel accommodation for outstation students. The campus has Wi-Fi connectivity, modern classrooms with audio-visual aids, and all necessary amenities for a conducive learning environment.",
    sourceUrl: "https://eng.rizvi.edu.in/facilities",
    contentType: "academic",
    source: "scraped"
  }
];

async function populateRizviData() {
  try {
    console.log('🌟 Starting Rizvi College data population...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/college-chatbot');
    console.log('✅ Connected to MongoDB');
    
    // Clear existing scraped documents
    await Document.deleteMany({ source: 'scraped' });
    console.log('🧹 Cleared existing scraped documents');
    
    // Insert sample data
    const documents = [];
    for (const data of rizviCollegeData) {
      const doc = new Document({
        ...data,
        status: 'processed',
        isActive: true,
        metadata: {
          wordCount: data.content.split(/\s+/).length,
          characterCount: data.content.length,
          scrapedAt: new Date()
        }
      });
      
      await doc.save();
      documents.push(doc);
      console.log(`💾 Created document: ${doc.title}`);
    }
    
    console.log(`✅ Successfully created ${documents.length} documents`);
    console.log('📊 Sample Rizvi College data populated successfully!');
    
    // Close connection
    await mongoose.connection.close();
    
  } catch (error) {
    console.error('❌ Error populating data:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  populateRizviData();
}

module.exports = { populateRizviData, rizviCollegeData };