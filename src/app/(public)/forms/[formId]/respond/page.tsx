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
import type { FormSchema, FormFieldSchema as AppFormFieldSchema } from "@/types"; // Renamed to avoid conflict
import { Star } from "lucide-react";

// Mock Data (replace with actual data fetching for the specific formId)
const mockForm: FormSchema = {
  id: "form_123_public",
  title: "Customer Satisfaction Survey Q3",
  description: "We value your feedback! Please take a few moments to tell us about your experience with our services during the third quarter. Your responses will help us improve.",
  fields: [
    { id: "q1_name", label: "Your Name (Optional)", type: "text", placeholder: "John Doe" },
    { id: "q1_email", label: "Your Email (Optional)", type: "email", placeholder: "john.doe@example.com" },
    { id: "q1_overall_sat", label: "Overall, how satisfied are you with our service?", type: "rating", required: true, options: [{value: "1", label:"1"}, {value: "2", label:"2"}, {value: "3", label:"3"}, {value: "4", label:"4"}, {value: "5", label:"5"}] },
    { id: "q2_recommend", label: "How likely are you to recommend our service to a friend or colleague?", type: "radio", required: true, options: [{value: "very_likely", label:"Very Likely"}, {value: "likely", label:"Likely"}, {value: "neutral", label:"Neutral"}, {value: "unlikely", label:"Unlikely"}, {value: "very_unlikely", label:"Very Unlikely"}] },
    { id: "q3_liked_most", label: "What did you like most about our service?", type: "textarea", placeholder: "Tell us what stood out..." },
    { id: "q4_improvement", label: "How can we improve our service?", type: "textarea", placeholder: "Your suggestions are valuable..." },
    { id: "q5_features", label: "Which features do you use most often? (Select all that apply)", type: "checkbox", options: [{value: "dashboard", label:"Dashboard"}, {value: "reporting", label:"Reporting"}, {value: "integration", label:"Integrations"}, {value: "support", label:"Support"}] },
    { id: "q6_contact_pref", label: "Preferred contact method for follow-up (if any):", type: "select", options: [{value: "email", label:"Email"}, {value: "phone", label:"Phone"}, {value: "no_contact", label:"No follow-up needed"}], placeholder: "Select a method" },
  ],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  isAnonymous: false, // If true, name/email fields might be omitted or marked as not stored
};


const generateZodSchema = (fields: AppFormFieldSchema[]) => {
  const shape: Record<string, z.ZodTypeAny> = {};
  fields.forEach(field => {
    let zodType: z.ZodTypeAny;
    switch (field.type) {
      case "text":
      case "textarea":
      case "radio":
      case "select":
        zodType = z.string();
        if (field.required) zodType = zodType.min(1, `${field.label} is required.`);
        else zodType = zodType.optional().or(z.literal("")); // Allow empty string for optional
        break;
      case "email":
        zodType = z.string();
        if (field.required) zodType = zodType.email(`${field.label} must be a valid email.`);
        else zodType = zodType.email(`${field.label} must be a valid email.`).optional().or(z.literal(""));
        break;
      case "number":
      case "rating": // Rating is often a number
        zodType = z.coerce.number(); // Coerce to number
        if (field.required) zodType = zodType.min(1, `${field.label} is required.`); // Assuming rating starts at 1
        else zodType = zodType.optional();
        break;
      case "checkbox":
        // For single checkbox, it's boolean. For multiple, it's an array of strings.
        // This simplified example assumes multiple checkboxes can be an array of strings if needed.
        // For a single checkbox (e.g. agree to terms), you'd use z.boolean().refine(val => val === true).
        // For a group, use z.array(z.string()).optional() or .min(1) if required.
        zodType = z.array(z.string()).optional();
        if (field.required) zodType = z.array(z.string()).min(1, `Please select at least one option for ${field.label}.`);
        break;
      case "date":
        zodType = z.string(); // Dates are typically strings from date pickers
        if (field.required) zodType = zodType.min(1, `${field.label} is required.`);
        else zodType = zodType.optional();
        break;
      default:
        zodType = z.any().optional();
    }
    shape[field.id] = zodType;
  });
  return z.object(shape);
};


export default function RespondToFormPage({ params }: { params: { formId: string } }) {
  const { toast } = useToast();
  const [formSchema, setFormSchema] = useState<FormSchema | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Dynamically create Zod schema and form instance
  const dynamicFormSchema = formSchema ? generateZodSchema(formSchema.fields) : z.object({});
  type DynamicFormValues = z.infer<typeof dynamicFormSchema>;
  
  const formHook = useForm<DynamicFormValues>({
    resolver: zodResolver(dynamicFormSchema),
    defaultValues: formSchema?.fields.reduce((acc, field) => {
      acc[field.id] = field.type === 'checkbox' ? [] : field.type === 'rating' ? 0 : '';
      return acc;
    }, {} as Record<string, any>)
  });
  
  useEffect(() => {
    // Simulate fetching form schema based on params.formId
    setFormSchema(mockForm);
    // Reset form with default values once schema is loaded
    formHook.reset(mockForm.fields.reduce((acc, field) => {
      acc[field.id] = field.type === 'checkbox' ? [] : field.type === 'rating' ? 0 : '';
      return acc;
    }, {} as Record<string, any>));
  }, [params.formId, formHook.reset]); // Added formHook.reset dependency

  if (!formSchema) {
    return <div className="flex items-center justify-center h-full"><p>Loading form...</p></div>;
  }

  function onSubmit(data: DynamicFormValues) {
    console.log("Form submission data:", data);
    // Handle form submission logic (e.g., send to backend)
    toast({
      title: "Response Submitted!",
      description: "Thank you for your feedback.",
    });
    setIsSubmitted(true);
    formHook.reset(); // Reset form after submission
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
          <Button variant="outline" onClick={() => setIsSubmitted(false)}>Submit Another Response (Test)</Button>
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
                name={field.id as keyof DynamicFormValues} // Type assertion
                render={({ field: formFieldProps }) => (
                  <FormItem>
                    <FormLabel className="text-md font-semibold">{field.label} {field.required && <span className="text-destructive">*</span>}</FormLabel>
                    {field.description && <ShadcnFormDescription>{field.description}</ShadcnFormDescription>}
                    <FormControl>
                      <>
                        {field.type === "text" && <Input placeholder={field.placeholder} {...formFieldProps} />}
                        {field.type === "email" && <Input type="email" placeholder={field.placeholder} {...formFieldProps} />}
                        {field.type === "number" && <Input type="number" placeholder={field.placeholder} {...formFieldProps} />}
                        {field.type === "textarea" && <Textarea placeholder={field.placeholder} {...formFieldProps} />}
                        {field.type === "select" && (
                          <Select onValueChange={formFieldProps.onChange} defaultValue={formFieldProps.value}>
                            <SelectTrigger><SelectValue placeholder={field.placeholder || "Select an option"} /></SelectTrigger>
                            <SelectContent>
                              {field.options?.map(option => (
                                <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                        {field.type === "radio" && (
                          <RadioGroup onValueChange={formFieldProps.onChange} defaultValue={formFieldProps.value} className="space-y-2">
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
                                className={formFieldProps.value >= starValue ? "text-accent" : "text-muted-foreground"}
                              >
                                <Star className="h-6 w-6" fill={formFieldProps.value >= starValue ? "currentColor" : "none"}/>
                              </Button>
                            ))}
                          </div>
                        )}
                        {/* Add date picker component if needed for "date" type */}
                      </>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}
             {formSchema.isAnonymous && (
              <p className="text-sm text-muted-foreground italic mt-4">This form collects responses anonymously. Your personal information will not be recorded.</p>
            )}
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full md:w-auto" size="lg">Submit Response</Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
