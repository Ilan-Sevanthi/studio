
"use client";

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription as ShadcnFormDescription } from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import type { FormSchema, FormFieldSchema as AppFormFieldSchema, FormResponse } from "@/types"; 
import { Star } from "lucide-react";

// Mock Data (replace with actual data fetching for the specific formId)
const mockForm: FormSchema = {
  id: "form_123_public",
  title: "Customer Satisfaction Survey Q3",
  description: "We value your feedback! Please take a few moments to tell us about your experience with our services during the third quarter. Your responses will help us improve.",
  fields: [
    { surveyId: "form_123_public", id: "q1_name", label: "Your Name (Optional)", type: "text", placeholder: "John Doe" },
    { surveyId: "form_123_public", id: "q1_email", label: "Your Email (Optional)", type: "email", placeholder: "john.doe@example.com" },
    { surveyId: "form_123_public", id: "q1_overall_sat", label: "Overall, how satisfied are you with our service?", type: "rating", required: true, options: [{value: "1", label:"1"}, {value: "2", label:"2"}, {value: "3", label:"3"}, {value: "4", label:"4"}, {value: "5", label:"5"}] },
    { surveyId: "form_123_public", id: "q2_recommend", label: "How likely are you to recommend our service to a friend or colleague?", type: "radio", required: true, options: [{value: "very_likely", label:"Very Likely"}, {value: "likely", label:"Likely"}, {value: "neutral", label:"Neutral"}, {value: "unlikely", label:"Unlikely"}, {value: "very_unlikely", label:"Very Unlikely"}] },
    { surveyId: "form_123_public", id: "q3_liked_most", label: "What did you like most about our service?", type: "textarea", placeholder: "Tell us what stood out..." },
    { surveyId: "form_123_public", id: "q4_improvement", label: "How can we improve our service?", type: "textarea", placeholder: "Your suggestions are valuable..." },
    { surveyId: "form_123_public", id: "q5_features", label: "Which features do you use most often? (Select all that apply)", type: "checkbox", options: [{value: "dashboard", label:"Dashboard"}, {value: "reporting", label:"Reporting"}, {value: "integration", label:"Integrations"}, {value: "support", label:"Support"}] },
    { surveyId: "form_123_public", id: "q6_contact_pref", label: "Preferred contact method for follow-up (if any):", type: "select", options: [{value: "email", label:"Email"}, {value: "phone", label:"Phone"}, {value: "no_contact", label:"No follow-up needed"}], placeholder: "Select a method" },
  ],
  createdBy: "user_abc",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  isAnonymous: false, 
  aiMode: "assisted_creation"
};


const generateZodSchema = (fields: AppFormFieldSchema[]) => {
  const shape: Record<string, z.ZodTypeAny> = {};
  fields.forEach(field => {
    let zodType: z.ZodTypeAny;
    switch (field.type) {
      case "text":
      case "textarea":
      case "radio": // Radio button group selection is a string
      case "select": // Select selection is a string
        zodType = z.string();
        if (field.required) zodType = zodType.min(1, `${field.label} is required.`);
        else zodType = zodType.optional().or(z.literal("")); 
        break;
      case "email":
        zodType = z.string();
        if (field.required) zodType = zodType.email({ message: `${field.label} must be a valid email.` });
        else zodType = zodType.email({ message: `${field.label} must be a valid email.` }).optional().or(z.literal(""));
        break;
      case "number":
        zodType = z.coerce.number({invalid_type_error: `${field.label} must be a number.`});
        if (field.required) zodType = zodType.min(field.minRating ?? -Infinity, `${field.label} is required.`);
        else zodType = zodType.optional();
        break;
      case "rating": 
        zodType = z.coerce.number({invalid_type_error: `${field.label} must be a number (rating).`});
        if (field.required) zodType = zodType.min(1, `${field.label} is required.`); 
        else zodType = zodType.optional();
        break;
      case "checkbox": // Assuming checkbox group returns an array of selected string values
        zodType = z.array(z.string()).optional();
        if (field.required) zodType = z.array(z.string()).min(1, `Please select at least one option for ${field.label}.`);
        break;
      case "date":
        zodType = z.string(); // Dates are typically strings from date pickers
        if (field.required) zodType = zodType.min(1, `${field.label} is required.`);
        else zodType = zodType.optional().or(z.literal(""));
        break;
      default:
        zodType = z.any().optional();
    }
    shape[field.id] = zodType;
  });
  return z.object(shape);
};

// Placeholder function for simulating backend call to save response
async function saveResponseToBackend(formId: string, responseData: Record<string, any>): Promise<FormResponse> {
  console.log(`Simulating saving response for form ${formId} to backend:`, responseData);
  // In a real app, this would call a Cloud Function or directly write to Firestore
  // to create a 'responses' document.
  await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay

  // For now, return a mock FormResponse object
  const createdResponse: FormResponse = {
    id: `resp_sim_${Date.now()}`,
    formId: formId,
    answers: responseData,
    timestamp: new Date().toISOString(),
    // userId: 'anonymous_or_actual_user_id', // If available
  };
  return createdResponse;
}


export default function RespondToFormPage({ params }: { params: { formId: string } }) {
  const { toast } = useToast();
  const [formSchema, setFormSchema] = useState<FormSchema | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dynamically create Zod schema and form instance
  const dynamicFormSchema = formSchema ? generateZodSchema(formSchema.fields) : z.object({});
  type DynamicFormValues = z.infer<typeof dynamicFormSchema>;
  
  const formHook = useForm<DynamicFormValues>({
    resolver: zodResolver(dynamicFormSchema),
    // Default values will be set/reset in useEffect when formSchema loads
  });
  
  useEffect(() => {
    // Simulate fetching form schema based on params.formId
    // In a real app, fetch from Firestore: doc(db, 'surveys', params.formId)
    console.log("Fetching form schema for ID:", params.formId); 
    setFormSchema(mockForm); // Using mockForm for now
    
    // Reset form with default values once schema is loaded/changed
    if (mockForm) { // Use the fetched form (mockForm here)
        const defaultValues = mockForm.fields.reduce((acc, field) => {
        acc[field.id] = field.type === 'checkbox' ? [] : field.type === 'rating' ? 0 : '';
        return acc;
        }, {} as Record<string, any>);
        formHook.reset(defaultValues);
    }
  }, [params.formId, formHook.reset]);

  if (!formSchema) {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4">
            <Card className="w-full max-w-2xl shadow-xl">
                <CardHeader>
                    <CardTitle className="text-2xl md:text-3xl text-center">Loading Form...</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                    <div className="animate-pulse space-y-4">
                        <div className="h-8 bg-muted rounded w-3/4 mx-auto"></div>
                        <div className="h-4 bg-muted rounded w-full mx-auto"></div>
                        <div className="h-4 bg-muted rounded w-5/6 mx-auto"></div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
  }

  async function onSubmit(data: DynamicFormValues) {
    setIsSubmitting(true);
    try {
      const savedResponse = await saveResponseToBackend(formSchema!.id, data);
      console.log("Form response saved (simulated):", savedResponse);
      toast({
        title: "Response Submitted!",
        description: "Thank you for your feedback.",
      });
      setIsSubmitted(true);
      formHook.reset(); 
    } catch (error) {
      console.error("Error submitting response:", error);
      toast({ title: "Submission Error", description: "Could not submit your response.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isSubmitted) {
    return (
      <Card className="w-full shadow-xl">
        <CardHeader className="text-center">
          <Star className="mx-auto h-16 w-16 text-accent mb-4" />
          <CardTitle className="text-2xl">Thank You!</CardTitle>
          <CardDescription>Your response has been successfully submitted.</CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p>We appreciate you taking the time to share your thoughts.</p>
        </CardContent>
        <CardFooter className="justify-center">
          <Button variant="outline" onClick={() => setIsSubmitted(false)}>Submit Another Response</Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl md:text-3xl">{formSchema.title}</CardTitle>
        {formSchema.description && <CardDescription className="text-base">{formSchema.description}</CardDescription>}
      </CardHeader>
      <Form {...formHook}>
        <form onSubmit={formHook.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            {formSchema.fields.map(field => (
              <FormField
                key={field.id}
                control={formHook.control}
                name={field.id as keyof DynamicFormValues}
                render={({ field: formFieldProps }) => (
                  <FormItem>
                    <FormLabel className="text-md font-semibold">{field.label} {field.required && <span className="text-destructive">*</span>}</FormLabel>
                    {field.description && <ShadcnFormDescription>{field.description}</ShadcnFormDescription>}
                    <FormControl>
                      <>
                        {field.type === "text" && <Input placeholder={field.placeholder} {...formFieldProps} disabled={isSubmitting} />}
                        {field.type === "email" && <Input type="email" placeholder={field.placeholder} {...formFieldProps} disabled={isSubmitting} />}
                        {field.type === "number" && <Input type="number" placeholder={field.placeholder} {...formFieldProps} disabled={isSubmitting} />}
                        {field.type === "textarea" && <Textarea placeholder={field.placeholder} {...formFieldProps} disabled={isSubmitting} />}
                        {field.type === "select" && (
                          <Select onValueChange={formFieldProps.onChange} defaultValue={formFieldProps.value as string | undefined} disabled={isSubmitting}>
                            <SelectTrigger><SelectValue placeholder={field.placeholder || "Select an option"} /></SelectTrigger>
                            <SelectContent>
                              {field.options?.map(option => (
                                <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                        {field.type === "radio" && (
                          <RadioGroup onValueChange={formFieldProps.onChange} defaultValue={formFieldProps.value as string | undefined} className="space-y-2" disabled={isSubmitting}>
                            {field.options?.map(option => (
                              <FormItem key={option.value} className="flex items-center space-x-3 space-y-0">
                                <FormControl><RadioGroupItem value={option.value} /></FormControl>
                                <FormLabel className="font-normal">{option.label}</FormLabel>
                              </FormItem>
                            ))}
                          </RadioGroup>
                        )}
                        {field.type === "checkbox" && (
                           <div className="space-y-2">
                            {field.options?.map((option) => (
                              <FormItem key={option.value} className="flex flex-row items-start space-x-3 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={(formFieldProps.value as string[])?.includes(option.value)}
                                    onCheckedChange={(checked) => {
                                      const currentValue = (formFieldProps.value as string[]) || [];
                                      if (checked) {
                                        formFieldProps.onChange([...currentValue, option.value]);
                                      } else {
                                        formFieldProps.onChange(currentValue.filter((v) => v !== option.value));
                                      }
                                    }}
                                    disabled={isSubmitting}
                                  />
                                </FormControl>
                                <FormLabel className="font-normal">{option.label}</FormLabel>
                              </FormItem>
                            ))}
                          </div>
                        )}
                        {field.type === "rating" && (
                           <div className="flex space-x-1">
                            {[1, 2, 3, 4, 5].map(starValue => (
                              <Button
                                key={starValue}
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => formFieldProps.onChange(starValue)}
                                className={(formFieldProps.value as number) >= starValue ? "text-accent" : "text-muted-foreground"}
                                disabled={isSubmitting}
                              >
                                <Star className="h-6 w-6" fill={(formFieldProps.value as number) >= starValue ? "currentColor" : "none"}/>
                              </Button>
                            ))}
                          </div>
                        )}
                        {/* TODO: Add date picker component if needed for "date" type */}
                         {field.type === "date" && <Input type="date" {...formFieldProps} disabled={isSubmitting} />}
                      </>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}
             {formSchema.isAnonymous && !formSchema.fields.some(f => f.type === 'email' || f.label.toLowerCase().includes('name')) && (
              <p className="text-sm text-muted-foreground italic mt-4">This form collects responses anonymously. Your personal information will not be recorded unless explicitly asked for in the questions above.</p>
            )}
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full md:w-auto" size="lg" disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Submit Response"}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
