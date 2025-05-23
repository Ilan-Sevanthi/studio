"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { MoreHorizontal, PlusCircle, Trash2, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: "Admin" | "Editor" | "Viewer";
  avatarUrl: string;
  initials: string;
  joinedDate: string;
}

// Mock data
const mockTeamMembers: TeamMember[] = [
  { id: "user1", name: "Alex Johnson", email: "alex.j@example.com", role: "Admin", avatarUrl: "https://placehold.co/40x40.png", initials: "AJ", joinedDate: "2023-01-15" },
  { id: "user2", name: "Maria Garcia", email: "maria.g@example.com", role: "Editor", avatarUrl: "https://placehold.co/40x40.png", initials: "MG", joinedDate: "2023-03-22" },
  { id: "user3", name: "David Lee", email: "david.l@example.com", role: "Viewer", avatarUrl: "https://placehold.co/40x40.png", initials: "DL", joinedDate: "2023-05-10" },
];

const inviteMemberSchema = z.object({
  email: z.string().email("Invalid email address."),
  role: z.enum(["Admin", "Editor", "Viewer"], { required_error: "Role is required." }),
});

type InviteMemberFormValues = z.infer<typeof inviteMemberSchema>;

export default function TeamSettingsPage() {
  const { toast } = useToast();
  const [teamMembers, setTeamMembers] = React.useState(mockTeamMembers);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = React.useState(false);

  const form = useForm<InviteMemberFormValues>({
    resolver: zodResolver(inviteMemberSchema),
    defaultValues: {
      email: "",
      role: "Viewer",
    },
  });

  function onInviteSubmit(data: InviteMemberFormValues) {
    console.log("Invite data:", data);
    // Simulate adding a new member
    const newMember: TeamMember = {
      id: `user${teamMembers.length + 1}`,
      name: "Invited User", // Placeholder name
      email: data.email,
      role: data.role,
      avatarUrl: "https://placehold.co/40x40.png",
      initials: data.email.substring(0,2).toUpperCase(),
      joinedDate: new Date().toISOString().split('T')[0],
    };
    setTeamMembers(prev => [...prev, newMember]);
    toast({
      title: "Invitation Sent",
      description: `${data.email} has been invited as a ${data.role}.`,
    });
    setIsInviteDialogOpen(false);
    form.reset();
  }
  
  const removeMember = (memberId: string) => {
    setTeamMembers(prev => prev.filter(member => member.id !== memberId));
    toast({
      title: "Member Removed",
      description: "The team member has been removed.",
      variant: "destructive"
    });
  };


  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Team Members</h1>
          <p className="text-muted-foreground">Manage who has access to your Feedback Flow account.</p>
        </div>
        <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="mr-2 h-4 w-4" /> Invite Member
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Invite New Member</DialogTitle>
              <DialogDescription>
                Enter the email address and select a role for the new team member.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onInviteSubmit)} className="space-y-4 py-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="name@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Admin">Admin (Full Access)</SelectItem>
                          <SelectItem value="Editor">Editor (Create & Manage Forms)</SelectItem>
                          <SelectItem value="Viewer">Viewer (View Results Only)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsInviteDialogOpen(false)}>Cancel</Button>
                  <Button type="submit">Send Invitation</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Current Team ({teamMembers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teamMembers.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8" data-ai-hint="user avatar">
                        <AvatarImage src={member.avatarUrl} alt={member.name} />
                        <AvatarFallback>{member.initials}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{member.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>{member.email}</TableCell>
                  <TableCell>{member.role}</TableCell>
                  <TableCell>{new Date(member.joinedDate).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => removeMember(member.id)} title="Remove member">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                    {/* Add edit role functionality if needed */}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Pending Invitations</CardTitle>
          <CardDescription>These users have been invited but haven't joined yet.</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Placeholder for pending invitations list */}
          <p className="text-sm text-muted-foreground text-center py-4">No pending invitations.</p>
        </CardContent>
      </Card>
    </div>
  );
}
