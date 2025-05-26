
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, PlusCircle, Eye, Edit2, Trash2, Share2, BarChartHorizontalBig, FileText as FileTextIcon, Loader2, Copy, Star } from "lucide-react";
import Link from "next/link";
import type { FormSchema, QuestionSchema, FormFieldOption } from "@/types";
import { db, auth } from "@/lib/firebase";
import { collection, query, where, onSnapshot, orderBy, Timestamp, deleteDoc, doc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";


// Add a status field to FormSchema for UI display, if not directly in DB
interface DisplayFormSchema extends FormSchema {
  displayStatus?: 'Active' | 'Closed' | 'Draft'; 
  responseCount?: number; // Placeholder for now
}

export default function FormsPage() {
  const [forms, setForms] = useState<DisplayFormSchema[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const currentUser = auth.currentUser;

  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [shareLink, setShareLink] = useState("");
  const [selectedFormTitle, setSelectedFormTitle] = useState("");

  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  const [selectedFormForPreview, setSelectedFormForPreview] = useState<DisplayFormSchema | null>(null);


  useEffect(() => {
    if (!currentUser) {
      setIsLoading(false);
      // Optionally, redirect to login or show a message if user is not authenticated
      // For now, just stop loading and forms will be empty
      return;
    }

    const q = query(
      collection(db, "surveys"), 
      where("createdBy", "==", currentUser.uid),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const fetchedForms: DisplayFormSchema[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const createdAt = data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt as string;
        const updatedAt = data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : data.updatedAt as string;
        
        fetchedForms.push({
          ...data,
          id: doc.id,
          createdAt,
          updatedAt,
          responseCount: data.responseCount || 0, // Assuming you might add a responseCount field
          displayStatus: data.status || "Active", // Assuming 'status' field exists or default to Active
          fields: data.fields as QuestionSchema[],
        } as DisplayFormSchema);
      });
      setForms(fetchedForms);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching forms: ", error);
      toast({ title: "Error", description: "Could not fetch forms.", variant: "destructive" });
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser, toast]);

  const handleDeleteForm = async (formId: string) => {
    if (!confirm("Are you sure you want to delete this form? This action cannot be undone.")) {
      return;
    }
    try {
      await deleteDoc(doc(db, "surveys", formId));
      toast({ title: "Form Deleted", description: "The form has been successfully deleted." });
    } catch (error) {
      console.error("Error deleting form: ", error);
      toast({ title: "Error", description: "Could not delete the form.", variant: "destructive" });
    }
  };

  const handleShareForm = (formId: string, formTitle: string) => {
    const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
    setShareLink(`${currentOrigin}/forms/${formId}/respond`);
    setSelectedFormTitle(formTitle);
    setIsShareDialogOpen(true);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareLink).then(() => {
      toast({ title: "Link Copied!", description: "The shareable link has been copied to your clipboard." });
    }, (err) => {
      toast({ title: "Copy Failed", description: "Could not copy the link.", variant: "destructive" });
    });
  };

  const handlePreviewForm = (form: DisplayFormSchema) => {
    setSelectedFormForPreview(form);
    setIsPreviewDialogOpen(true);
  };


  if (isLoading) {
    return (
      <div className="flex flex-col gap-8 items-center justify-center h-full">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading your forms...</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Your Forms</h1>
            <p className="text-muted-foreground">Manage, edit, and analyze your feedback forms.</p>
          </div>
          <Button asChild>
            <Link href="/forms/create">
              <PlusCircle className="mr-2 h-4 w-4" /> Create New Form
            </Link>
          </Button>
        </div>

        {forms.length === 0 && !isLoading ? (
          <Card className="text-center py-12 shadow-lg">
            <CardHeader>
              <FileTextIcon className="mx-auto h-12 w-12 text-muted-foreground" />
              <CardTitle className="mt-4 text-2xl font-semibold">No Forms Yet</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                It looks like you haven't created any forms. Get started by creating your first one!
              </CardDescription>
            </CardContent>
            <CardFooter className="justify-center">
              <Button asChild>
                <Link href="/forms/create">
                  <PlusCircle className="mr-2 h-4 w-4" /> Create Your First Form
                </Link>
              </Button>
            </CardFooter>
          </Card>
        ) : (
          <Card className="shadow-lg">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Responses</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {forms.map((form) => (
                    <TableRow key={form.id}>
                      <TableCell className="font-medium">
                        <Link href={`/forms/${form.id}/results`} className="hover:underline text-primary">
                          {form.title}
                        </Link>
                        {form.isAnonymous && <Badge variant="outline" className="ml-2 text-xs">Anonymous</Badge>}
                      </TableCell>
                      <TableCell>{form.responseCount ?? 'N/A'}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          form.displayStatus === 'Active' ? 'bg-[hsl(var(--chart-4))]/20 text-[hsl(var(--status-active-text))]' : 
                          form.displayStatus === 'Closed' ? 'bg-[hsl(var(--destructive))]/20 text-[hsl(var(--status-closed-text))]' :
                          form.displayStatus === 'Draft' ? 'bg-[hsl(var(--chart-2))]/20 text-[hsl(var(--status-draft-text))]' :
                          'bg-muted text-muted-foreground'
                        }`}>
                          {form.displayStatus || 'N/A'}
                        </span>
                      </TableCell>
                      <TableCell>{new Date(form.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem asChild>
                              <Link href={`/forms/${form.id}/results`}><BarChartHorizontalBig className="mr-2 h-4 w-4" /> View Results</Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/forms/${form.id}/edit`}><Edit2 className="mr-2 h-4 w-4" /> Edit Form</Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handlePreviewForm(form)}>
                              <Eye className="mr-2 h-4 w-4" /> Preview Form
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleShareForm(form.id, form.title)}>
                              <Share2 className="mr-2 h-4 w-4" /> Share Options
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10" onClick={() => handleDeleteForm(form.id)}>
                              <Trash2 className="mr-2 h-4 w-4" /> Delete Form
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Share Form Dialog */}
      <Dialog open={isShareDialogOpen} onOpenChange={setIsShareDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share Form: {selectedFormTitle}</DialogTitle>
            <DialogDescription>
              Copy the link below to share your form with others.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center space-x-2 mt-4">
            <Input value={shareLink} readOnly className="flex-1" />
            <Button onClick={copyToClipboard} size="icon">
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <CardFooter className="mt-4 p-0 justify-end">
             <Button variant="outline" onClick={() => setIsShareDialogOpen(false)}>Close</Button>
          </CardFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Form Dialog */}
      {selectedFormForPreview && (
        <Dialog open={isPreviewDialogOpen} onOpenChange={setIsPreviewDialogOpen}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Preview: {selectedFormForPreview.title}</DialogTitle>
              {selectedFormForPreview.description && <DialogDescription>{selectedFormForPreview.description}</DialogDescription>}
            </DialogHeader>
            <ScrollArea className="max-h-[70vh] p-1 pr-3 my-4">
              <div className="space-y-6 p-2">
                {selectedFormForPreview.fields.map((field) => (
                  <div key={field.id} className="p-3 border rounded-md bg-muted/20">
                    <Label className="font-medium">{field.text} {field.required && <span className="text-destructive">*</span>}</Label>
                    {field.description && <p className="text-xs text-muted-foreground mb-1">{field.description}</p>}
                    
                    {field.type === "text" && <Input type="text" placeholder={field.placeholder} disabled className="mt-1 bg-background/50" />}
                    {field.type === "email" && <Input type="email" placeholder={field.placeholder} disabled className="mt-1 bg-background/50" />}
                    {field.type === "number" && <Input type="number" placeholder={field.placeholder} disabled className="mt-1 bg-background/50" />}
                    {field.type === "textarea" && <Textarea placeholder={field.placeholder} disabled className="mt-1 bg-background/50" />}
                    {field.type === "date" && <Input type="date" disabled className="mt-1 bg-background/50" />}
                    
                    {field.type === "rating" && (
                      <div className="flex space-x-1 mt-1">
                        {[...(Array(field.maxRating || 5).keys())].map(i => i + (field.minRating || 1)).map(starValue => (
                          <Star key={starValue} className="h-5 w-5 text-muted-foreground/50" />
                        ))}
                      </div>
                    )}
                    
                    {field.type === "select" && (
                      <Select disabled>
                        <SelectTrigger className="mt-1 bg-background/50">
                          <SelectValue placeholder={field.placeholder || "Select an option"} />
                        </SelectTrigger>
                        <SelectContent>
                          {field.options?.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    )}
                    
                    {field.type === "radio" && field.options && (
                      <RadioGroup disabled className="space-y-1 mt-1">
                        {field.options.map(opt => (
                          <div key={opt.value} className="flex items-center space-x-2">
                            <RadioGroupItem value={opt.value} id={`${field.id}-preview-${opt.value}`} disabled />
                            <Label htmlFor={`${field.id}-preview-${opt.value}`} className="font-normal text-muted-foreground/80">{opt.label}</Label>
                          </div>
                        ))}
                      </RadioGroup>
                    )}
                    
                    {field.type === "checkbox" && field.options && (
                      <div className="space-y-1 mt-1">
                        {field.options.map(opt => (
                          <div key={opt.value} className="flex items-center space-x-2">
                            <Checkbox id={`${field.id}-preview-${opt.value}`} value={opt.value} disabled />
                            <Label htmlFor={`${field.id}-preview-${opt.value}`} className="font-normal text-muted-foreground/80">{opt.label}</Label>
                          </div>
                        ))}
                      </div>
                    )}

                    {field.type === "nps" && (
                        <div className="flex flex-wrap gap-1 mt-1">
                            {[...Array(11).keys()].map(i => (
                            <Button key={i} variant="outline" size="sm" disabled className="h-7 w-7 p-0">{i}</Button>
                            ))}
                        </div>
                    )}
                  </div>
                ))}
                 {selectedFormForPreview.isAnonymous && (
                  <p className="text-sm text-muted-foreground italic mt-4">This form collects responses anonymously.</p>
                )}
              </div>
            </ScrollArea>
            <CardFooter className="mt-2 p-0 justify-end">
              <Button variant="outline" onClick={() => setIsPreviewDialogOpen(false)}>Close Preview</Button>
            </CardFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

    