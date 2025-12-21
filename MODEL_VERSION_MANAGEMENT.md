# LepiNet Model Version Management Guide

## 📋 Table of Contents
1. [Logging Model Versions to Database](#1-logging-model-versions-to-database)
2. [Switching Between Model Versions](#2-switching-between-model-versions)
3. [Testing Model Performance](#3-testing-model-performance)
4. [Rollback Procedures](#4-rollback-procedures)

---

## 1. Logging Model Versions to Database

### 1.1 Database Schema Reference
The `model_versions` table structure:
```sql
CREATE TABLE public.model_versions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  version_name text NOT NULL,
  file_path text NOT NULL,
  training_image_count integer,
  accuracy_score double precision,
  is_active boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT model_versions_pkey PRIMARY KEY (id)
);
```

### 1.2 Add to trainer.py (End of Training Script)

Add this code at the **END** of your `trainer.py` after successful training:

```python
# trainer.py - Add at the end after model.save() or model.push_to_hub()

import os
from supabase import create_client, Client
from datetime import datetime

def log_model_version(
    version_name: str,
    file_path: str,
    training_image_count: int,
    accuracy_score: float,
    is_active: bool = False
):
    """
    Log trained model version to Supabase database
    
    Args:
        version_name: e.g., "v1.2.3" or "lepinet-model-2024-12-21"
        file_path: HuggingFace model path, e.g., "username/lepinet-model"
        training_image_count: Total images used in training
        accuracy_score: Final validation accuracy (0.0 to 1.0)
        is_active: Whether this should be the active model (default: False)
    """
    try:
        # Initialize Supabase client
        url = os.environ.get("SUPABASE_URL")
        key = os.environ.get("SUPABASE_SERVICE_KEY")  # Use SERVICE KEY, not ANON KEY
        
        if not url or not key:
            print("⚠️  Warning: SUPABASE_URL or SUPABASE_SERVICE_KEY not set. Skipping database logging.")
            return
        
        supabase: Client = create_client(url, key)
        
        # Insert model version
        data = {
            "version_name": version_name,
            "file_path": file_path,
            "training_image_count": training_image_count,
            "accuracy_score": accuracy_score,
            "is_active": is_active
        }
        
        response = supabase.table("model_versions").insert(data).execute()
        
        print(f"✅ Model version logged successfully!")
        print(f"   Version: {version_name}")
        print(f"   Accuracy: {accuracy_score:.4f}")
        print(f"   Images: {training_image_count}")
        print(f"   Path: {file_path}")
        
        return response.data
        
    except Exception as e:
        print(f"❌ Error logging model version: {str(e)}")
        print("   Training completed successfully, but database logging failed.")
        # Don't raise - training was successful, logging is optional
        return None


# ============================================
# EXAMPLE USAGE AT END OF trainer.py
# ============================================

if __name__ == "__main__":
    # ... your existing training code ...
    
    # After training completes
    final_accuracy = 0.9234  # Get from your validation results
    total_images = len(train_dataset)  # Get from your dataset
    model_name = "Bhanura/lepinet-model-v2"  # Your HuggingFace model path
    version_tag = "v2.0.0"  # Semantic versioning
    
    # Log to database
    log_model_version(
        version_name=version_tag,
        file_path=model_name,
        training_image_count=total_images,
        accuracy_score=final_accuracy,
        is_active=False  # Set True only when you want to activate it
    )
    
    print("\n🎉 Training pipeline completed!")
```

### 1.3 Required Environment Variables

Add to your training environment (Google Colab, local machine, etc.):

```bash
# Add to your .env or Colab secrets
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key_here  # NOT the anon key!
```

**⚠️ IMPORTANT**: Use `SUPABASE_SERVICE_KEY` (service role), NOT the public anon key, because:
- Service key bypasses RLS policies
- Allows writing to `model_versions` table from server-side scripts

### 1.4 Install Required Package

```bash
pip install supabase
```

---

## 2. Switching Between Model Versions

### 2.1 Understanding the Architecture

```
Mobile App → HuggingFace API → Active Model (determined by is_active flag)
                ↓
          Database checks which model is active
```

### 2.2 Activate a New Model Version

**Option A: Via Supabase Dashboard (Easiest)**

1. Go to Supabase Dashboard → Table Editor → `model_versions`
2. Find the old active model → Set `is_active` to `false`
3. Find the new model → Set `is_active` to `true`
4. Update your HuggingFace API endpoint to use the new model path

**Option B: Via SQL Query**

```sql
-- Step 1: Deactivate all models
UPDATE public.model_versions 
SET is_active = false;

-- Step 2: Activate the specific version you want
UPDATE public.model_versions 
SET is_active = true 
WHERE version_name = 'v2.0.0';  -- or use id

-- Step 3: Verify
SELECT version_name, file_path, accuracy_score, is_active, created_at
FROM public.model_versions
ORDER BY created_at DESC;
```

**Option C: Via Admin Dashboard (Recommended for Production)**

Create an admin page to manage model versions:

```tsx
// app/admin/models/page.tsx
'use client';
import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';

export default function ModelVersionsPage() {
  const [models, setModels] = useState<any[]>([]);
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    fetchModels();
  }, []);

  const fetchModels = async () => {
    const { data } = await supabase
      .from('model_versions')
      .select('*')
      .order('created_at', { ascending: false });
    setModels(data || []);
  };

  const activateModel = async (modelId: string) => {
    // Deactivate all
    await supabase
      .from('model_versions')
      .update({ is_active: false })
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Update all

    // Activate selected
    await supabase
      .from('model_versions')
      .update({ is_active: true })
      .eq('id', modelId);

    alert('Model activated! Update your HuggingFace endpoint accordingly.');
    fetchModels();
  };

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Model Version Management</h1>
      
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Version</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Path</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Accuracy</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Images</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {models.map(model => (
              <tr key={model.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {model.version_name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {model.file_path}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {(model.accuracy_score * 100).toFixed(2)}%
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {model.training_image_count?.toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {model.is_active ? (
                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                      ✓ Active
                    </span>
                  ) : (
                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                      Inactive
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(model.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {!model.is_active && (
                    <button
                      onClick={() => activateModel(model.id)}
                      className="text-blue-600 hover:text-blue-900 font-medium"
                    >
                      Activate
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 bg-yellow-50 border-l-4 border-yellow-400 p-4">
        <p className="text-sm text-yellow-700">
          <strong>⚠️ Important:</strong> After activating a model version here, you must also 
          update your HuggingFace API endpoint in your mobile app or backend to use the 
          corresponding model path.
        </p>
      </div>
    </div>
  );
}
```

### 2.3 Update HuggingFace API Endpoint

When switching models, update your inference code:

```python
# In your HuggingFace API or backend
def get_active_model_path():
    """Fetch the active model path from database"""
    supabase = create_client(url, key)
    result = supabase.table("model_versions")\
        .select("file_path")\
        .eq("is_active", True)\
        .single()\
        .execute()
    
    if result.data:
        return result.data["file_path"]
    else:
        # Fallback to default
        return "Bhanura/lepinet-model-default"

# Use it
model_path = get_active_model_path()
model = AutoModelForImageClassification.from_pretrained(model_path)
```

---

## 3. Testing Model Performance

### 3.1 Manual Testing Checklist

Create a test suite with known butterfly images:

```python
# test_model.py
import requests
from PIL import Image
import json

class ModelTester:
    def __init__(self, api_endpoint: str):
        self.api_endpoint = api_endpoint
        self.test_cases = []
    
    def add_test_case(self, image_path: str, expected_species_id: str, expected_name: str):
        """Add a test case with known correct answer"""
        self.test_cases.append({
            "image_path": image_path,
            "expected_id": expected_species_id,
            "expected_name": expected_name
        })
    
    def run_tests(self):
        """Run all test cases and calculate accuracy"""
        results = []
        correct = 0
        total = len(self.test_cases)
        
        print(f"\n🧪 Running {total} test cases...\n")
        
        for i, test in enumerate(self.test_cases, 1):
            print(f"Test {i}/{total}: {test['expected_name']}")
            
            # Send image to API
            with open(test['image_path'], 'rb') as f:
                files = {'image': f}
                response = requests.post(self.api_endpoint, files=files)
            
            if response.status_code == 200:
                result = response.json()
                predicted_id = result.get('predicted_id')
                predicted_name = result.get('predicted_name')
                confidence = result.get('confidence', 0)
                
                is_correct = (predicted_id == test['expected_id'])
                
                results.append({
                    "test_case": test['expected_name'],
                    "expected": test['expected_id'],
                    "predicted": predicted_id,
                    "predicted_name": predicted_name,
                    "confidence": confidence,
                    "correct": is_correct
                })
                
                if is_correct:
                    correct += 1
                    print(f"  ✅ PASS - Confidence: {confidence:.2%}")
                else:
                    print(f"  ❌ FAIL - Got: {predicted_name} ({confidence:.2%})")
            else:
                print(f"  ⚠️  API Error: {response.status_code}")
                results.append({
                    "test_case": test['expected_name'],
                    "error": response.status_code
                })
        
        accuracy = (correct / total) * 100
        
        print(f"\n{'='*60}")
        print(f"Test Results: {correct}/{total} passed ({accuracy:.2f}%)")
        print(f"{'='*60}\n")
        
        return results, accuracy

# Example usage
if __name__ == "__main__":
    tester = ModelTester("https://your-api-endpoint/predict")
    
    # Add test cases with images you're certain about
    tester.add_test_case(
        "test_images/common_mormon.jpg",
        "001",  # butterfly_id
        "Common Mormon"
    )
    tester.add_test_case(
        "test_images/blue_tiger.jpg",
        "045",
        "Blue Tiger"
    )
    tester.add_test_case(
        "test_images/common_jezebel.jpg",
        "023",
        "Common Jezebel"
    )
    
    results, accuracy = tester.run_tests()
    
    # Save results
    with open('test_results.json', 'w') as f:
        json.dump({
            "accuracy": accuracy,
            "results": results,
            "timestamp": datetime.now().isoformat()
        }, f, indent=2)
```

### 3.2 Automated Performance Monitoring

Add this table to track model performance over time:

```sql
-- Create performance tracking table
CREATE TABLE public.model_performance_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  model_version_id uuid REFERENCES public.model_versions(id),
  test_date timestamp with time zone DEFAULT now(),
  test_accuracy double precision,
  test_sample_size integer,
  notes text
);
```

### 3.3 Compare Before Deployment

```python
# compare_models.py
def compare_models(old_model_path: str, new_model_path: str, test_dataset):
    """Compare two models side-by-side"""
    
    print("Loading models...")
    old_model = load_model(old_model_path)
    new_model = load_model(new_model_path)
    
    old_results = evaluate_model(old_model, test_dataset)
    new_results = evaluate_model(new_model, test_dataset)
    
    print(f"\n{'='*60}")
    print(f"Model Comparison Results")
    print(f"{'='*60}")
    print(f"Old Model: {old_model_path}")
    print(f"  Accuracy: {old_results['accuracy']:.2%}")
    print(f"  Top-3 Accuracy: {old_results['top3_accuracy']:.2%}")
    print(f"\nNew Model: {new_model_path}")
    print(f"  Accuracy: {new_results['accuracy']:.2%}")
    print(f"  Top-3 Accuracy: {new_results['top3_accuracy']:.2%}")
    print(f"\nImprovement: {(new_results['accuracy'] - old_results['accuracy']):.2%}")
    print(f"{'='*60}\n")
    
    # Only recommend deployment if new model is better
    if new_results['accuracy'] > old_results['accuracy']:
        print("✅ New model performs better. Safe to deploy.")
        return True
    else:
        print("⚠️  New model doesn't improve performance. Consider not deploying.")
        return False
```

---

## 4. Rollback Procedures

### 4.1 Quick Rollback (Emergency)

If the new model is causing issues:

```sql
-- Find the previous active model
SELECT * FROM model_versions 
WHERE is_active = false 
ORDER BY created_at DESC 
LIMIT 5;

-- Deactivate current (problematic) model
UPDATE model_versions SET is_active = false WHERE is_active = true;

-- Activate previous stable version
UPDATE model_versions SET is_active = true WHERE id = '<previous-stable-version-id>';
```

### 4.2 Rollback Checklist

1. ✅ **Database**: Update `is_active` flag in `model_versions` table
2. ✅ **HuggingFace API**: Point to previous model path
3. ✅ **Mobile App**: If you hardcoded the model version, push app update
4. ✅ **Testing**: Run test suite against old model to confirm it works
5. ✅ **Monitoring**: Check that predictions are working correctly
6. ✅ **Documentation**: Log the rollback reason in `notes` field

### 4.3 Preventing Issues

**Best Practices:**
- ✅ Always test new models thoroughly before marking as active
- ✅ Keep at least 2-3 previous model versions available
- ✅ Use staging/production environments
- ✅ Monitor model performance metrics in production
- ✅ Have a test dataset that you can quickly run against any model

---

## 5. Complete Workflow Example

```bash
# Step 1: Train new model
python trainer.py  # This logs to model_versions automatically

# Step 2: Test the new model
python test_model.py --model-path "Bhanura/lepinet-model-v2"

# Step 3: Compare with current production model
python compare_models.py --old v1 --new v2

# Step 4: If tests pass, activate in database
# Use admin dashboard or SQL query

# Step 5: Update HuggingFace endpoint (if needed)
# Update your API configuration

# Step 6: Monitor in production
# Watch for any errors or accuracy drops

# Step 7: If issues arise, rollback immediately
# Use SQL or admin dashboard
```

---

## 6. Recommendations

1. **Always use semantic versioning**: v1.0.0, v1.1.0, v2.0.0
2. **Log everything**: Training logs, test results, deployment dates
3. **Automate testing**: Run automated tests before every deployment
4. **Monitor production**: Set up alerts for accuracy drops
5. **Keep old models**: Don't delete previous versions for at least 30 days
6. **Document changes**: Note what changed between versions (more data? different architecture?)

---

## 7. Quick Reference

| Task | Method |
|------|--------|
| Log new model | Add `log_model_version()` to end of trainer.py |
| Activate model | Update `is_active` in Supabase or use admin dashboard |
| Test model | Run `test_model.py` with known test cases |
| Rollback | Set previous model's `is_active = true` |
| Compare models | Use `compare_models.py` script |
| Monitor performance | Check `model_performance_logs` table |

---

**Need help?** Check the [DATA_FLOW_DOCUMENTATION.md](./DATA_FLOW_DOCUMENTATION.md) for how models integrate with the full system.
