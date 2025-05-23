
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
import * as z from "zod";
import { PlusCircle, Trash2, Sparkles, Wand2, Settings2, X, ChevronDown, ChevronUp, GripVertical, Brain } from "lucide-react";
import { generateSurveyQuestions, GenerateSurveyQuestionsInput, SuggestedQuestion } from "@/ai/flows/generate-survey-questions";
import { useToast } from "@/hooks/use-toast";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import type { FormFieldSchema as AppFormFieldSchema, FormFieldType, FormFieldOption, FormSchema } from "@/types";
import { ScrollArea } from "@/components/ui/scroll-area";

const formFieldSchema = z.object({
  id: z.string().default(() => `field_${Math.random().toString(36).substr(2, 9)}`),
  surveyId: z.string().optional(), // Will be populated when form is saved
  label: z.string().min(1, "Label is required"),
  type: z.enum(["text", "textarea", "select", "radio", "checkbox", "rating", "date", "email", "number", "nps"]),
  required: z.boolean().default(false),
  placeholder: z.string().optional(),
  options: z.array(z.object({ label: z.string().min(1), value: z.string().min(1) })).optional(),
  description: z.string().optional(),
});

const createFormSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().optional(),
  fields: z.array(formFieldSchema).min(1, "Add at least one field"),
  isAnonymous: z.boolean().default(false),
  aiMode: z.enum(["dynamic", "assisted_creation", "none"]).default("none"),
});

type CreateFormValues = z.infer<typeof createFormSchema>;

// Helper function to generate unique IDs for options if AI doesn't provide them or if they are not unique.
const ensureOptionValues = (options?: FormFieldOption[]): FormFieldOption[] => {
  if (!options) return [];
  const valueMap = new Map<string, number>();
  return options.map(opt => {
    let value = opt.value || opt.label.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    if (valueMap.has(value)) {
        valueMap.set(value, (valueMap.get(value) || 0) + 1);
        value = `${value}-${valueMap.get(value)}`;
    } else {
        valueMap.set(value, 0);
    }
    return { label: opt.label, value };
  });
};

// Placeholder function for simulating backend call to save form
async function saveFormToBackend(formData: CreateFormValues): Promise<FormSchema> {
  console.log("Simulating saving form to backend:", formData);
  // In a real app, this would call a Cloud Function or directly interact with Firestore
  // to create a 'surveys' document and potentially 'questions' sub-collection/documents.
  await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay
  
  // For now, return a mock FormSchema object as if it was created
  const createdForm: FormSchema = {
    id: `form_sim_${Date.now()}`,
    title: formData.title,
    description: formData.description,
    fields: formData.fields.map(f => ({...f, surveyId: `form_sim_${Date.now()}`})), // Ensure surveyId is set for fields
    createdBy: "mock_user_id", // Replace with actual user ID
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isAnonymous: formData.isAnonymous,
    aiMode: formData.aiMode,
  };
  return createdForm;
}


export default function CreateFormPage() {
  const { toast } = useToast();
  const [aiTopic, setAiTopic] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSavingForm, setIsSavingForm] = useState(false);

  const form = useForm<CreateFormValues>({
    resolver: zodResolver(createFormSchema),
    defaultValues: {
      title: "",
      description: "",
      fields: [{ id: `field_${Math.random().toString(36).substr(2, 9)}`, label: "", type: "text", required: false, options: [] }],
      isAnonymous: false,
      aiMode: "assisted_creation",
    },
  });

  const { fields, append, remove, move } = useFieldArray({
    control: form.control,
    name: "fields",
  });

  const handleGenerateQuestions = async () => {
    if (!aiTopic.trim()) {
      toast({ title: "Error", description: "Please enter a topic or paste questions for AI generation.", variant: "destructive" });
      return;
    }
    setIsGenerating(true);
    try {
      const input: GenerateSurveyQuestionsInput = { topic: aiTopic };
      const result = await generateSurveyQuestions(input);
      if (result && result.questions && result.questions.length > 0) {
        result.questions.forEach(question => {
          append({
            id: `field_${Math.random().toString(36).substr(2, 9)}`,
            label: question.label,
            type: question.type as FormFieldType, 
            required: false,
            placeholder: "", 
            options: ensureOptionValues(question.options),
            description: "", 
          });
        });
        toast({ title: "Success", description: `AI added ${result.questions.length} questions directly to your form.` });
        setAiTopic(""); 
      } else {
        toast({ title: "No Questions Generated", description: "The AI couldn't generate questions for this topic, or the input was unparsable. Please try a different topic or phrasing.", variant: "default" });
      }
    } catch (error) {
      console.error("AI Question Generation Error:", error);
      toast({ title: "Error", description: "An error occurred while generating questions.", variant: "destructive" });
    }
    setIsGenerating(false);
  };
  
  async function onSubmit(data: CreateFormValues) {
    setIsSavingForm(true);
    try {
      const savedForm = await saveFormToBackend(data);
      console.log("Form saved (simulated):", savedForm);
      toast({
        title: "Form Created (Simulated)",
        description: `Your form "${savedForm.title}" has been successfully created. In a real app, this would be saved to Firestore.`,
      });
      // Optionally redirect or clear form: form.reset();
      // router.push(`/forms/${savedForm.id}/edit`); // Example redirect
    } catch (error) {
      console.error("Error saving form:", error);
      toast({ title: "Save Error", description: "Could not save the form.", variant: "destructive" });
    } finally {
      setIsSavingForm(false);
    }
  }
  
  const addFieldOption = (fieldIndex: number) => {
    const currentOptions = form.getValues(`fields.${fieldIndex}.options`) || [];
    form.setValue(`fields.${fieldIndex}.options`, [...currentOptions, { label: "", value: "" }]);
  };

  const removeFieldOption = (fieldIndex: number, optionIndex: number) => {
    const currentOptions = form.getValues(`fields.${fieldIndex}.options`) || [];
    form.setValue(`fields.${fieldIndex}.options`, currentOptions.filter((_, i) => i !== optionIndex));
  };


  return (
    <div className="container mx-auto py-8">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <div className="flex justify-between items-center mb-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Create New Form</h1>
                <p className="text-muted-foreground">Design your feedback form with various field types or get help from AI.</p>
            </div>
            <Button type="submit" size="lg" disabled={isSavingForm || isGenerating}>
                {isSavingForm ? "Saving..." : <><PlusCircle className="mr-2 h-5 w-5" /> Save Form</>}
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Form Fields Section - Main Area */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle>Form Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Form Title</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Customer Satisfaction Survey" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Form Description (Optional)</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Provide a brief description or instructions for your form." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle>Form Fields</CardTitle>
                  <CardDescription>Drag to reorder fields (TODO). Click a field to edit its properties.</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px] pr-3">
                  {fields.map((fieldItem, index) => (
                    <Accordion key={fieldItem.id} type="single" collapsible className="w-full mb-2 border rounded-md">
                      <AccordionItem value={`item-${index}`} className="border-b-0">
                        <AccordionTrigger className="p-3 hover:bg-muted/50 rounded-t-md">
                          <div className="flex items-center w-full">
                            <GripVertical className="h-5 w-5 text-muted-foreground mr-2 cursor-grab" />
                            <span className="font-medium truncate flex-1 text-left">
                              {form.watch(`fields.${index}.label`) || `Field ${index + 1}`} ({form.watch(`fields.${index}.type`)})
                            </span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="p-4 space-y-4 bg-background rounded-b-md border-t">
                          <FormField
                            control={form.control}
                            name={`fields.${index}.label`}
                            render={({ field: fieldProps }) => (
                              <FormItem>
                                <FormLabel>Field Label</FormLabel>
                                <FormControl><Input placeholder="e.g., Your Name" {...fieldProps} /></FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`fields.${index}.type`}
                            render={({ field: fieldProps }) => (
                              <FormItem>
                                <FormLabel>Field Type</FormLabel>
                                <Select onValueChange={(value) => {
                                  fieldProps.onChange(value as FormFieldType);
                                  if (!["select", "radio", "checkbox"].includes(value)) {
                                    form.setValue(`fields.${index}.options`, []);
                                  } else if (!form.getValues(`fields.${index}.options`)?.length) {
                                    form.setValue(`fields.${index}.options`, [{ label: "Option 1", value: "option_1" }]);
                                  }
                                }}
                                defaultValue={fieldProps.value}
                                >
                                  <FormControl><SelectTrigger><SelectValue placeholder="Select field type" /></SelectTrigger></FormControl>
                                  <SelectContent>
                                    {(["text", "textarea", "select", "radio", "checkbox", "rating", "date", "email", "number", "nps"] as FormFieldType[]).map(type => (
                                      <SelectItem key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          {(form.watch(`fields.${index}.type`) === "select" || form.watch(`fields.${index}.type`) === "radio" || form.watch(`fields.${index}.type`) === "checkbox") && (
                            <div className="space-y-2">
                              <FormLabel>Options</FormLabel>
                              {form.watch(`fields.${index}.options`)?.map((option, optIndex) => (
                                <div key={optIndex} className="flex items-center gap-2">
                                  <FormField
                                    control={form.control}
                                    name={`fields.${index}.options.${optIndex}.label`}
                                    render={({ field: fieldProps }) => (
                                      <Input placeholder="Option Label" {...fieldProps} className="flex-1" />
                                    )}
                                  />
                                  <FormField
                                    control={form.control}
                                    name={`fields.${index}.options.${optIndex}.value`}
                                    render={({ field: fieldProps }) => (
                                      <Input placeholder="Option Value (auto-if-blank)" {...fieldProps} className="flex-1" 
                                        onBlur={(e) => { 
                                          const label = form.getValues(`fields.${index}.options.${optIndex}.label`);
                                          if (label && !e.target.value) {
                                            fieldProps.onChange(label.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''));
                                          } else {
                                            fieldProps.onChange(e.target.value);
                                          }
                                        }}
                                      />
                                    )}
                                  />
                                  <Button type="button" variant="ghost" size="icon" onClick={() => removeFieldOption(index, optIndex)}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </div>
                              ))}
                              <Button type="button" variant="outline" size="sm" onClick={() => addFieldOption(index)}>
                                <PlusCircle className="mr-2 h-4 w-4" /> Add Option
                              </Button>
                            </div>
                          )}
                           <FormField
                            control={form.control}
                            name={`fields.${index}.placeholder`}
                            render={({ field: fieldProps }) => (
                              <FormItem>
                                <FormLabel>Placeholder (Optional)</FormLabel>
                                <FormControl><Input placeholder="e.g., Enter your feedback here" {...fieldProps} /></FormControl>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`fields.${index}.description`}
                            render={({ field: fieldProps }) => (
                              <FormItem>
                                <FormLabel>Helper Text (Optional)</FormLabel>
                                <FormControl><Textarea placeholder="Additional instructions for this field" {...fieldProps} rows={2} /></FormControl>
                              </FormItem>
                            )}
                          />
                          <div className="flex items-center justify-between">
                             <FormField
                                control={form.control}
                                name={`fields.${index}.required`}
                                render={({ field: fieldProps }) => (
                                <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                                    <FormControl><Switch checked={fieldProps.value} onCheckedChange={fieldProps.onChange} /></FormControl>
                                    <FormLabel className="font-normal">Required</FormLabel>
                                </FormItem>
                                )}
                            />
                            <Button type="button" variant="destructive" onClick={() => remove(index)} size="sm">
                              <Trash2 className="mr-2 h-4 w-4" /> Remove Field
                            </Button>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  ))}
                  </ScrollArea>
                  <Button type="button" variant="outline" onClick={() => append({ id: `field_${Math.random().toString(36).substr(2, 9)}`, label: "", type: "text", required: false, options: [] })} className="w-full mt-4" disabled={isSavingForm || isGenerating}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add New Field
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar for AI Tools & Settings */}
            <div className="lg:col-span-1 space-y-6">
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center"><Sparkles className="mr-2 h-5 w-5 text-primary" /> AI Question Generator</CardTitle>
                  <CardDescription>Enter a topic, or paste questions, to have AI add them directly to your form.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1">
                    <Label htmlFor="ai-topic">Topic / Paste Questions</Label>
                    <Textarea 
                        id="ai-topic" 
                        placeholder="e.g., Customer service experience, or paste '1. Favorite color? (Red, Blue)'" 
                        value={aiTopic} 
                        onChange={(e) => setAiTopic(e.target.value)}
                        rows={3}
                        disabled={isGenerating || isSavingForm}
                    />
                  </div>
                  <Button onClick={handleGenerateQuestions} disabled={isGenerating || isSavingForm} className="w-full">
                    <Wand2 className="mr-2 h-4 w-4" /> {isGenerating ? "Generating..." : "Generate & Add Questions"}
                  </Button>
                </CardContent>
              </Card>

              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center"><Settings2 className="mr-2 h-5 w-5" /> Form Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="isAnonymous"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5">
                          <FormLabel>Anonymous Responses</FormLabel>
                          <FormDescription>
                            Collect responses without identifying users.
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            disabled={isSavingForm || isGenerating}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                   <FormField
                    control={form.control}
                    name="aiMode"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5">
                          <FormLabel className="flex items-center"><Brain className="mr-2 h-4 w-4" /> AI Mode</FormLabel>
                          <FormDescription>
                            Control AI behavior for this form.
                          </FormDescription>
                        </div>
                        <FormControl>
                           <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isSavingForm || isGenerating}>
                            <SelectTrigger className="w-[180px]">
                              <SelectValue placeholder="Select AI Mode" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              <SelectItem value="assisted_creation">Assisted Creation</SelectItem>
                              <SelectItem value="dynamic">Dynamic Follow-ups (Future)</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="flex justify-end space-x-2 mt-8">
            <Button variant="outline" type="button" onClick={() => form.reset()} disabled={isSavingForm || isGenerating}>
              Reset Form
            </Button>
            <Button type="submit" size="lg" disabled={isSavingForm || isGenerating}>
              {isSavingForm ? "Saving..." : <><PlusCircle className="mr-2 h-5 w-5" /> Save Form</>}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
