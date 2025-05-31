
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
import { MoreHorizontal, PlusCircle, Trash2, UserPlus, Send, RefreshCw, XCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import type { AppUser, UserRole, Invite, InviteStatus } from "@/types";
import { auth } from "@/lib/firebase"; // Import auth
import { getFunctions, httpsCallable } from "firebase/functions"; // Import for Firebase Functions

// Mock data - replace with actual data fetching and state management
// const mockCurrentUserId = "user_owner_123"; // To be replaced by auth.currentUser.uid

const initialMockTeamMembers: AppUser[] = [
  { id: "user_owner_123", name: "Sofia Davis (Owner)", email: "sofia.davis@example.com", role: "Owner", teamId: "team1", avatarUrl: "https://placehold.co/40x40.png", initials: "SD", joinedDate: "2023-01-10" },
  { id: "user1", name: "Alex Johnson", email: "alex.j@example.com", role: "Admin", teamId: "team1", avatarUrl: "https://placehold.co/40x40.png", initials: "AJ", joinedDate: "2023-01-15" },
  { id: "user2", name: "Maria Garcia", email: "maria.g@example.com", role: "Editor", teamId: "team1", avatarUrl: "https://placehold.co/40x40.png", initials: "MG", joinedDate: "2023-03-22" },
  { id: "user3", name: "David Lee", email: "david.l@example.com", role: "Viewer", teamId: "team1", avatarUrl: "https://placehold.co/40x40.png", initials: "DL", joinedDate: "2023-05-10" },
];

const initialMockPendingInvites: Invite[] = [
  // Update mock invites to not include formId, role is team role
  { id: "invite1", inviteeEmail: "new.user@example.com", role: "Editor", status: "pending", teamId: "team1", inviterId: "user_owner_123", token: "mocktoken1", createdAt: new Date().toISOString() },
  { id: "invite2", inviteeEmail: "another.dev@example.com", role: "Viewer", status: "pending", teamId: "team1", inviterId: "user_owner_123", token: "mocktoken2", createdAt: new Date(Date.now() - 86400000 * 2).toISOString() }, // 2 days ago
];

const inviteMemberSchema = z.object({
  email: z.string().email("Invalid email address."),
  role: z.enum(["Admin", "Editor", "Viewer"] as [Exclude<UserRole, "Owner">, ...Exclude<UserRole, "Owner">[]]).default("Viewer"),
});

type InviteMemberFormValues = z.infer<typeof inviteMemberSchema>;

// Placeholder/Updated function for sending invite
// This will eventually call the 'sendTeamInvite' Firebase Function
async function callSendTeamInviteFunction(inviteData: { inviteeEmail: string, role: Exclude<UserRole, "Owner"> }): Promise<{success: boolean, message: string, invite?: Invite}> {
  const functions = getFunctions(auth.app); // Get functions instance
  const sendTeamInvite = httpsCallable(functions, 'sendTeamInvite'); // Function name

  try {
    console.log("Calling 'sendTeamInvite' Firebase Function with data:", inviteData);
    const result = await sendTeamInvite(inviteData) as any; // Cast 'any' for now
    
    if (result.data.success) {
      console.log("Firebase Function 'sendTeamInvite' succeeded:", result.data);
      // The actual invite object might be returned by the function
      return { success: true, message: result.data.message || "Invitation sent successfully.", invite: result.data.invite };
    } else {
      console.error("Firebase Function 'sendTeamInvite' failed:", result.data.message);
      return { success: false, message: result.data.message || "Failed to send invitation via function." };
    }
  } catch (error) {
    console.error("Error calling 'sendTeamInvite' Firebase Function:", error);
    return { success: false, message: "An error occurred while trying to send the invitation." };
  }
}


export default function TeamSettingsPage() {
  const { toast } = useToast();
  const [teamMembers, setTeamMembers] = React.useState<AppUser[]>(initialMockTeamMembers);
  const [pendingInvites, setPendingInvites] = React.useState<Invite[]>(initialMockPendingInvites);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = React.useState(false);
  const [isSubmittingInvite, setIsSubmittingInvite] = React.useState(false);
  const currentUser = auth.currentUser;

  const form = useForm<InviteMemberFormValues>({
    resolver: zodResolver(inviteMemberSchema),
    defaultValues: {
      email: "",
      role: "Viewer",
    },
  });

  async function onInviteSubmit(data: InviteMemberFormValues) {
    setIsSubmittingInvite(true);
    
    if (!currentUser) {
      toast({ title: "Authentication Error", description: "You must be logged in.", variant: "destructive" });
      setIsSubmittingInvite(false);
      return;
    }

    // Note: Team limit check currently uses mock data.
    // In a real app, fetch actual teamMembers and pendingInvites counts from Firestore.
    const currentMemberCount = initialMockTeamMembers.filter(m => m.role !== "Owner").length;
    const currentPendingInviteCount = initialMockPendingInvites.filter(inv => inv.status === "pending").length;
    const totalNonOwnerInvitedOrMember = currentMemberCount + currentPendingInviteCount;

    if (totalNonOwnerInvitedOrMember >= 3) {
        toast({
            title: "Team Limit Reached (3 Members)",
            description: "You can invite up to 3 additional team members (excluding the Owner). Please manage existing members or invites.",
            variant: "destructive",
            duration: 7000,
        });
        setIsSubmittingInvite(false);
        return;
    }
        
    const emailExistsAsMember = initialMockTeamMembers.some(member => member.email === data.email);
    const emailHasPendingInvite = initialMockPendingInvites.some(invite => invite.inviteeEmail === data.email && invite.status === "pending");

    if (emailExistsAsMember) {
      toast({ title: "User Exists", description: `${data.email} is already a team member.`, variant: "destructive" });
      setIsSubmittingInvite(false);
      return;
    }
    if (emailHasPendingInvite) {
      toast({ title: "Invite Pending", description: `${data.email} already has a pending invitation.`, variant: "default" });
      setIsSubmittingInvite(false);
      return;
    }

    try {
      // Call the new function that will interact with Firebase Functions
      const result = await callSendTeamInviteFunction({ inviteeEmail: data.email, role: data.role as Exclude<UserRole, "Owner"> });
      
      if (result.success && result.invite) {
        // Add to mock pending invites for now. In a real app, this would update from a Firestore listener.
        setPendingInvites(prev => [result.invite!, ...prev]); 
        toast({
          title: "Invitation Sent (Simulation)",
          description: result.message || `${data.email} has been invited as a ${data.role}. (Backend function call simulated)`,
        });
        setIsInviteDialogOpen(false);
        form.reset();
      } else {
         toast({
          title: "Invite Error",
          description: result.message || "Could not send the invitation via backend function.",
          variant: "destructive",
        });
      }
    } catch (error) { // Catch errors from callSendTeamInviteFunction itself
      console.error("Error during invite submission process:", error);
      toast({
        title: "Invite Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingInvite(false);
    }
  }
  
  const removeMember = async (memberId: string) => {
    if (currentUser && memberId === currentUser.uid) { // Check against actual current user
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
    // TODO: This would ideally call a 'resendTeamInvite' Firebase Function
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
            <Button disabled={!currentUser || teamMembers.find(m=>m.id === currentUser?.uid)?.role !== "Owner"}> 
              {/* Disable if not owner based on mock data for now */}
              <UserPlus className="mr-2 h-4 w-4" /> Invite Member
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Invite New Team Member</DialogTitle>
              <DialogDescription>
                Enter the email address and select a team role. An invitation will be sent.
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
                  <Button type="submit" disabled={isSubmittingInvite || !currentUser}>
                    {isSubmittingInvite ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sending...</> : <><Send className="mr-2 h-4 w-4" />Send Invitation</>}
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
          <CardDescription>Users who have accepted their invitations and are part of your team. (Mock Data)</CardDescription>
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
                        member.role === 'Owner' ? 'bg-primary/20 text-primary' : 
                        member.role === 'Admin' ? 'bg-accent/20 text-accent-foreground' : 
                        member.role === 'Editor' ? 'bg-secondary/20 text-secondary-foreground' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {member.role}
                      </span>
                  </TableCell>
                  <TableCell>{member.joinedDate ? new Date(member.joinedDate).toLocaleDateString() : 'N/A'}</TableCell>
                  <TableCell className="text-right">
                    {member.role !== "Owner" && currentUser?.uid === initialMockTeamMembers.find(m => m.role === "Owner")?.id && ( // Mock Owner check
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
          <CardDescription>These users have been invited but haven't joined yet. (Mock Data)</CardDescription>
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
