
"use client";

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquare, Smile, Users, Download, Filter, CheckCircle, Percent, FileText, Image as ImageIcon } from "lucide-react";
import { summarizeFeedback, SummarizeFeedbackInput } from '@/ai/flows/summarize-feedback';
import { useToast } from "@/hooks/use-toast";
import type { FormSchema, FormResponse } from "@/types";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart"
import { Bar, Pie, Cell, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend as RechartsLegend, BarChart, PieChart } from 'recharts';
import { Progress } from '@/components/ui/progress';
import { CSVLink } from 'react-csv';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';


// Mock Data (replace with actual data fetching)
const mockForm: FormSchema = {
  id: "form_123",
  title: "Customer Satisfaction Survey Q3",
  description: "Feedback on our services during the third quarter.",
  fields: [
    { surveyId: "form_123", id: "q1", label: "Overall satisfaction with our service?", type: "rating", required: true },
    { surveyId: "form_123", id: "q2", label: "How likely are you to recommend us?", type: "rating", required: true }, // Assuming NPS or similar scaled rating
    { surveyId: "form_123", id: "q3", label: "What did you like most?", type: "textarea" },
    { surveyId: "form_123", id: "q4", label: "How can we improve?", type: "textarea" },
  ],
  createdBy: "user_abc",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  isAnonymous: false,
  aiMode: "assisted_creation"
};

const mockResponses: FormResponse[] = [
  { id: "resp1", formId: "form_123", timestamp: new Date().toISOString(), answers: { q1: 5, q2: 9, q3: "Great support!", q4: "Faster loading times." } },
  { id: "resp2", formId: "form_123", timestamp: new Date().toISOString(), answers: { q1: 4, q2: 7, q3: "Easy to use.", q4: "More features." } },
  { id: "resp3", formId: "form_123", timestamp: new Date().toISOString(), answers: { q1: 3, q2: 5, q3: "The pricing is fair.", q4: "Customer service response time was slow." } },
  { id: "resp4", formId: "form_123", timestamp: new Date().toISOString(), answers: { q1: 5, q2: 10, q3: "Everything was perfect!", q4: "Nothing, it's great!" } },
  { id: "resp5", formId: "form_123", timestamp: new Date().toISOString(), answers: { q1: 2, q2: 3, q3: "The UI is a bit clunky.", q4: "Better onboarding." } },
];

const ratingChartConfig = {
  satisfaction: { label: "Satisfaction", color: "hsl(var(--chart-1))" },
  recommendation: { label: "Recommendation", color: "hsl(var(--chart-2))" },
} satisfies Record<string, any>;

const sentimentData = [
  { name: 'Positive', value: 60, fill: 'hsl(var(--chart-4))' }, // Using chart-4 for positive
  { name: 'Neutral', value: 25, fill: 'hsl(var(--chart-2))' }, // Using chart-2 for neutral
  { name: 'Negative', value: 15, fill: 'hsl(var(--chart-5))' }, // Using chart-5 for negative (or destructive if more fitting)
];


export default function FormResultsPage({ params }: { params: { formId: string } }) {
  const { formId } = params;
  const { toast } = useToast();
  const [form, setForm] = useState<FormSchema | null>(null);
  const [responses, setResponses] = useState<FormResponse[]>([]);
  const [summary, setSummary] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [ratingDistribution, setRatingDistribution] = useState<any[]>([]);
  const [csvData, setCsvData] = useState<any[]>([]);


  useEffect(() => {
    setForm(mockForm);
    setResponses(mockResponses);

    const satisfactionCounts: Record<number, number> = {};
    mockResponses.forEach(r => {
      const rating = r.answers.q1 as number;
      satisfactionCounts[rating] = (satisfactionCounts[rating] || 0) + 1;
    });
    const distData = Object.entries(satisfactionCounts).map(([rating, count]) => ({
      rating: `⭐ ${rating}`,
      count,
    })).sort((a,b) => parseInt(a.rating.split(" ")[1]) - parseInt(b.rating.split(" ")[1]));
    setRatingDistribution(distData);

    // Prepare CSV data
    if (mockForm && mockResponses.length > 0) {
      const headers = mockForm.fields.map(field => ({ label: field.label, key: field.id }));
      headers.unshift({ label: "Response ID", key: "id" });
      headers.push({ label: "Submitted At", key: "timestamp" });

      const dataForCsv = mockResponses.map(res => {
        const row: any = { id: res.id.substring(0,8), timestamp: new Date(res.timestamp).toLocaleString() };
        mockForm.fields.forEach(field => {
          row[field.id] = res.answers[field.id] ?? 'N/A';
        });
        return row;
      });
      setCsvData([{headers, data: dataForCsv}]); // CSVLink expects array of {headers, data}
    }

  }, [formId]);

  const handleSummarizeFeedback = async () => {
    if (!responses.length) {
      toast({ title: "No Responses", description: "There are no feedback responses to summarize.", variant: "destructive" });
      return;
    }
    setIsSummarizing(true);
    try {
      const feedbackTexts = responses
        .map(r => [r.answers.q3, r.answers.q4])
        .flat()
        .filter(text => typeof text === 'string' && text.trim() !== '') as string[];
      
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
        let newCanvasWidth = pdfWidth;
        let newCanvasHeight = newCanvasWidth / ratio;
        if (newCanvasHeight > pdfHeight) {
            newCanvasHeight = pdfHeight;
            newCanvasWidth = newCanvasHeight * ratio;
        }
        const xOffset = (pdfWidth - newCanvasWidth) / 2;
        const yOffset = (pdfHeight - newCanvasHeight) / 2;

        pdf.addImage(imgData, 'PNG', xOffset, yOffset, newCanvasWidth, newCanvasHeight);
        pdf.save(`${form?.title || 'form'}-results-charts.pdf`);
        toast({ title: "PDF Exported!", description: "Charts have been exported to PDF." });
      }).catch(err => {
        toast({ title: "PDF Export Error", description: "Could not export charts to PDF.", variant: "destructive" });
        console.error("PDF Export Error:", err);
      });
    } else {
      toast({ title: "Export Error", description: "Could not find charts section to export.", variant: "destructive" });
    }
  };


  if (!form) {
    return <div className="flex items-center justify-center h-full"><p>Loading form data...</p></div>;
  }
  
  const totalResponses = responses.length;
  const averageSatisfaction = responses.reduce((acc, r) => acc + (r.answers.q1 as number), 0) / totalResponses || 0;
  const averageRecommendation = responses.reduce((acc, r) => acc + (r.answers.q2 as number), 0) / totalResponses || 0;


  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{form.title} - Results</h1>
          <p className="text-muted-foreground">{form.description || "Detailed analytics and responses for your form."}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline"><Filter className="mr-2 h-4 w-4" /> Filter</Button>
          {csvData.length > 0 && csvData[0].data.length > 0 && (
            <CSVLink data={csvData[0].data} headers={csvData[0].headers} filename={`${form.title || 'form'}-responses.csv`} className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2">
              <FileText className="mr-2 h-4 w-4" /> Export CSV
            </CSVLink>
          )}
          <Button onClick={handleExportPDF}><ImageIcon className="mr-2 h-4 w-4" /> Export Charts PDF</Button>
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
            <CardTitle className="text-sm font-medium">Avg. Satisfaction (Q1)</CardTitle>
            <Smile className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averageSatisfaction.toFixed(1)} / 5</div>
             <Progress value={(averageSatisfaction / 5) * 100} className="h-2 mt-1" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Recommendation (Q2)</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averageRecommendation.toFixed(1)} / 10</div>
            <Progress value={(averageRecommendation / 10) * 100} className="h-2 mt-1" />
          </CardContent>
        </Card>
         <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle> {/* Placeholder */}
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">85%</div> {/* Placeholder value */}
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
              {summary ? (
                <div className="prose dark:prose-invert max-w-none p-4 bg-muted/50 rounded-md">
                  <p>{summary}</p>
                </div>
              ) : (
                <p className="text-muted-foreground">Click the button to generate an AI summary of the feedback.</p>
              )}
            </CardContent>
            <CardFooter>
              <Button onClick={handleSummarizeFeedback} disabled={isSummarizing}>
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
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Response ID</TableHead>
                    {form.fields.map(field => (
                      <TableHead key={field.id}>{field.label}</TableHead>
                    ))}
                    <TableHead>Submitted At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {responses.map((response) => (
                    <TableRow key={response.id}>
                      <TableCell className="font-medium text-xs">{response.id.substring(0,8)}...</TableCell>
                      {form.fields.map(field => (
                        <TableCell key={field.id}>
                          {String(response.answers[field.id] ?? 'N/A')}
                        </TableCell>
                      ))}
                      <TableCell>{new Date(response.timestamp).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="charts" className="mt-6" id="charts-section-to-export">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                  <CardHeader>
                      <CardTitle>Overall Satisfaction Distribution (Q1)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {ratingDistribution.length > 0 ? (
                      <ChartContainer config={ratingChartConfig} className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={ratingDistribution} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="rating" tickLine={false} axisLine={false} />
                            <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                            <RechartsTooltip content={<ChartTooltipContent />} />
                            <Bar dataKey="count" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </ChartContainer>
                    ) : <p className="text-muted-foreground text-center py-10">Not enough data for this chart.</p>}
                  </CardContent>
              </Card>
              <Card>
                  <CardHeader>
                      <CardTitle>Sentiment Analysis (Mock)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ChartContainer config={{}} className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                              <RechartsTooltip content={<ChartTooltipContent nameKey="name" />} />
                              <Pie data={sentimentData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label >
                                  {sentimentData.map((entry, index) => (
                                      <Cell key={`cell-${index}`} fill={entry.fill} />
                                  ))}
                              </Pie>
                              <RechartsLegend content={<ChartLegendContent />} />
                          </PieChart>
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
