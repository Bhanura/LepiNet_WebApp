# LepiNet Data Flow Documentation

## Overview
LepiNet is a butterfly identification and data collection platform that uses AI to help users identify butterflies and allows experts to review and verify submissions.

---

## 1. Entity Relationship Diagram

```mermaid
erDiagram
    AUTH_USERS ||--o{ USERS : extends
    AUTH_USERS ||--o{ SUBMISSIONS : creates
    AUTH_USERS ||--o{ AI_LOGS : generates
    AUTH_USERS ||--o{ EXPERT_REVIEWS : reviews
    AUTH_USERS ||--o{ REVIEW_COMMENTS : comments
    AUTH_USERS ||--o{ REVIEW_RATINGS : rates
    AUTH_USERS ||--o{ NOTIFICATIONS : receives
    AUTH_USERS ||--o{ USER_ACTIVITY_LOGS : logs
    
    USERS {
        uuid id PK
        text role "user, expert, admin"
        text verification_status
        text first_name
        text email
        text profession
    }
    
    SUBMISSIONS ||--o{ RECORDS : contains
    SUBMISSIONS {
        uuid checklist_id PK
        uuid user_id FK
        text checklist_name
        date submitted_date
    }
    
    RECORDS {
        uuid record_id PK
        uuid checklist_id FK
        text species_name
        integer species_count
        date recorded_date
        numeric location
    }
    
    AI_LOGS ||--o{ EXPERT_REVIEWS : reviewed_by
    AI_LOGS {
        uuid id PK
        uuid user_id FK
        text image_url
        text predicted_id
        double predicted_confidence
        text user_action "ACCEPTED, REJECTED"
        text final_species_name
    }
    
    EXPERT_REVIEWS ||--o{ REVIEW_COMMENTS : has
    EXPERT_REVIEWS ||--o{ REVIEW_RATINGS : has
    EXPERT_REVIEWS {
        uuid id PK
        uuid ai_log_id FK
        uuid reviewer_id FK
        boolean agreed_with_ai
        text identified_species_name
        text confidence_level
        boolean is_new_discovery
    }
    
    REVIEW_COMMENTS {
        uuid id PK
        uuid review_id FK
        uuid commenter_id FK
        text comment_text
    }
    
    REVIEW_RATINGS {
        uuid id PK
        uuid review_id FK
        uuid rater_id FK
        boolean is_helpful
    }
    
    SPECIES {
        text butterfly_id PK
        text species_name_binomial
        text family
        text common_name_english
        text status
    }
    
    NOTIFICATIONS {
        uuid id PK
        uuid user_id FK
        text type
        text message
        uuid related_id
    }
```

---

## 2. Core Data Flows

### 2.1 User Registration & Verification Flow

```mermaid
flowchart TD
    A[New User Signs Up] --> B[auth.users created]
    B --> C[public.users created]
    C --> D{User wants to be Expert?}
    D -->|Yes| E[Submit Expert Application]
    D -->|No| F[Role: 'user']
    E --> G[verification_status: 'pending']
    G --> H[Admin Reviews Application]
    H --> I{Approved?}
    I -->|Yes| J[role: 'expert'<br/>verification_status: 'verified']
    I -->|No| K[verification_status: 'rejected']
    J --> L[Notification sent]
    K --> L
    F --> M[Start using platform]
```

### 2.2 AI Identification Flow

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant API
    participant AI_Service
    participant Database
    participant Experts

    User->>Frontend: Upload butterfly image
    Frontend->>API: POST image
    API->>AI_Service: Request identification
    AI_Service-->>API: Returns prediction
    Note over API: predicted_id<br/>predicted_confidence
    API->>Database: Create ai_logs record
    API-->>Frontend: Show prediction
    Frontend-->>User: Display species + confidence
    
    alt User accepts prediction
        User->>Frontend: Accept
        Frontend->>API: Update ai_log
        API->>Database: user_action='ACCEPTED'<br/>final_species_name=predicted
    else User rejects prediction
        User->>Frontend: Reject
        Frontend->>API: Update ai_log
        API->>Database: user_action='REJECTED'
    end
    
    Note over Database,Experts: AI log now available<br/>for expert review
```

### 2.3 Manual Record Submission Flow

```mermaid
flowchart TD
    A[User creates checklist] --> B[Enter checklist details]
    B --> C[submissions table<br/>checklist_id created]
    C --> D[Add butterfly sighting]
    D --> E[Enter species details:<br/>- Species name<br/>- Count<br/>- Date/Time<br/>- Location]
    E --> F[records table<br/>record_id created]
    F --> G{Add more species?}
    G -->|Yes| D
    G -->|No| H[Submit checklist]
    H --> I[user_activity_logs<br/>activity_type='record_upload']
    I --> J[Checklist visible in dashboard]
```

### 2.4 Expert Review Flow

```mermaid
sequenceDiagram
    participant AI_Log as AI Logs
    participant Expert
    participant Review_DB as expert_reviews
    participant Comments as review_comments
    participant Ratings as review_ratings
    participant User
    participant Notifications

    Expert->>AI_Log: Browse pending reviews
    Expert->>AI_Log: Select AI log to review
    
    Expert->>Expert: Examine image & AI prediction
    
    alt Agree with AI
        Expert->>Review_DB: agreed_with_ai=true
    else Disagree with AI
        Expert->>Review_DB: agreed_with_ai=false<br/>identified_species_name=correct_species
    end
    
    Expert->>Review_DB: Add confidence_level<br/>Add comments<br/>Mark is_new_discovery
    
    Review_DB->>Notifications: Create notification<br/>type='review_comment'
    Notifications->>User: Notify original user
    
    Note over Comments: Other experts can comment
    Expert->>Comments: Add comment
    Comments->>Notifications: Notify review author
    
    Note over Ratings: Experts can rate reviews
    Expert->>Ratings: Mark as helpful/not helpful
```

---

## 3. User Role-Based Workflows

### 3.1 Regular User Workflow

```mermaid
flowchart LR
    A[Login] --> B{Choose Action}
    B --> C[Upload Image<br/>AI Identification]
    B --> D[Create Manual<br/>Checklist]
    B --> E[View My Records]
    B --> F[View Notifications]
    
    C --> G[ai_logs]
    D --> H[submissions<br/>+ records]
    E --> I[View submissions<br/>& records]
    F --> J[notifications]
    
    G --> K[Accept/Reject<br/>AI prediction]
    K --> L[Available for<br/>Expert Review]
```

### 3.2 Expert User Workflow

```mermaid
flowchart LR
    A[Login as Expert] --> B{Choose Action}
    B --> C[Everything<br/>Regular User Can Do]
    B --> D[Review AI Logs]
    B --> E[Comment on<br/>Other Reviews]
    B --> F[Rate Reviews]
    
    D --> G[Browse ai_logs<br/>without reviews]
    G --> H[Create<br/>expert_reviews]
    H --> I[user_activity_logs<br/>activity_type='review_submitted']
    
    E --> J[Add to<br/>review_comments]
    J --> K[user_activity_logs<br/>activity_type='comment_posted']
    
    F --> L[review_ratings]
```

### 3.3 Admin Workflow

```mermaid
flowchart TD
    A[Login as Admin] --> B{Admin Actions}
    B --> C[Review Expert<br/>Applications]
    B --> D[Manage Users]
    B --> E[View All Data]
    B --> F[System Management]
    
    C --> G[Check pending<br/>verification_status]
    G --> H{Approve?}
    H -->|Yes| I[Set role='expert'<br/>verification_status='verified']
    H -->|No| J[verification_status='rejected']
    I --> K[Send notification]
    J --> K
    
    D --> L[Change user roles]
    D --> M[Ban users]
    M --> N[verification_status='banned']
```

---

## 4. Data Relationships & Key Flows

### 4.1 Complete Identification Journey

```mermaid
flowchart TD
    Start[User uploads image] --> AI[AI Analysis]
    AI --> Log[ai_logs created<br/>- image_url<br/>- predicted_id<br/>- predicted_confidence]
    
    Log --> UserDecision{User Decision}
    UserDecision -->|Accept| Accept[user_action='ACCEPTED'<br/>final_species_name set]
    UserDecision -->|Reject| Reject[user_action='REJECTED'<br/>final_species_name empty]
    
    Accept --> Queue[Available for Expert Review]
    Reject --> Queue
    
    Queue --> Expert[Expert selects for review]
    Expert --> Review[expert_reviews created<br/>- agreed_with_ai<br/>- identified_species_name<br/>- confidence_level<br/>- is_new_discovery]
    
    Review --> Community{Community Interaction}
    Community --> Comments[Other experts comment<br/>review_comments]
    Community --> Ratings[Experts rate review<br/>review_ratings]
    
    Comments --> Notify1[Notifications sent]
    Ratings --> Notify2[Notifications sent]
    
    Review --> Activity[user_activity_logs<br/>activity_type='review_submitted']
```

### 4.2 Notification Triggers

```mermaid
flowchart TD
    A[Notification Types] --> B[review_comment]
    A --> C[verification_status]
    A --> D[role_change]
    
    B --> B1[Triggered when:<br/>- Expert reviews user's AI log<br/>- Someone comments on a review]
    C --> C1[Triggered when:<br/>- Expert application approved<br/>- Expert application rejected]
    D --> D1[Triggered when:<br/>- User promoted to expert<br/>- User role changed by admin]
    
    B1 --> E[notifications table]
    C1 --> E
    D1 --> E
    
    E --> F[User sees in dashboard<br/>is_read=false]
    F --> G[User reads notification<br/>is_read=true]
```

---

## 5. Data Access Patterns

### 5.1 Dashboard Queries

| User Role | Primary Queries |
|-----------|----------------|
| **User** | - My submissions (SUBMISSIONS + RECORDS)<br/>- My AI logs (AI_LOGS)<br/>- My notifications (NOTIFICATIONS)<br/>- Reviews on my submissions (EXPERT_REVIEWS) |
| **Expert** | - All of User queries<br/>- AI logs pending review (AI_LOGS without EXPERT_REVIEWS)<br/>- My expert reviews (EXPERT_REVIEWS)<br/>- Community comments (REVIEW_COMMENTS)<br/>- Review ratings (REVIEW_RATINGS) |
| **Admin** | - All users (USERS)<br/>- Pending expert applications (verification_status='pending')<br/>- All submissions statistics<br/>- System activity logs (USER_ACTIVITY_LOGS) |

### 5.2 Activity Tracking

```mermaid
flowchart LR
    A[User Actions] --> B[record_upload]
    A --> C[review_submitted]
    A --> D[comment_posted]
    
    B --> E[user_activity_logs<br/>related_id=checklist_id]
    C --> F[user_activity_logs<br/>related_id=review_id]
    D --> G[user_activity_logs<br/>related_id=comment_id]
    
    E --> H[Analytics Dashboard]
    F --> H
    G --> H
```

---

## 6. Data Integrity & Constraints

### 6.1 Role-Based Constraints

```mermaid
flowchart TD
    A[User Actions] --> B{Check user.role}
    
    B -->|user| C[Can:<br/>- Upload images<br/>- Create checklists<br/>- Accept/Reject AI predictions]
    
    B -->|expert| D[Can:<br/>- Everything user can do<br/>- Create expert_reviews<br/>- Add review_comments<br/>- Add review_ratings]
    
    B -->|admin| E[Can:<br/>- Everything expert can do<br/>- Approve/Reject experts<br/>- Change user roles<br/>- Ban users<br/>- View all data]
    
    C --> F{verification_status}
    D --> F
    E --> G[Full Access]
    
    F -->|banned| H[Access Denied]
    F -->|verified/none| I[Access Granted]
```

### 6.2 Data Validation Rules

| Table | Validation Rules |
|-------|-----------------|
| **users** | - role IN ('user', 'expert', 'admin')<br/>- verification_status IN ('none', 'pending', 'verified', 'rejected', 'banned') |
| **ai_logs** | - user_action IN ('ACCEPTED', 'REJECTED')<br/>- predicted_confidence: 0-1 range |
| **expert_reviews** | - confidence_level IN ('certain', 'uncertain')<br/>- reviewer_id must have role='expert' |
| **notifications** | - type IN ('review_comment', 'verification_status', 'role_change') |
| **user_activity_logs** | - activity_type IN ('record_upload', 'review_submitted', 'comment_posted') |

---

## 7. Complete System Flow

```mermaid
flowchart TD
    subgraph Registration
        R1[User Signs Up] --> R2[auth.users + users created]
        R2 --> R3{Expert Application?}
        R3 -->|Yes| R4[verification_status='pending']
        R3 -->|No| R5[role='user']
    end
    
    subgraph Data_Collection
        D1[Upload Image] --> D2[AI Processing]
        D2 --> D3[ai_logs created]
        D4[Create Checklist] --> D5[submissions created]
        D5 --> D6[Add records]
    end
    
    subgraph Expert_System
        E1[Expert Reviews AI Log] --> E2[expert_reviews created]
        E2 --> E3[Comments added]
        E2 --> E4[Ratings added]
        E3 --> E5[Notifications sent]
        E4 --> E5
    end
    
    subgraph Admin_Panel
        A1[Review Applications] --> A2[Update verification_status]
        A2 --> A3[Update role]
        A3 --> A4[Notifications sent]
    end
    
    subgraph Analytics
        AN1[user_activity_logs] --> AN2[Track uploads]
        AN1 --> AN3[Track reviews]
        AN1 --> AN4[Track comments]
        AN2 --> AN5[Dashboard metrics]
        AN3 --> AN5
        AN4 --> AN5
    end
    
    R5 --> Data_Collection
    R4 --> Admin_Panel
    A3 --> Expert_System
    D3 --> Expert_System
    Expert_System --> Analytics
    Data_Collection --> Analytics
```

---

## 8. Key Insights

### Primary Data Flows:
1. **User → AI_LOGS → EXPERT_REVIEWS → Community Feedback**
   - Image upload creates AI log
   - Experts review and verify
   - Community discusses through comments and ratings

2. **User → SUBMISSIONS → RECORDS**
   - Manual data entry
   - Structured checklist-based recording
   - Geographic and temporal data capture

3. **User → Expert Application → Admin Approval → Expert Role**
   - Verification workflow
   - Role-based access control

### Data Dependencies:
- All user data depends on `auth.users` (Supabase authentication)
- Expert reviews depend on AI logs
- Comments and ratings depend on expert reviews
- Notifications are triggered by various events across the system
- Activity logs track all major user actions

### Access Patterns:
- **Users**: Create and view own data
- **Experts**: Review community data, provide feedback
- **Admins**: Manage users and oversee system

