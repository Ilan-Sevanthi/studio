import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, PlusCircle, Eye, Edit2, Trash2, Share2, BarChartHorizontalBig } from "lucide-react";
import Link from "next/link";
import type { FormSchema } from "@/types"; // Assuming types are defined

// Mock Data
const mockForms: FormSchema[] = [
  { id: "form_1", title: "Customer Satisfaction Q3", description: "Gather feedback on Q3 performance.", fields: [], createdAt: new Date(2023, 8, 15).toISOString(), updatedAt: new Date(2023, 9, 1).toISOString(), isAnonymous: false },
  { id: "form_2", title: "Employee Engagement Survey", description: "Annual survey for employee feedback.", fields: [], createdAt: new Date(2023, 7, 1).toISOString(), updatedAt: new Date(2023, 7, 10).toISOString(), isAnonymous: true },
  { id: "form_3", title: "New Feature Feedback", description: "Feedback on the new dashboard analytics.", fields: [], createdAt: new Date(2023, 9, 20).toISOString(), updatedAt: new Date(2023, 9, 22).toISOString(), isAnonymous: false },
  { id: "form_4", title: "Website Usability Test", description: "Collect insights on website navigation.", fields: [], createdAt: new Date(2023, 6, 5).toISOString(), updatedAt: new Date(2023, 6, 5).toISOString(), isAnonymous: true },
];

// Mock response counts, in a real app this would come from a database
const mockResponseCounts: Record<string, number> = {
  "form_1": 152,
  "form_2": 89,
  "form_3": 230,
  "form_4": 45,
};

export default function FormsPage() {
  const forms = mockForms; // In a real app, fetch this data

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
        <Card className="text-center py-12">
          <CardHeader>
            <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
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
        <Card className="shadow-sm">
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
                    <TableCell>{mockResponseCounts[form.id] || 0}</TableCell>
                    <TableCell>
                      {/* Logic for status based on dates or explicit status field */}
                      <Badge variant={ Math.random() > 0.5 ? "default" : "secondary" } className={ Math.random() > 0.5 ? "bg-green-500/20 text-green-700" : "bg-yellow-500/20 text-yellow-700"}>
                        { Math.random() > 0.5 ? "Active" : "Draft"}
                      </Badge>
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
                          <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10">
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
