
export interface NavItem {
  title: string;
  href?: string;
  disabled?: boolean;
  external?: boolean;
  icon?: React.ElementType;
  label?: string;
  description?: string;
}

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
  | "rating" 
  | "date"
  | "email"
  | "number";

export interface FormFieldSchema {
  id: string;
  label: string;
  type: FormFieldType;
  required?: boolean;
  placeholder?: string;
  options?: FormFieldOption[]; // For select, radio, checkbox
  defaultValue?: string | string[] | number;
  description?: string; // Helper text for the field
}

export interface FormSchema {
  id: string;
  title: string;
  description?: string;
  fields: FormFieldSchema[];
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
  isAnonymous: boolean;
  teamId?: string; // To associate form with a team/owner
  // Add other form settings like theme, custom CSS, etc.
}

export interface FormResponse {
  id: string;
  formId: string;
  submittedAt: string; // ISO date string
  answers: Record<string, any>; // Key is fieldId
  userId?: string; // If not anonymous
  // Add user agent, IP (if not anonymous and GDPR compliant)
}

// New types for Smart Feedback Studio
export type UserRole = "Admin" | "Editor" | "Viewer"; // Owner role is implicit for account creator

export interface AppUser {
  id: string; // Firebase Auth UID
  email: string;
  name?: string;
  role: UserRole;
  teamId: string; // ID of the team/organization they belong to
  avatarUrl?: string;
  initials?: string;
  joinedDate?: string;
  // linkedAccounts?: string[]; // For future multi-account linking if needed
}

export type InviteStatus = "pending" | "accepted" | "expired" | "declined";

export interface Invite {
  id: string; // Firestore document ID
  email: string; // Email of the invited user
  role: UserRole; // Role to be assigned upon acceptance
  teamId: string; // Team the user is invited to
  invitedBy: string; // UID of the user who sent the invite
  status: InviteStatus;
  createdAt: string; // ISO date string
  expiresAt?: string; // ISO date string, optional
}
