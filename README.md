# LepiNet - Butterfly Identification & Citizen Science Platform

> AI-powered butterfly identification system with expert review capabilities for Sri Lanka's 245 butterfly species.

## 🦋 About LepiNet

LepiNet is a comprehensive ecosystem for butterfly observation, identification, and research consisting of:
- **Mobile App** (Flutter) - For field observations and instant AI identification
- **Web Portal** (Next.js) - For browsing records, expert reviews, and community engagement
- **Admin Dashboard** - For managing users, experts, and AI model training data
- **AI Model** (HuggingFace) - CNN-based butterfly species classification

## 📚 Documentation

### Quick Start
- **[QUICK_START_GUIDE.md](./QUICK_START_GUIDE.md)** - Get started in 5 minutes
- **[SYSTEM_OVERVIEW.md](./SYSTEM_OVERVIEW.md)** - System architecture and roles

### For Developers
- **[COMPLETE_DATA_FLOW.md](./COMPLETE_DATA_FLOW.md)** - Detailed data flow with diagrams
- **[SYSTEM_ARCHITECTURE_DIAGRAMS.md](./SYSTEM_ARCHITECTURE_DIAGRAMS.md)** - Visual architecture
- **[DATA_FLOW_DOCUMENTATION.md](./DATA_FLOW_DOCUMENTATION.md)** - Database schema & ER diagrams

### For ML Engineers
- **[MODEL_VERSION_MANAGEMENT.md](./MODEL_VERSION_MANAGEMENT.md)** - Model versioning, testing, deployment

## 🚀 Getting Started

### Prerequisites
```bash
Node.js 18+
npm or yarn
Supabase account
HuggingFace account (for AI model)
```

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/Bhanura/LepiNet.git
cd lepinet-web
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
# Create .env.local file
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. **Run development server**
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

## 🏗️ System Architecture

```
Mobile App (Flutter) ──┐
                       ├──► Supabase (Database + Storage) ──► HuggingFace AI Model
Web Portal (Next.js) ──┘
```

**Key Components:**
- **Supabase**: Authentication, PostgreSQL database, file storage
- **HuggingFace**: AI model hosting and inference API
- **Next.js**: Server-side rendering, API routes, dynamic pages

## 👥 User Roles

| Role | Access | Capabilities |
|------|--------|--------------|
| **User** | Mobile App, Web Portal | Upload observations, view records, receive AI predictions |
| **Expert** | Mobile App, Web Portal | All user features + review records, comment on reviews |
| **Admin** | Admin Dashboard | Manage users, verify experts, curate training data, manage models |

## 📊 Database Schema

**Main Tables:**
- `ai_logs` - User-uploaded butterfly observations with AI predictions
- `expert_reviews` - Expert opinions on observations
- `species` - 245 Sri Lankan butterfly species reference data
- `users` - User profiles with role-based access
- `model_versions` - AI model version tracking
- `notifications` - User notification system

See [DATA_FLOW_DOCUMENTATION.md](./DATA_FLOW_DOCUMENTATION.md) for complete schema.

## 🔄 Data Flow Example

```
1. 📱 User takes photo → Upload to Supabase Storage
2. 🔗 Image URL sent to HuggingFace API
3. 🤖 AI model identifies species → Returns butterfly_id + confidence
4. 💾 Result stored in ai_logs table
5. 📱 User sees result + species information
6. 👨‍🏫 Expert can review and correct if needed
7. 📊 Admin curates reviews for model retraining
8. 🔄 Improved model deployed for future predictions
```

See [COMPLETE_DATA_FLOW.md](./COMPLETE_DATA_FLOW.md) for detailed flow diagrams.

## 🛠️ Development

### Project Structure
```
lepinet-web/
├── app/
│   ├── admin/          # Admin dashboard pages
│   ├── api/            # API routes (e.g., watermark)
│   ├── dashboard/      # User/Expert dashboard
│   ├── records/        # Browse & view records
│   ├── review/         # Expert review pages
│   └── ...
├── components/         # Reusable React components
├── database/           # SQL migration scripts
├── public/             # Static assets
└── middleware.ts       # Authentication & route protection
```

### Key Pages
- `/` - Landing page
- `/dashboard` - User/Expert dashboard
- `/admin/dashboard` - Admin control panel
- `/admin/training` - Training data curation
- `/records` - Browse all butterfly observations
- `/records/[id]` - View record details with expert reviews
- `/review/[id]` - Expert review form

### Tech Stack
- **Framework**: Next.js 16 (React 19)
- **Styling**: Tailwind CSS 4
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Storage**: Supabase Storage
- **AI**: HuggingFace Inference API
- **Image Processing**: Sharp (for watermarking)
- **Language**: TypeScript

## 🧪 Testing the AI Model

```bash
# See MODEL_VERSION_MANAGEMENT.md for complete testing guide
python test_model.py --model-path "Bhanura/lepinet-model"
```

## 🔐 Security Features

- ✅ Row Level Security (RLS) policies on all tables
- ✅ JWT-based authentication via Supabase
- ✅ Role-based access control (middleware.ts)
- ✅ Image watermarking to protect user data
- ✅ Environment variable protection

## 📱 Mobile App Integration

The Flutter mobile app communicates with:
1. **Supabase** - For database queries and image uploads
2. **HuggingFace API** - For butterfly identification
3. **Web Portal** - Users can view their records online

Mobile app repository: [https://github.com/Bhanura/LepiNet.git](https://github.com/Bhanura/LepiNet.git)

## 🤖 AI Model Management

### Logging New Model Versions
```python
# Add to end of trainer.py
log_model_version(
    version_name="v2.0.0",
    file_path="Bhanura/lepinet-model-v2",
    training_image_count=5000,
    accuracy_score=0.9234
)
```

### Switching Model Versions
```sql
-- Activate new model
UPDATE model_versions SET is_active = false; -- Deactivate all
UPDATE model_versions SET is_active = true WHERE version_name = 'v2.0.0';
```

See [MODEL_VERSION_MANAGEMENT.md](./MODEL_VERSION_MANAGEMENT.md) for complete guide.

## 📈 Future Enhancements

- [ ] Real-time notifications via WebSockets
- [ ] Advanced search filters (date range, location, confidence)
- [ ] Butterfly distribution heat maps
- [ ] Export data for research (CSV, JSON)
- [ ] Mobile app push notifications
- [ ] Multi-language support (Sinhala, Tamil)
- [ ] Gamification (badges, leaderboards)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

**Bhanura**
- GitHub: [@Bhanura](https://github.com/Bhanura)
- Project: LepiNet - Butterfly Conservation Platform

## 🙏 Acknowledgments

- Butterfly species data from Sri Lankan biodiversity records
- HuggingFace for model hosting
- Supabase for backend infrastructure
- Next.js and Vercel for web framework

## 📞 Support

For issues or questions:
- Check the [documentation files](./QUICK_START_GUIDE.md)
- Open an issue on GitHub
- Review existing issues for solutions

---

**Last Updated:** December 21, 2024
