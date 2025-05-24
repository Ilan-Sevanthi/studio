
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, PlusCircle, Eye, Edit2, Trash2, Share2, BarChartHorizontalBig, FileText as FileTextIcon, Loader2 } from "lucide-react";
import Link from "next/link";
import type { FormSchema, QuestionSchema } from "@/types";
import { db, auth } from "@/lib/firebase";
import { collection, query, where, onSnapshot, orderBy, Timestamp, deleteDoc, doc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";

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

  useEffect(() => {
    if (!currentUser) {
      // Handle case where user is not logged in, though layout should protect this
      setIsLoading(false);
      return;
    }

    const q = query(
      collection(db, "surveys"), 
      where("createdBy", "==", currentUser.uid), // Fetch forms created by the current user
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const fetchedForms: DisplayFormSchema[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        // Convert Firestore Timestamp to Date string for display
        const createdAt = data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt;
        const updatedAt = data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : data.updatedAt;
        
        fetchedForms.push({
          ...data,
          id: doc.id,
          createdAt,
          updatedAt,
          // TODO: Fetch actual response counts. For now, using 0 or N/A.
          responseCount: 0, // This will be updated if we implement response count fetching
          // TODO: Determine displayStatus based on form properties (e.g., if it has an endDate)
          displayStatus: data.status || "Active", // Assuming 'status' field exists or default to Active
          fields: data.fields as QuestionSchema[], // Ensure fields are correctly typed
        } as DisplayFormSchema);
      });
      setForms(fetchedForms);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching forms: ", error);
      toast({ title: "Error", description: "Could not fetch forms.", variant: "destructive" });
      setIsLoading(false);
    });

    return () => unsubscribe(); // Cleanup listener on component unmount
  }, [currentUser, toast]);

  const handleDeleteForm = async (formId: string) => {
    if (!confirm("Are you sure you want to delete this form? This action cannot be undone.")) {
      return;
    }
    try {
      await deleteDoc(doc(db, "surveys", formId));
      toast({ title: "Form Deleted", description: "The form has been successfully deleted." });
      // The onSnapshot listener will automatically update the UI
    } catch (error) {
      console.error("Error deleting form: ", error);
      toast({ title: "Error", description: "Could not delete the form.", variant: "destructive" });
    }
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

      {forms.length === 0 ? (
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
                        'bg-muted text-muted-foreground' // Default/fallback style
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
                           <DropdownMenuItem asChild>
                            <Link href={`/forms/${form.id}/respond`} target="_blank"><Eye className="mr-2 h-4 w-4" /> Preview Form</Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem><Share2 className="mr-2 h-4 w-4" /> Share Options</DropdownMenuItem>
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
  );
}
