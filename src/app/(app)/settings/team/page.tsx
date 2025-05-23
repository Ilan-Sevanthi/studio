
"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { MoreHorizontal, PlusCircle, Trash2, UserPlus, Send, RefreshCw, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import type { AppUser, UserRole, Invite, InviteStatus } from "@/types";

// Mock data - replace with actual data fetching and state management
const mockCurrentUserId = "user_owner_123"; // Assume this is the ID of the currently logged-in user

const initialMockTeamMembers: AppUser[] = [
  { id: "user_owner_123", name: "Sofia Davis (Owner)", email: "sofia.davis@example.com", role: "Owner", teamId: "team1", avatarUrl: "https://placehold.co/40x40.png", initials: "SD", joinedDate: "2023-01-10" },
  { id: "user1", name: "Alex Johnson", email: "alex.j@example.com", role: "Admin", teamId: "team1", avatarUrl: "https://placehold.co/40x40.png", initials: "AJ", joinedDate: "2023-01-15" },
  { id: "user2", name: "Maria Garcia", email: "maria.g@example.com", role: "Editor", teamId: "team1", avatarUrl: "https://placehold.co/40x40.png", initials: "MG", joinedDate: "2023-03-22" },
  { id: "user3", name: "David Lee", email: "david.l@example.com", role: "Viewer", teamId: "team1", avatarUrl: "https://placehold.co/40x40.png", initials: "DL", joinedDate: "2023-05-10" },
];

const initialMockPendingInvites: Invite[] = [
  { id: "invite1", inviteeEmail: "new.user@example.com", role: "Editor", status: "pending", teamId: "team1", inviterId: mockCurrentUserId, createdAt: new Date().toISOString() },
  { id: "invite2", inviteeEmail: "another.dev@example.com", role: "Viewer", status: "pending", teamId: "team1", inviterId: mockCurrentUserId, createdAt: new Date(Date.now() - 86400000 * 2).toISOString() }, // 2 days ago
];

const inviteMemberSchema = z.object({
  email: z.string().email("Invalid email address."),
  role: z.enum(["Admin", "Editor", "Viewer"] as [UserRole, ...UserRole[]]).refine(val => val !== "Owner", { message: "Cannot invite as Owner."}),
});

type InviteMemberFormValues = z.infer<typeof inviteMemberSchema>;

// Placeholder function for simulating backend call to send invite
async function sendInviteToBackend(inviteData: Omit<Invite, 'id' | 'status' | 'createdAt'>): Promise<Invite> {
  console.log("Simulating sending invite to backend:", inviteData);
  // In a real app, this would call a Cloud Function e.g., /sendInvite
  // which would send an email and create an invite document in Firestore.
  await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay
  
  // For now, return a mock invite object as if it was created in backend
  const newInvite: Invite = {
    ...inviteData,
    id: `invite_sim_${Date.now()}`,
    status: "pending",
    createdAt: new Date().toISOString(),
  };
  return newInvite;
}


export default function TeamSettingsPage() {
  const { toast } = useToast();
  const [teamMembers, setTeamMembers] = React.useState<AppUser[]>(initialMockTeamMembers);
  const [pendingInvites, setPendingInvites] = React.useState<Invite[]>(initialMockPendingInvites);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = React.useState(false);
  const [isSubmittingInvite, setIsSubmittingInvite] = React.useState(false);

  const form = useForm<InviteMemberFormValues>({
    resolver: zodResolver(inviteMemberSchema),
    defaultValues: {
      email: "",
      role: "Viewer",
    },
  });

  async function onInviteSubmit(data: InviteMemberFormValues) {
    setIsSubmittingInvite(true);
    
    const emailExists = teamMembers.some(member => member.email === data.email) || 
                        pendingInvites.some(invite => invite.inviteeEmail === data.email && invite.status === "pending");

    if (emailExists) {
      toast({
        title: "Email Already Exists",
        description: `${data.email} is already a team member or has a pending invitation.`,
        variant: "destructive",
      });
      setIsSubmittingInvite(false);
      return;
    }
        
    if (teamMembers.filter(m => m.role !== "Owner").length >= 3) {
        toast({
            title: "Team Limit Reached",
            description: "You can invite up to 3 additional team members (excluding the Owner). Please manage existing members to add new ones.",
            variant: "destructive",
        });
        setIsSubmittingInvite(false);
        return;
    }

    try {
      const newInviteData: Omit<Invite, 'id' | 'status' | 'createdAt'> = {
        inviteeEmail: data.email,
        role: data.role,
        teamId: "team1", // Assuming a single team context for now
        inviterId: mockCurrentUserId,
      };
      const createdInvite = await sendInviteToBackend(newInviteData);
      
      setPendingInvites(prev => [createdInvite, ...prev]);
      toast({
        title: "Invitation Sent",
        description: `${data.email} has been invited as a ${data.role}. A real email would be sent in a production app.`,
      });
      setIsInviteDialogOpen(false);
      form.reset();
    } catch (error) {
      console.error("Error sending invite:", error);
      toast({
        title: "Invite Error",
        description: "Could not send the invitation. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingInvite(false);
    }
  }
  
  const removeMember = async (memberId: string) => {
    if (memberId === mockCurrentUserId) {
      toast({ title: "Action Denied", description: "Owner cannot be removed.", variant: "destructive"});
      return;
    }
    // Simulate backend call to remove member
    console.log("Simulating removal of member:", memberId);
    await new Promise(resolve => setTimeout(resolve, 500));
    setTeamMembers(prev => prev.filter(member => member.id !== memberId));
    toast({ title: "Member Removed", description: "The team member has been removed (simulated)." });
  };

  const cancelInvite = async (inviteId: string) => {
    // Simulate backend call to cancel invite
    console.log("Simulating cancellation of invite:", inviteId);
    await new Promise(resolve => setTimeout(resolve, 500));
    setPendingInvites(prev => prev.filter(invite => invite.id !== inviteId));
    toast({ title: "Invitation Cancelled", description: "The pending invitation has been cancelled (simulated)." });
  };

  const resendInvite = async (inviteId: string) => {
    const invite = pendingInvites.find(inv => inv.id === inviteId);
    // Simulate backend call to resend invite
    console.log("Simulating resend of invite:", inviteId);
    await new Promise(resolve => setTimeout(resolve, 500));
    toast({ title: "Invitation Resent", description: `Invitation to ${invite?.inviteeEmail} has been resent (simulated).` });
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Team Members</h1>
          <p className="text-muted-foreground">Manage who has access. Owners can invite up to 3 additional team members.</p>
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
                Enter the email address and select a role for the new team member. An invitation will be sent to them.
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
                        <Input type="email" placeholder="name@example.com" {...field} disabled={isSubmittingInvite} />
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
                      <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isSubmittingInvite}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Admin">Admin (Full Access, except owner actions)</SelectItem>
                          <SelectItem value="Editor">Editor (Create & Manage Forms)</SelectItem>
                          <SelectItem value="Viewer">Viewer (View Results Only)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsInviteDialogOpen(false)} disabled={isSubmittingInvite}>Cancel</Button>
                  <Button type="submit" disabled={isSubmittingInvite}>
                    {isSubmittingInvite ? "Sending..." : <><Send className="mr-2 h-4 w-4" />Send Invitation</>}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Current Team ({teamMembers.length})</CardTitle>
          <CardDescription>Users who have accepted their invitations and are part of your team.</CardDescription>
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
                        <AvatarFallback>{member.initials || member.name?.substring(0,2).toUpperCase() || 'U'}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{member.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>{member.email}</TableCell>
                  <TableCell>
                     <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        member.role === 'Owner' ? 'bg-primary/20 text-primary' : // Adjusted for better theme contrast
                        member.role === 'Admin' ? 'bg-accent/20 text-accent-foreground' : // Using accent for Admin
                        member.role === 'Editor' ? 'bg-secondary/20 text-secondary-foreground' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {member.role}
                      </span>
                  </TableCell>
                  <TableCell>{member.joinedDate ? new Date(member.joinedDate).toLocaleDateString() : 'N/A'}</TableCell>
                  <TableCell className="text-right">
                    {member.role !== "Owner" && (
                      <>
                        <Button variant="ghost" size="icon" onClick={() => toast({title: "Edit Role (TODO)", description:"This feature is not yet implemented."})} title="Edit role (TODO)">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => removeMember(member.id)} title="Remove member" className="text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {teamMembers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-4">
                    No active team members yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Pending Invitations ({pendingInvites.filter(inv => inv.status === 'pending').length})</CardTitle>
          <CardDescription>These users have been invited but haven't joined yet. In a real app, this relies on a Cloud Function like `/acceptInvite`.</CardDescription>
        </CardHeader>
        <CardContent>
           <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Invited Role</TableHead>
                <TableHead>Invited On</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingInvites.filter(invite => invite.status === 'pending').map((invite) => (
                <TableRow key={invite.id}>
                  <TableCell className="font-medium">{invite.inviteeEmail}</TableCell>
                  <TableCell>{invite.role}</TableCell>
                  <TableCell>{new Date(invite.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 text-xs rounded-full bg-[hsl(var(--chart-3))]/20 text-[hsl(var(--status-pending-text))]`}>
                        {invite.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                     <Button variant="ghost" size="sm" onClick={() => resendInvite(invite.id)} title="Resend invitation">
                        <RefreshCw className="mr-1 h-3 w-3" /> Resend
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => cancelInvite(invite.id)} title="Cancel invitation" className="text-destructive hover:text-destructive">
                        <XCircle className="mr-1 h-3 w-3" /> Cancel
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {pendingInvites.filter(invite => invite.status === 'pending').length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-4">
                    No pending invitations.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
