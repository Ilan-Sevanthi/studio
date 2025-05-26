
"use client";

import { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquare, Smile, Users, Download, Filter, CheckCircle, Percent, FileText as FileTextIconLucide, Image as ImageIconLucide, Loader2, Copy } from "lucide-react";
import { summarizeFeedback, SummarizeFeedbackInput } from '@/ai/flows/summarize-feedback';
import { useToast } from "@/hooks/use-toast";
import type { FormSchema, FormResponse, QuestionSchema } from "@/types";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart"
import { Bar, Pie, Cell, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend as RechartsLegend, BarChart as RechartsBarChart, PieChart as RechartsPieChart } from 'recharts';
import { Progress } from '@/components/ui/progress';
import { CSVLink } from 'react-csv';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { db } from '@/lib/firebase';
import { doc, onSnapshot, collection, query, where } from 'firebase/firestore';
import { useParams } from 'next/navigation'; // Import useParams

const ratingChartConfig = {
  satisfaction: { label: "Satisfaction", color: "hsl(var(--chart-1))" },
  recommendation: { label: "Recommendation", color: "hsl(var(--chart-2))" },
} satisfies Record<string, any>;

// Mock sentiment data for now, replace with dynamic data if AI sentiment analysis is implemented per response
const mockSentimentData = [
  { name: 'Positive', value: 0, fill: 'hsl(var(--chart-4))' },
  { name: 'Neutral', value: 0, fill: 'hsl(var(--chart-2))' },
  { name: 'Negative', value: 0, fill: 'hsl(var(--chart-5))' },
];

// Removed params from props, will use useParams hook
export default function FormResultsPage() {
  const paramsHook = useParams(); // Use the hook
  const formId = paramsHook.formId as string; // Extract formId, ensure it's typed as string

  const { toast } = useToast();
  const [form, setForm] = useState<FormSchema | null>(null);
  const [responses, setResponses] = useState<FormResponse[]>([]);
  const [summary, setSummary] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [ratingDistribution, setRatingDistribution] = useState<any[]>([]);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [sentimentData, setSentimentData] = useState(mockSentimentData);


  const calculateRatingDistribution = useCallback((fetchedResponses: FormResponse[], currentForm: FormSchema | null) => {
    if (!currentForm || !currentForm.fields) {
      setRatingDistribution([]);
      return;
    }
    const ratingQuestion = currentForm.fields.find(f => f.type === 'rating' && f.text.toLowerCase().includes('satisfaction'));
    if (ratingQuestion) {
      const satisfactionCounts: Record<number, number> = {};
      fetchedResponses.forEach(r => {
        const rating = r.answers[ratingQuestion.id] as number;
        if (typeof rating === 'number') {
          satisfactionCounts[rating] = (satisfactionCounts[rating] || 0) + 1;
        }
      });
      const distData = Object.entries(satisfactionCounts).map(([rating, count]) => ({
        rating: `⭐ ${rating}`,
        count,
      })).sort((a, b) => parseInt(a.rating.split(" ")[1]) - parseInt(b.rating.split(" ")[1]));
      setRatingDistribution(distData);
    } else {
      setRatingDistribution([]);
    }
  }, []);

  const prepareCsvData = useCallback((currentForm: FormSchema | null, fetchedResponses: FormResponse[]) => {
    if (currentForm && currentForm.fields && fetchedResponses.length > 0) {
      const headers = currentForm.fields.map(field => ({ label: field.text, key: field.id }));
      headers.unshift({ label: "Response ID", key: "id" });
      headers.push({ label: "Submitted At", key: "timestamp" });

      const dataForCsv = fetchedResponses.map(res => {
        const row: any = { id: res.id.substring(0, 8), timestamp: new Date(res.timestamp).toLocaleString() };
        currentForm.fields.forEach(field => {
          row[field.id] = res.answers[field.id] ?? 'N/A';
        });
        return row;
      });
      setCsvData([{ headers, data: dataForCsv }]);
    } else {
      setCsvData([]);
    }
  }, []);

  useEffect(() => {
    // Ensure formId from useParams is available before proceeding
    if (!formId) {
      setIsLoading(false);
      toast({ title: "Error", description: "Form ID is missing.", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    let currentForm: FormSchema | null = null;

    // Fetch form details
    const formDocRef = doc(db, "surveys", formId);
    const unsubscribeForm = onSnapshot(formDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const formData = docSnap.data() as Omit<FormSchema, 'id' | 'createdAt' | 'updatedAt'>;
        const createdAt = formData.createdAt && typeof formData.createdAt === 'object' && 'toDate' in formData.createdAt ? (formData.createdAt as any).toDate().toISOString() : formData.createdAt as string;
        const updatedAt = formData.updatedAt && typeof formData.updatedAt === 'object' && 'toDate' in formData.updatedAt ? (formData.updatedAt as any).toDate().toISOString() : formData.updatedAt as string;
        
        currentForm = {
          id: docSnap.id,
          ...formData,
          createdAt: createdAt,
          updatedAt: updatedAt,
          fields: formData.fields || [] // ensure fields is an array
        } as FormSchema;
        setForm(currentForm);
      } else {
        toast({ title: "Error", description: "Form not found.", variant: "destructive" });
        setForm(null);
        currentForm = null;
      }
      // Responses might have loaded first, recalculate if form loads later
      if(responses.length > 0 && currentForm) {
        calculateRatingDistribution(responses, currentForm);
        prepareCsvData(currentForm, responses);
      }
       // Set loading to false only if responses are also loaded or if form is not found
      if (!responses.length && !docSnap.exists()) {
        setIsLoading(false);
      }
    }, (error) => {
      console.error("Error fetching form details:", error);
      toast({ title: "Error", description: "Could not fetch form details.", variant: "destructive" });
      setForm(null);
      currentForm = null;
      setIsLoading(false);
    });

    // Fetch responses for this form
    const responsesQuery = query(collection(db, "responses"), where("formId", "==", formId));
    const unsubscribeResponses = onSnapshot(responsesQuery, (querySnapshot) => {
      const fetchedResponses: FormResponse[] = [];
      querySnapshot.forEach((docSnap) => {
        const responseData = docSnap.data() as Omit<FormResponse, 'id' | 'timestamp'>;
        const timestamp = responseData.timestamp && typeof responseData.timestamp === 'object' && 'toDate' in responseData.timestamp ? (responseData.timestamp as any).toDate().toISOString() : responseData.timestamp as string;
        fetchedResponses.push({ 
            id: docSnap.id, 
            ...responseData,
            timestamp: timestamp,
        } as FormResponse);
      });
      setResponses(fetchedResponses);
      
      if (currentForm) { // form might have loaded already
        calculateRatingDistribution(fetchedResponses, currentForm);
        prepareCsvData(currentForm, fetchedResponses);
      }
      setIsLoading(false);

    }, (error) => {
      console.error("Error fetching responses:", error);
      toast({ title: "Error", description: "Could not fetch responses.", variant: "destructive" });
      setIsLoading(false);
    });

    return () => {
      unsubscribeForm();
      unsubscribeResponses();
    };
  }, [formId, toast, calculateRatingDistribution, prepareCsvData]); // formId is now from useParams


  const handleSummarizeFeedback = async () => {
    if (!responses.length) {
      toast({ title: "No Responses", description: "There are no feedback responses to summarize.", variant: "destructive" });
      return;
    }
    setIsSummarizing(true);
    try {
      // Identify text-based fields for summary
      const textFields = form?.fields.filter(f => f.type === 'textarea' || f.type === 'text').map(f => f.id) || [];
      const feedbackTexts = responses
        .map(r => textFields.map(fieldId => r.answers[fieldId]).filter(ans => typeof ans === 'string' && ans.trim() !== '').join(' '))
        .filter(text => text.trim() !== '') as string[];

      if (feedbackTexts.length === 0) {
        toast({ title: "No Text Feedback", description: "No textual feedback found to summarize.", variant: "default" });
        setSummary("No textual feedback provided by users.");
        setIsSummarizing(false);
        return;
      }

      const input: SummarizeFeedbackInput = { feedbackResponses: feedbackTexts };
      const result = await summarizeFeedback(input);
      setSummary(result.summary);
      toast({ title: "Success", description: "Feedback summarized by AI." });
    } catch (error) {
      console.error("AI Summary Error:", error);
      toast({ title: "Error", description: "Failed to summarize feedback.", variant: "destructive" });
    }
    setIsSummarizing(false);
  };

  const handleExportPDF = () => {
    const chartsElement = document.getElementById('charts-section-to-export');
    if (chartsElement) {
      toast({ title: "Generating PDF...", description: "Please wait while the PDF is being prepared." });
      html2canvas(chartsElement, { scale: 2 }).then(canvas => {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;
        const ratio = canvasWidth / canvasHeight;
        let newCanvasWidth = pdfWidth - 20; // Add some margin
        let newCanvasHeight = newCanvasWidth / ratio;

        if (newCanvasHeight > pdfHeight - 20) {
            newCanvasHeight = pdfHeight - 20;
            newCanvasWidth = newCanvasHeight * ratio;
        }
        const xOffset = (pdfWidth - newCanvasWidth) / 2;
        const yOffset = 10; // Margin from top

        pdf.text(form?.title || "Form Results", pdfWidth / 2, yOffset, { align: 'center' });
        pdf.addImage(imgData, 'PNG', xOffset, yOffset + 10, newCanvasWidth, newCanvasHeight);
        pdf.save(`${form?.title?.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'form'}-results-charts.pdf`);
        toast({ title: "PDF Exported!", description: "Charts have been exported to PDF." });
      }).catch(err => {
        toast({ title: "PDF Export Error", description: "Could not export charts to PDF.", variant: "destructive" });
        console.error("PDF Export Error:", err);
      });
    } else {
      toast({ title: "Export Error", description: "Could not find charts section to export.", variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-8 items-center justify-center h-full">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading form results...</p>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <Card className="w-full max-w-md text-center p-8">
          <CardTitle className="text-2xl">Form Not Found</CardTitle>
          <CardDescription>The requested form could not be loaded or does not exist.</CardDescription>
          <Button asChild className="mt-4">
            <a href="/forms">Go to Forms</a>
          </Button>
        </Card>
      </div>
    );
  }

  const totalResponses = responses.length;
  const ratingQuestion = form.fields.find(f => f.type === 'rating' && f.text.toLowerCase().includes('satisfaction'));
  const recommendationQuestion = form.fields.find(f => f.type === 'rating' && f.text.toLowerCase().includes('recommend'));

  const averageSatisfaction = ratingQuestion && totalResponses > 0 ? responses.reduce((acc, r) => acc + (Number(r.answers[ratingQuestion.id]) || 0), 0) / totalResponses : 0;
  const averageRecommendation = recommendationQuestion && totalResponses > 0 ? responses.reduce((acc, r) => acc + (Number(r.answers[recommendationQuestion.id]) || 0), 0) / totalResponses : 0;


  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{form.title} - Results</h1>
          <p className="text-muted-foreground">{form.description || "Detailed analytics and responses for your form."}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {csvData.length > 0 && csvData[0].data.length > 0 ? (
            <CSVLink
                data={csvData[0].data}
                headers={csvData[0].headers}
                filename={`${form.title?.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'form'}-responses.csv`}
                className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
                target="_blank"
            >
              <Download className="mr-2 h-4 w-4" /> Export CSV
            </CSVLink>
          ) : (
            <Button variant="outline" disabled><Download className="mr-2 h-4 w-4" /> Export CSV (No Data)</Button>
          )}
          <Button onClick={handleExportPDF} variant="outline"><ImageIconLucide className="mr-2 h-4 w-4" /> Export Charts PDF</Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Responses</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalResponses}</div>
            <p className="text-xs text-muted-foreground">collected so far</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Satisfaction</CardTitle>
            <Smile className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averageSatisfaction.toFixed(1)} / {ratingQuestion?.maxRating || 5}</div>
             <Progress value={ratingQuestion?.maxRating ? (averageSatisfaction / ratingQuestion.maxRating) * 100 : 0} className="h-2 mt-1" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Recommendation</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averageRecommendation.toFixed(1)} / {recommendationQuestion?.maxRating || 10}</div>
            <Progress value={recommendationQuestion?.maxRating ? (averageRecommendation / recommendationQuestion.maxRating) * 100 : 0} className="h-2 mt-1" />
          </CardContent>
        </Card>
         <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">N/A%</div> {/* Placeholder */}
            <p className="text-xs text-muted-foreground">of viewed forms completed</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="summary" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="summary">Summary & AI Insights</TabsTrigger>
          <TabsTrigger value="responses">Individual Responses</TabsTrigger>
          <TabsTrigger value="charts">Charts & Visualizations</TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>AI Feedback Summary</CardTitle>
              <CardDescription>Key themes and sentiments identified by AI from textual feedback.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isSummarizing && <div className="flex items-center space-x-2 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /> <p>Generating summary...</p></div>}
              {!isSummarizing && summary && (
                <div className="prose dark:prose-invert max-w-none p-4 bg-muted/50 rounded-md whitespace-pre-wrap">
                  {summary}
                </div>
              )}
               {!isSummarizing && !summary && (
                <p className="text-muted-foreground">Click the button to generate an AI summary of the feedback.</p>
              )}
            </CardContent>
            <CardFooter>
              <Button onClick={handleSummarizeFeedback} disabled={isSummarizing || responses.length === 0}>
                {isSummarizing ? "Summarizing..." : "Generate AI Summary"}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="responses" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Individual Responses ({responses.length})</CardTitle>
              <CardDescription>Browse through each submitted response.</CardDescription>
            </CardHeader>
            <CardContent>
              {responses.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">Response ID</TableHead>
                      {form && form.fields.map(field => (
                        <TableHead key={field.id}>{field.text}</TableHead>
                      ))}
                      <TableHead className="text-right w-[150px]">Submitted At</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {responses.map((response) => (
                      <TableRow key={response.id}>
                        <TableCell className="font-medium text-xs">{response.id.substring(0,8)}...</TableCell>
                        {form && form.fields.map(field => (
                          <TableCell key={field.id}>
                            {Array.isArray(response.answers[field.id]) 
                              ? (response.answers[field.id] as string[]).join(', ')
                              : String(response.answers[field.id] ?? 'N/A')}
                          </TableCell>
                        ))}
                        <TableCell className="text-right text-xs">{new Date(response.timestamp).toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-muted-foreground text-center py-10">No responses submitted yet for this form.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="charts" className="mt-6" id="charts-section-to-export">
            <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
              <Card>
                  <CardHeader>
                      <CardTitle>Overall Satisfaction Distribution</CardTitle>
                       <CardDescription>
                        {ratingQuestion ? `Based on question: "${ratingQuestion.text}"` : "Rating question for satisfaction not found."}
                       </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {ratingDistribution.length > 0 ? (
                      <ChartContainer config={ratingChartConfig} className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <RechartsBarChart data={ratingDistribution} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="rating" tickLine={false} axisLine={false} />
                            <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                            <RechartsTooltip content={<ChartTooltipContent />} />
                            <Bar dataKey="count" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                          </RechartsBarChart>
                        </ResponsiveContainer>
                      </ChartContainer>
                    ) : <p className="text-muted-foreground text-center py-10">Not enough data or rating question not configured for this chart.</p>}
                  </CardContent>
              </Card>
              <Card>
                  <CardHeader>
                      <CardTitle>Sentiment Analysis (Placeholder)</CardTitle>
                      <CardDescription>This is a mock chart. Implement AI sentiment analysis per response for real data.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ChartContainer config={{}} className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                          <RechartsPieChart>
                              <RechartsTooltip content={<ChartTooltipContent nameKey="name" />} />
                              <Pie data={sentimentData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label >
                                  {sentimentData.map((entry, index) => (
                                      <Cell key={`cell-${index}`} fill={entry.fill} />
                                  ))}
                              </Pie>
                              <RechartsLegend content={<ChartLegendContent />} />
                          </RechartsPieChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </CardContent>
              </Card>
            </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

