# LepiNet Quick Start Guide

## 🚀 For Developers

### 1. Model Version Logging (trainer.py)

**Add to the END of your training script:**

```python
from supabase import create_client
import os

def log_model_version(version_name, file_path, image_count, accuracy):
    supabase = create_client(
        os.environ["SUPABASE_URL"],
        os.environ["SUPABASE_SERVICE_KEY"]
    )
    
    supabase.table("model_versions").insert({
        "version_name": version_name,
        "file_path": file_path,
        "training_image_count": image_count,
        "accuracy_score": accuracy,
        "is_active": False
    }).execute()
    
    print(f"✅ Logged model version: {version_name}")

# Call it after training
log_model_version("v2.0.0", "Bhanura/lepinet-model-v2", 5000, 0.9234)
```

**Required Environment Variables:**
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key
```

---

### 2. Switch Model Versions

**Option A: Supabase Dashboard**
1. Go to `model_versions` table
2. Set old model `is_active = false`
3. Set new model `is_active = true`

**Option B: SQL Query**
```sql
-- Deactivate all
UPDATE model_versions SET is_active = false;

-- Activate new version
UPDATE model_versions SET is_active = true 
WHERE version_name = 'v2.0.0';
```

**Option C: Admin Page** (Recommended)
- Go to `/admin/models` (create this page using the code in MODEL_VERSION_MANAGEMENT.md)

---

### 3. Test Model

**Quick Test Script:**

```python
# test_model.py
import requests

# Test cases with known correct answers
test_cases = [
    ("images/common_mormon.jpg", "001", "Common Mormon"),
    ("images/blue_tiger.jpg", "045", "Blue Tiger"),
]

for image_path, expected_id, expected_name in test_cases:
    # Send to HuggingFace
    with open(image_path, 'rb') as f:
        response = requests.post(
            "https://api-inference.huggingface.co/models/Bhanura/lepinet-model",
            files={"image": f}
        )
    
    result = response.json()
    predicted_id = result.get("predicted_id")
    
    if predicted_id == expected_id:
        print(f"✅ PASS: {expected_name}")
    else:
        print(f"❌ FAIL: Expected {expected_name}, got {result.get('predicted_name')}")
```

---

### 4. Rollback to Previous Version

**If new model has problems:**

```sql
-- Find previous stable version
SELECT * FROM model_versions 
WHERE is_active = false 
ORDER BY created_at DESC;

-- Activate it
UPDATE model_versions SET is_active = false WHERE is_active = true;
UPDATE model_versions SET is_active = true WHERE id = '<previous-version-id>';
```

---

## 📊 Data Flow Summary

### Image Upload & Identification Flow

```
1. 📱 Mobile App → User takes photo
2. 📤 Upload to Supabase Storage → Get image URL
3. 💾 Create ai_logs entry in database
4. 🔗 Send URL to HuggingFace API
5. 🤖 HuggingFace fetches image from URL
6. 🧠 AI Model processes image → Returns class index
7. 📋 Map class index to butterfly_id using CSV
8. 🦋 Lookup species details from CSV
9. 📱 Return result to mobile app
10. 💾 Update ai_logs with prediction
11. ✅ User accepts/rejects → Update user_action
```

### Expert Review Flow

```
1. 🌐 Expert views record on web portal
2. 📝 Expert submits review (agree/correct)
3. 💾 Insert into expert_reviews table
4. 🔔 Create notification for record owner
5. 📊 Admin marks review as "ready" for training
6. 🔄 Training script uses these reviews
7. 🎯 New model version created
8. ✅ Activate new model
9. 📱 Mobile app uses improved model
```

---

## 🔧 Key Files Reference

| File | Purpose |
|------|---------|
| `trainer.py` | Train model + log to database |
| `app/admin/training/page.tsx` | Manage training data |
| `app/admin/dashboard/page.tsx` | User & verification management |
| `MODEL_VERSION_MANAGEMENT.md` | Complete model versioning guide |
| `COMPLETE_DATA_FLOW.md` | Detailed data flow diagrams |
| `DATA_FLOW_DOCUMENTATION.md` | Database schema & flows |

---

## 🗄️ Database Tables Quick Reference

### `ai_logs` - User submissions
- `image_url` - Where image is stored
- `predicted_id` - AI's prediction (butterfly_id)
- `predicted_confidence` - How confident (0-1)
- `user_action` - User accepted/rejected?
- `final_species_name` - Final confirmed species

### `expert_reviews` - Expert opinions
- `ai_log_id` - Links to ai_logs
- `reviewer_id` - Which expert
- `agreed_with_ai` - true/false
- `identified_species_name` - Expert's answer
- `confidence_level` - certain/uncertain
- `training_status` - pending/ready/trained/ignored

### `model_versions` - Model tracking
- `version_name` - e.g., "v2.0.0"
- `file_path` - HuggingFace path
- `training_image_count` - How many images
- `accuracy_score` - Validation accuracy
- `is_active` - Currently deployed?

### `species` - Reference data
- `butterfly_id` - Primary key (e.g., "001")
- `common_name_english` - Display name
- `species_name_binomial` - Scientific name
- `family` - Taxonomic family

---

## 📱 Mobile App Endpoints

### Supabase Storage
```
POST /storage/v1/object/butterfly-images/
→ Upload image
← Returns: {url: "https://..."}
```

### HuggingFace API
```
POST https://api-inference.huggingface.co/models/{model-path}
Body: {image_url: "https://..."}
← Returns: {
    predicted_id: "001",
    predicted_name: "Common Mormon",
    confidence: 0.9234
  }
```

### Database Queries (via Supabase Client)
```javascript
// Create record
supabase.from('ai_logs').insert({
  user_id: userId,
  image_url: imageUrl
})

// Update with prediction
supabase.from('ai_logs').update({
  predicted_id: "001",
  predicted_confidence: 0.9234
}).eq('id', logId)

// Get species details
supabase.from('species').select('*')
  .eq('butterfly_id', '001')
  .single()
```

---

## ⚡ Quick Commands

```bash
# Install dependencies
pip install supabase

# Set environment variables
export SUPABASE_URL="https://xxx.supabase.co"
export SUPABASE_SERVICE_KEY="eyJ..."

# Run training
python trainer.py

# Test model
python test_model.py

# Start web app
npm run dev
```

---

## 🆘 Troubleshooting

### "Model not logging to database"
- ✅ Check SUPABASE_SERVICE_KEY is set (not anon key)
- ✅ Verify `supabase` package is installed
- ✅ Check RLS policies allow service key to write

### "New model not working"
- ✅ Verify `is_active = true` in database
- ✅ Check HuggingFace model path is correct
- ✅ Test with known images first
- ✅ Check model file actually uploaded to HuggingFace

### "Expert reviews not appearing"
- ✅ Check `expert_reviews` table for entries
- ✅ Verify foreign key `ai_log_id` matches
- ✅ Check RLS policies allow reading reviews
- ✅ Verify join queries include reviewer info

---

## 📚 Learn More

- [MODEL_VERSION_MANAGEMENT.md](./MODEL_VERSION_MANAGEMENT.md) - Complete versioning guide
- [COMPLETE_DATA_FLOW.md](./COMPLETE_DATA_FLOW.md) - Detailed architecture & diagrams
- [DATA_FLOW_DOCUMENTATION.md](./DATA_FLOW_DOCUMENTATION.md) - Database schema
- [SYSTEM_OVERVIEW.md](./SYSTEM_OVERVIEW.md) - System architecture

---

## 🎯 Checklist: Deploying New Model

- [ ] Train model with `trainer.py`
- [ ] Automatically logged to `model_versions` table
- [ ] Test with known images (`test_model.py`)
- [ ] Compare accuracy with current model
- [ ] If better: Set `is_active = true` in database
- [ ] Update HuggingFace endpoint (if path changed)
- [ ] Monitor predictions for 24 hours
- [ ] If problems: Rollback to previous version
- [ ] If stable: Mark as production-ready

---

**Last Updated:** December 21, 2024
