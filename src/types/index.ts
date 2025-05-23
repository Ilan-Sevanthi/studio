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
  // Add other form settings like theme, custom CSS, etc.
}

export interface FormResponse {
  id: string;
  formId: string;
  submittedAt: string; // ISO date string
  answers: Record<string, any>; // Key is fieldId
  // Add user agent, IP (if not anonymous and GDPR compliant)
}
