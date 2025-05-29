
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { auth, db } from "@/lib/firebase"; // Import auth and db
import { updateProfile, updateEmail, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { Loader2 } from "lucide-react";

const accountFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  email: z.string().email("Invalid email address."),
  bio: z.string().max(160, "Bio must not be longer than 160 characters.").optional(),
  avatarUrl: z.string().url("Invalid URL for avatar.").optional(), // Added for consistency, though not fully managed
});

type AccountFormValues = z.infer<typeof accountFormSchema>;

interface UserProfileData extends AccountFormValues {
  initials?: string;
}

export default function AccountSettingsPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [currentUserData, setCurrentUserData] = useState<UserProfileData | null>(null);

  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountFormSchema),
    defaultValues: {
      name: "",
      email: "",
      bio: "",
      avatarUrl: "",
    },
  });

  useEffect(() => {
    const fetchUserData = async () => {
      setIsLoading(true);
      const user = auth.currentUser;
      if (user) {
        // Fetch additional profile data from Firestore (e.g., bio)
        // For this example, we'll simulate fetching the bio.
        // In a real app, you'd fetch from doc(db, "users", user.uid)
        let bioFromDb = "Product designer passionate about user experience and intuitive interfaces."; // Default mock bio
        const userDocRef = doc(db, "users", user.uid);
        try {
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists() && userDocSnap.data().bio) {
            bioFromDb = userDocSnap.data().bio;
          }
        } catch (error) {
          console.warn("Could not fetch user bio from Firestore, using default.", error)
        }

        const initials = user.displayName?.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase() || user.email?.charAt(0).toUpperCase() || "U";
        const userData: UserProfileData = {
          name: user.displayName || "",
          email: user.email || "",
          bio: bioFromDb,
          avatarUrl: user.photoURL || "https://placehold.co/150x150.png",
          initials: initials,
        };
        setCurrentUserData(userData);
        form.reset(userData); // Pre-fill the form
      } else {
        toast({ title: "Error", description: "Not authenticated. Please log in.", variant: "destructive" });
        // router.push("/login"); // Optionally redirect
      }
      setIsLoading(false);
    };

    fetchUserData();
  }, [form, toast]);

  async function onSubmit(data: AccountFormValues) {
    setIsSaving(true);
    const user = auth.currentUser;
    if (!user) {
      toast({ title: "Error", description: "Not authenticated.", variant: "destructive" });
      setIsSaving(false);
      return;
    }

    try {
      // Update Firebase Auth profile (displayName, photoURL)
      const profileUpdates: { displayName?: string; photoURL?: string } = {};
      if (data.name !== user.displayName) {
        profileUpdates.displayName = data.name;
      }
      // For avatarUrl - if you were managing a custom URL and not Firebase Auth's photoURL directly
      // you might update it here, but for simplicity, we assume data.avatarUrl isn't directly changed in this form.
      // If data.avatarUrl were different and meant to be photoURL, add: profileUpdates.photoURL = data.avatarUrl;

      if (Object.keys(profileUpdates).length > 0) {
        await updateProfile(user, profileUpdates);
      }

      // Handle email update (sensitive operation)
      if (data.email !== user.email) {
        // IMPORTANT: Directly updating email requires recent re-authentication.
        // For a production app, you'd implement a re-authentication flow.
        // Example:
        // const credential = EmailAuthProvider.credential(user.email!, prompt("Enter your current password"));
        // await reauthenticateWithCredential(user, credential);
        // await updateEmail(user, data.email);
        toast({
          title: "Email Update (Simulated)",
          description: `In a real app, changing email to ${data.email} would require re-authentication. Email not changed in this demo.`,
          variant: "default",
          duration: 7000,
        });
        // To actually attempt, you'd use: await updateEmail(user, data.email);
        // This will likely fail without re-authentication.
      }

      // Update additional profile data in Firestore (e.g., bio)
      const userDocRef = doc(db, "users", user.uid);
      await setDoc(userDocRef, { bio: data.bio || "" }, { merge: true }); // Using setDoc with merge to create/update

      toast({
        title: "Profile Updated",
        description: "Your account details have been successfully updated (email update is simulated).",
      });
      // Refresh displayed data
      setCurrentUserData(prev => prev ? {...prev, name: data.name, bio: data.bio} : null);

    } catch (error: any) {
      console.error("Error updating profile:", error);
      let errorMessage = "Could not update profile.";
      if (error.code === "auth/requires-recent-login") {
        errorMessage = "This operation is sensitive and requires recent authentication. Please log out and log back in to update your email.";
      }
      toast({
        title: "Update Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-8 items-center justify-center h-full">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading account settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Account Settings</h1>
        <p className="text-muted-foreground">Manage your personal information and preferences.</p>
      </div>
      <Separator />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Update your personal details here.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center space-x-4">
                <Avatar className="h-20 w-20" data-ai-hint="user avatar large">
                  <AvatarImage src={currentUserData?.avatarUrl || auth.currentUser?.photoURL || ""} alt={currentUserData?.name} />
                  <AvatarFallback>{currentUserData?.initials || "U"}</AvatarFallback>
                </Avatar>
                <Button variant="outline" type="button" disabled>Change Avatar (TODO)</Button>
              </div>

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Your full name" {...field} disabled={isSaving} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="your.email@example.com" {...field} disabled={isSaving} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="bio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Short Bio (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Tell us a little about yourself" {...field} disabled={isSaving} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Security</CardTitle>
              <CardDescription>Manage your password and account security. (This section is a placeholder)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="current-password">Current Password</Label>
                <Input id="current-password" type="password" disabled />
              </div>
              <div>
                <Label htmlFor="new-password">New Password</Label>
                <Input id="new-password" type="password" disabled />
              </div>
              <div>
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <Input id="confirm-password" type="password" disabled />
              </div>
              <Button variant="outline" type="button" disabled>Change Password (TODO)</Button>
            </CardContent>
          </Card>
          
          <div className="flex justify-end">
            <Button type="submit" disabled={isSaving || isLoading}>
              {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : "Save Changes"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
