
export interface NavItem {
  title: string;
  href?: string;
  disabled?: boolean;
  external?: boolean;
  icon?: React.ElementType;
  label?: string;
  description?: string;
}

// --- User and Auth Related Types ---
export type UserRole = "Owner" | "Admin" | "Editor" | "Viewer"; // Added "Owner"

export interface AppUser { // Corresponds to 'users' collection
  id: string; // Firebase Auth UID
  email: string;
  name?: string;
  role: UserRole;
  teamId?: string; // ID of the primary team/account they belong to
  linkedAccountId?: string; // For multi-user access under one account
  avatarUrl?: string;
  initials?: string;
  joinedDate?: string; // ISO date string
}

export type InviteStatus = "pending" | "accepted" | "expired" | "declined";

export interface Invite { // Corresponds to 'invites' collection
  id: string; // Firestore document ID
  inviterId: string; // UID of the user who sent the invite
  inviteeEmail: string; // Email of the invited user
  status: InviteStatus;
  role: UserRole; // Role to be assigned upon acceptance
  teamId: string; // Team the user is invited to
  createdAt: string; // ISO date string
  expiresAt?: string; // ISO date string, optional
}


// --- Survey and Response Related Types ---
export interface FormFieldOption {
  label: string;
  value: string;
}

export type FormFieldType = 
  | "text" 
  | "textarea" 
  | "select" 
  | "radio" 
  | "checkbox" 
  | "rating" // e.g., 1-5 stars
  | "date"
  | "email"
  | "number"
  | "nps"; // Net Promoter Score (0-10 rating)

export interface QuestionSchema { // Corresponds to 'questions' collection (part of a survey)
  id: string; // Unique ID for the question
  surveyId: string;
  section?: string; // For multi-section surveys
  text: string; // The question itself
  type: FormFieldType;
  options?: FormFieldOption[]; // For select, radio, checkbox, nps (if custom labels needed)
  required?: boolean;
  placeholder?: string;
  description?: string; // Helper text for the field
  // `next` can be complex: string (next questionId), or logic-based (conditional branching)
  // For simplicity, we might handle branching logic in the form rendering component for now.
  next?: string | { conditionFieldId: string; conditionValue: any; nextQuestionId: string }[];
  // Fields for AI behavior
  minRating?: number; // For rating type
  maxRating?: number; // For rating type
  aiFollowUpEnabled?: boolean; // To trigger AI follow-up
}

export interface FormSchema { // Corresponds to 'surveys' collection
  id: string; // Firestore document ID
  title: string;
  description?: string;
  // `fields` array will now be a list of `QuestionSchema` if embedding questions, 
  // or questions will be a sub-collection. For this definition, let's assume embedded for simplicity
  // but in Firestore, questions might be a subcollection for scalability.
  fields: QuestionSchema[]; // Kept for compatibility with existing form builder
  // Or, if questions are a sub-collection:
  // questionOrder: string[]; // Array of question IDs to maintain order
  createdBy: string; // UID of the user who created the survey
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
  isAnonymous: boolean;
  teamId?: string; // To associate form with a team/owner
  aiMode?: "dynamic" | "assisted_creation" | "none"; // For AI features
  // Add other form settings like theme, custom CSS, etc.
}

// This is an alias for compatibility with current form builder, can be deprecated later
export type FormFieldSchema = QuestionSchema;

export interface FormResponse { // Corresponds to 'responses' collection
  id: string; // Firestore document ID
  userId?: string; // UID of the respondent (if not anonymous)
  surveyId: string;
  answers: Record<string, any>; // Key is questionId, value is the answer
  sentiment?: Record<string, number | string>; // Optional: sentiment score/label per question or overall
  timestamp: string; // ISO date string of submission
  // Potentially add: userAgent, ipAddress (handle privacy), completionTime
}
