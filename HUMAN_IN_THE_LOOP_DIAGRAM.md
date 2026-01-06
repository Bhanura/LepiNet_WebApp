# Human-in-the-Loop Verification Logic

## System Architecture Flowchart

```mermaid
flowchart TD
    Start([Image Upload]) --> AI[AI Model Prediction]
    AI --> Log[Create AI Log Entry]
    Log --> |Store in Database| AILogs[(ai_logs table)]
    
    AILogs --> |Image sent to| Expert[Expert Review]
    Expert --> Review{Expert Decision}
    
    Review --> |Creates| ExpertReview[(expert_reviews table)]
    
    ExpertReview --> Agreement{agreed_with_ai?}
    
    Agreement --> |TRUE| Golden[Mark as Golden Sample]
    Agreement --> |FALSE| Retrain[Flag for Retraining]
    
    Golden --> GoldenDB[(Golden Samples Dataset)]
    Retrain --> RetrainDB[(Retraining Queue)]
    
    GoldenDB --> ModelImprovement[Model Fine-tuning]
    RetrainDB --> ModelImprovement
    
    ModelImprovement --> UpdatedModel[Updated AI Model]
    UpdatedModel --> |Deployed| AI
    
    style AI fill:#4A90E2
    style Expert fill:#50C878
    style Golden fill:#FFD700
    style Retrain fill:#FF6B6B
    style ModelImprovement fill:#9B59B6
```

## Database Schema Relationships

```mermaid
erDiagram
    AI_LOGS ||--o{ EXPERT_REVIEWS : "reviewed_by"
    USERS ||--o{ EXPERT_REVIEWS : "creates"
    EXPERT_REVIEWS ||--|| RECORDS : "references"
    
    AI_LOGS {
        uuid id PK
        uuid record_id FK
        string predicted_species
        float confidence_score
        timestamp created_at
        jsonb prediction_metadata
    }
    
    EXPERT_REVIEWS {
        uuid id PK
        uuid ai_log_id FK "Links to AI prediction"
        uuid reviewer_id FK "Expert who reviewed"
        uuid record_id FK
        string expert_classification
        boolean agreed_with_ai "TRUE or FALSE"
        float confidence_level "Expert confidence"
        text comments
        timestamp created_at
    }
    
    USERS {
        uuid id PK
        string email
        string role "admin, expert, user"
    }
    
    RECORDS {
        uuid id PK
        string image_path
        string species
        string status
    }
```

## Feedback Loop Decision Tree

```mermaid
flowchart LR
    subgraph "Expert Review Process"
        A[AI Prediction] --> B[Expert Examines]
        B --> C{Agrees with AI?}
    end
    
    subgraph "Outcome: AGREED"
        C --> |agreed_with_ai = TRUE| D[High Quality Match]
        D --> E[Golden Sample ⭐]
        E --> F[Added to Training Set]
        F --> G[Reinforces Correct Patterns]
    end
    
    subgraph "Outcome: DISAGREED"
        C --> |agreed_with_ai = FALSE| H[AI Made Error]
        H --> I[Flagged for Retraining 🚩]
        I --> J[Added to Correction Dataset]
        J --> K[Helps Fix Model Weaknesses]
    end
    
    subgraph "Continuous Improvement"
        G --> L[Model Retraining]
        K --> L
        L --> M[Smarter AI Model]
        M --> |Next Prediction| A
    end
    
    style D fill:#90EE90
    style E fill:#FFD700
    style H fill:#FFB6C1
    style I fill:#FF6B6B
    style M fill:#87CEEB
```

## Data Flow Sequence

```mermaid
sequenceDiagram
    participant User
    participant AI as AI Model
    participant DB as Database
    participant Expert
    participant Training as Training Pipeline
    
    User->>AI: Upload Image
    AI->>AI: Predict Species
    AI->>DB: Save to ai_logs
    Note over DB: predicted_species<br/>confidence_score
    
    DB->>Expert: Notify for Review
    Expert->>Expert: Examine Image & AI Prediction
    
    alt Expert Agrees
        Expert->>DB: Save expert_reviews<br/>(agreed_with_ai = TRUE)
        DB->>Training: Add to Golden Samples
        Note over Training: ✅ Reinforces<br/>correct behavior
    else Expert Disagrees
        Expert->>DB: Save expert_reviews<br/>(agreed_with_ai = FALSE)
        DB->>Training: Add to Retraining Queue
        Note over Training: ⚠️ Corrects<br/>misclassification
    end
    
    Training->>AI: Update Model Weights
    Note over AI: Model becomes smarter<br/>over time
```

## Key Benefits of This System

### 🎯 **Automated Quality Control**
- Every AI prediction is linked to expert validation
- No manual CSV manipulation required
- Database automatically tracks agreement/disagreement

### 📊 **Confidence Tracking**
```mermaid
graph LR
    A[AI Confidence Score] --> C[Compare]
    B[Expert Confidence Level] --> C
    C --> D{Mismatch?}
    D --> |Yes| E[Investigate Model]
    D --> |No| F[Model Performing Well]
```

### 🔄 **Continuous Learning Loop**
1. **AI Predicts** → Logged with confidence
2. **Expert Reviews** → Agreement tracked
3. **Feedback Collected** → Golden samples vs corrections
4. **Model Retrained** → Incorporates expert knowledge
5. **Performance Improves** → Cycle repeats

### 📈 **Measurable Improvement**
```sql
-- Track model improvement over time
SELECT 
    DATE_TRUNC('month', created_at) as month,
    AVG(CASE WHEN agreed_with_ai THEN 1 ELSE 0 END) * 100 as agreement_percentage
FROM expert_reviews
GROUP BY month
ORDER BY month;
```

## Implementation Status

✅ **Database Schema** - expert_reviews table exists  
✅ **Foreign Keys** - Links to ai_logs and reviewer_id  
✅ **Agreement Tracking** - Boolean field captures expert decision  
✅ **Confidence Levels** - Both AI and expert confidence stored  
🔄 **Training Pipeline** - Ready for integration  

---

**Note**: This system eliminates manual data management and creates a self-improving AI system where every expert review directly contributes to model enhancement.
